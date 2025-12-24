import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { checkAndExecuteAutomations } from '@/lib/automation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { cardId } = await params
    const body = await request.json()
    const { targetColumnId, position, title } = body

    // Validate position
    if (position !== 'first' && position !== 'last') {
      return NextResponse.json({ error: 'Posição inválida. Use "first" ou "last".' }, { status: 400 })
    }

    // 1. Fetch template card with all relations
    const templateCard = await (prisma.card as any).findUnique({
      where: { id: cardId },
      include: {
        labels: true,
        checklists: {
          include: {
            items: true,
          }
        },
      }
    })

    if (!templateCard) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    // Verify it's actually a template
    if (!templateCard.isTemplate) {
      return NextResponse.json({ error: 'Este cartão não é um template' }, { status: 400 })
    }

    // Get target column to verify it exists and get board info
    const targetColumn = await prisma.column.findUnique({
      where: { id: targetColumnId },
      include: { board: true }
    })

    if (!targetColumn) {
      return NextResponse.json({ error: 'Coluna de destino não encontrada' }, { status: 404 })
    }

    // 2. Check destination permissions
    try {
      await requireBoardPermission(targetColumn.boardId, session.user.id, 'create_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    // 3. Calculate position
    const existingCards = await prisma.card.findMany({
      where: { columnId: targetColumnId, archivedAt: null },
      orderBy: { position: 'asc' },
      select: { position: true }
    })

    let newPosition: number
    if (existingCards.length === 0) {
      newPosition = 65536
    } else if (position === 'first') {
      newPosition = existingCards[0].position / 2
    } else {
      // last
      newPosition = existingCards[existingCards.length - 1].position + 65536
    }

    // 4. Create card from template in transaction
    const newCard = await prisma.$transaction(async (tx) => {
      const createdCard = await (tx.card as any).create({
        data: {
          title: title || templateCard.title,
          description: templateCard.description,
          dueAt: templateCard.dueAt,
          isCompleted: false, // Always start uncompleted
          isTemplate: false, // New card is NOT a template
          templateSourceCardId: templateCard.id,
          position: newPosition,
          boardId: targetColumn.boardId,
          columnId: targetColumnId,
          createdById: session.user.id,
          // Cover
          coverType: templateCard.coverType,
          coverColor: templateCard.coverColor,
          coverImageUrl: templateCard.coverImageUrl,
          coverSize: templateCard.coverSize,
          // Labels
          labels: {
            create: templateCard.labels.map((l: any) => ({
              labelId: l.labelId
            }))
          },
          // Checklists
          checklists: {
            create: templateCard.checklists.map((cl: any) => ({
              title: cl.title,
              position: cl.position,
              items: {
                create: cl.items.map((item: any) => ({
                  text: item.text,
                  isCompleted: false, // Reset checklist items
                  position: item.position,
                  dueAt: item.dueAt
                }))
              }
            }))
          }
        }
      })

      // Register Activity
      await tx.cardActivity.create({
        data: {
          cardId: createdCard.id,
          actorId: session.user.id,
          type: 'CARD_CREATED_FROM_TEMPLATE' as any,
          payload: { 
            templateId: templateCard.id,
            templateTitle: templateCard.title
          }
        }
      })

      return createdCard
    })

    // Execute automations (awaited for real-time consistency)
    try {
      await checkAndExecuteAutomations(newCard.id, targetColumnId)
    } catch (err) {
      console.error('Error executing automation on create from template:', err)
    }

    return NextResponse.json(newCard, { status: 201 })
  } catch (error) {
    console.error('Create from template error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
