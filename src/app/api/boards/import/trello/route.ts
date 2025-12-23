import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Minimum Trello JSON Schema for validation - Relaxed for large files
const TrelloImportSchema = z.object({
  name: z.string().nullish().transform(val => val || 'Quadro Importado'),
  lists: z.array(z.object({
    id: z.string().nullish(),
    name: z.string().nullish(),
    closed: z.boolean().optional().default(false),
    pos: z.number().optional().default(0),
  })).optional().default([]),
  cards: z.array(z.object({
    id: z.string().nullish(),
    idList: z.string().nullish(),
    name: z.string().nullish(),
    desc: z.string().optional().nullish(),
    closed: z.boolean().optional().default(false),
    pos: z.number().optional().default(0),
    due: z.string().nullish(),
    labels: z.array(z.object({
      id: z.string().optional().nullish(),
      name: z.string().optional().nullish(),
      color: z.string().optional().nullish(),
    })).optional().default([]),
    checklists: z.array(z.object({
      id: z.string().optional().nullish(),
      name: z.string().optional().nullish(),
      pos: z.number().optional().default(0),
      checkItems: z.array(z.object({
        id: z.string().optional().nullish(),
        name: z.string().optional().nullish(),
        pos: z.number().optional().default(0),
        state: z.string().optional().default('incomplete'),
      })).optional().default([]),
    })).optional().default([]),
  })).optional().default([]),
  labels: z.array(z.object({
    id: z.string().optional().nullish(),
    name: z.string().optional().nullish(),
    color: z.string().optional().nullish(),
  })).optional().default([]),
})

export async function POST(request: Request) {
  let trelloData: any = null
  const startTime = Date.now()

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 1. Receive data via FormData (for large files)
    let fileContent: string = ''
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      
      if (!file) {
        return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
      }

      console.log(`[IMPORT] Received file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      fileContent = await file.text()
      
      if (!fileContent || fileContent.length < 10) {
        return NextResponse.json({ error: 'Arquivo está vazio ou foi truncado' }, { status: 400 })
      }
    } catch (err: any) {
      console.error('[IMPORT_UPLOAD_ERROR]', err)
      return NextResponse.json({ error: 'Erro no upload: arquivo pode ser muito grande ou a conexão caiu' }, { status: 400 })
    }

    // 2. Parse JSON
    try {
      trelloData = JSON.parse(fileContent)
    } catch (err: any) {
      console.error('[IMPORT_PARSE_ERROR]', err.message)
      return NextResponse.json({ error: 'JSON inválido (não foi possível ler o arquivo)' }, { status: 400 })
    }

    // 3. Validate minimal structure
    if (!trelloData || typeof trelloData !== 'object' || !trelloData.name) {
      return NextResponse.json({ error: 'Arquivo JSON válido, mas não é um export do Trello (nome ausente)' }, { status: 400 })
    }

    const result = TrelloImportSchema.safeParse(trelloData)
    if (!result.success) {
      console.error('[IMPORT_TRELLO_VALIDATION_ERROR]', result.error)
      const firstError = result.error.issues[0]?.message || 'Estrutura inválida'
      return NextResponse.json({ 
        error: `Formato do Trello não reconhecido: ${firstError}` 
      }, { status: 400 })
    }

    const { name, lists, cards, labels: boardLabels } = result.data

    // Filtering only open lists and cards for a clean import
    const openLists = lists.filter(l => !l.closed)
    const openCards = cards.filter(c => !c.closed)

    console.log(`[IMPORT] Processing board: "${name}" with ${openLists.length} lists and ${openCards.length} cards`)

    // Run everything in a transaction with high timeout
    const board = await prisma.$transaction(async (tx) => {
      // 1. Create Board
      const newBoard = await tx.board.create({
        data: {
          name: name,
          createdById: session.user.id!,
        }
      })

      // Add owner as Admin
      await tx.boardMember.create({
        data: {
          boardId: newBoard.id,
          userId: session.user.id!,
          role: 'ADMIN',
        }
      })

      // 2. Create Labels
      const labelMap = new Map<string, string>()
      if (boardLabels) {
        for (const label of boardLabels) {
          if (!label.id) continue
          const newLabel = await tx.label.create({
            data: {
              name: label.name || 'Sem nome',
              color: mapTrelloColor(label.color || 'blue'),
              boardId: newBoard.id,
            }
          })
          labelMap.set(label.id, newLabel.id)
        }
      }

      // 3. Create Columns
      const columnMap = new Map<string, string>()
      const sortedLists = [...openLists].sort((a, b) => (a.pos || 0) - (b.pos || 0))
      
      for (let i = 0; i < sortedLists.length; i++) {
        const list = sortedLists[i]
        const newColumn = await tx.column.create({
          data: {
            title: list.name ?? 'Lista sem nome',
            position: i + 1,
            boardId: newBoard.id,
          }
        })
        if (list.id) columnMap.set(list.id, newColumn.id)
      }

      // 4. Create Cards
      const sortedCards = [...openCards].sort((a, b) => (a.pos || 0) - (b.pos || 0))
      
      for (let i = 0; i < sortedCards.length; i++) {
        const card = sortedCards[i]
        if (!card.idList) continue
        const columnId = columnMap.get(card.idList)
        
        if (!columnId) continue

        const newCard = await tx.card.create({
          data: {
            title: card.name ?? 'Cartão sem nome',
            description: card.desc || '',
            position: i + 1,
            columnId: columnId,
            boardId: newBoard.id,
            createdById: session.user.id!,
            dueAt: card.due ? new Date(card.due) : null,
          }
        })

        // 4a. Connect Labels
        if (card.labels && card.labels.length > 0) {
          for (const label of card.labels) {
            if (!label.id) continue
            const newLabelId = labelMap.get(label.id)
            if (newLabelId) {
              await tx.cardLabel.create({
                data: {
                  cardId: newCard.id,
                  labelId: newLabelId,
                }
              })
            }
          }
        }

        // 4b. Create Checklists
        if (card.checklists && card.checklists.length > 0) {
          for (const cl of card.checklists) {
            const newChecklist = await tx.checklist.create({
              data: {
                title: cl.name ?? 'Checklist',
                cardId: newCard.id,
                position: cl.pos || 0,
              }
            })

            // 4c. Create Checklist Items
            if (cl.checkItems && cl.checkItems.length > 0) {
              for (const item of cl.checkItems) {
                await tx.checklistItem.create({
                  data: {
                    text: item.name ?? 'Tarefa',
                    checklistId: newChecklist.id,
                    position: item.pos || 0,
                    isCompleted: item.state === 'complete',
                  }
                })
              }
            }
          }
        }
        
        // 5. Create Activity record (only for the card to keep it lighter)
        await tx.cardActivity.create({
            data: {
                type: 'CARD_CREATED',
                payload: { content: `Importado do Trello` },
                cardId: newCard.id,
                actorId: session.user.id!,
            }
        })
      }

      return newBoard
    }, {
        timeout: 60000 // Increased timeout to 60s for large files
    })

    const duration = Date.now() - startTime
    console.log(`[IMPORT] Success! Board "${board.name}" created in ${duration}ms`)

    return NextResponse.json({ boardId: board.id })
  } catch (error: any) {
    console.error('[IMPORT_TRELLO_ERROR]', error)
    
    if (error.code === 'P2024') {
      return NextResponse.json({ error: 'Tempo limite do banco de dados excedido. O arquivo pode ser complexo demais para importar de uma vez.' }, { status: 504 })
    }

    return NextResponse.json(
      { error: 'Erro inesperado ao processar o quadro. Verifique os logs do servidor.' },
      { status: 500 }
    )
  }
}

// Helper to map Trello colors to hex if they aren't already
function mapTrelloColor(color: string): string {
  const colors: Record<string, string> = {
    'green': '#61bd4f',
    'yellow': '#f2d600',
    'orange': '#ff9f1a',
    'red': '#eb5a46',
    'purple': '#c377e0',
    'blue': '#0079bf',
    'sky': '#00c2e0',
    'lime': '#51e898',
    'pink': '#ff78cb',
    'black': '#344563',
  }
  return colors[color] || color || '#344563'
}
