import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkBoardPermission } from '@/lib/permissions'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { columnId } = await params

    // Fetch source column
    const sourceColumn = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        cards: {
          orderBy: { position: 'asc' },
          include: {
            labels: true,
            checklists: {
              include: { items: true }
            }
          }
        }
      }
    })

    if (!sourceColumn) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 })
    }

    // Check permission on the board
    const hasPermission = await checkBoardPermission(
      sourceColumn.boardId,
      session.user.id,
      'create_column' // Assuming create_column permission for copying
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Determine new position: insert after current column
    // To do this reliably with floats, we can find the next column and take average,
    // or just add a small epsilon if we trust the float precision. 
    // Or we can shift subsequent columns. For simplicity and robustness with Trello-like feel, 
    // let's try to find a gap. If we have to, we shift.
    
    // Find column immediately after
    const nextColumn = await prisma.column.findFirst({
      where: {
        boardId: sourceColumn.boardId,
        position: { gt: sourceColumn.position }
      },
      orderBy: { position: 'asc' }
    })

    let newPosition: number
    if (nextColumn) {
      newPosition = (sourceColumn.position + nextColumn.position) / 2
    } else {
      newPosition = sourceColumn.position + 1000 // Arbitrary gap
    }

    // Perform copy in transaction
    const newColumn = await prisma.$transaction(async (tx) => {
      // 1. Create new column
      const createdColumn = await tx.column.create({
        data: {
          title: `${sourceColumn.title} (Cópia)`,
          boardId: sourceColumn.boardId,
          position: newPosition,
        }
      })

      // 2. Copy cards
      for (const card of sourceColumn.cards) {
         const newCard = await tx.card.create({
           data: {
             title: card.title,
             description: card.description,
             position: card.position,
             columnId: createdColumn.id,
             boardId: sourceColumn.boardId,
             createdById: session.user.id,
             // Copy fields
             dueAt: card.dueAt,
             isCompleted: card.isCompleted,
             coverType: card.coverType,
             coverColor: card.coverColor,
             coverImageUrl: card.coverImageUrl,
             coverSize: card.coverSize,
             coverImageKey: card.coverImageKey, // Note: sharing same S3 key might be issue if deleting one deletes file. 
             // Ideally we copy the file too, but for now sharing ref is standard for "Copy".
             // If file deletion is reference-counted, we are good. If not, deleting one card might break the other's image.
             // Given the requirements, we'll keep the reference.
           }
         })

         // Copy labels relation
         if (card.labels.length > 0) {
            await tx.cardLabel.createMany({
              data: card.labels.map(l => ({
                cardId: newCard.id,
                labelId: l.labelId
              }))
            })
         }

         // Copy checklists
         for (const checklist of card.checklists) {
            const newChecklist = await tx.checklist.create({
              data: {
                title: checklist.title,
                position: checklist.position,
                cardId: newCard.id
              }
            })

            if (checklist.items.length > 0) {
              await tx.checklistItem.createMany({
                data: checklist.items.map(item => ({
                  checklistId: newChecklist.id,
                  text: item.text,
                  isCompleted: item.isCompleted,
                  position: item.position,
                  dueAt: item.dueAt
                }))
              })
            }
         }
      }

      return createdColumn
    })

    return NextResponse.json(newColumn)

  } catch (error) {
    console.error('Error copying column:', error)
    return NextResponse.json({ error: 'Erro interno ao copiar coluna' }, { status: 500 })
  }
}
