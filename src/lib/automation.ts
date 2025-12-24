import { prisma } from './prisma'

export async function checkAndExecuteAutomations(
  cardId: string,
  targetColumnId: string,
  depth: number = 0
) {
  if (depth > 2) {
    console.warn('Automation recursion limit reached', { cardId, targetColumnId })
    return
  }

  // Fetch automations for this column
  const automations = await prisma.columnAutomation.findMany({
    where: { columnId: targetColumnId, enabled: true },
  })

  if (automations.length === 0) return

  // Execute each automation
  for (const automation of automations) {
    try {
      if (automation.type === 'ADD_LABEL') {
        const payload = automation.payload as { labelId: string }
        const exists = await prisma.cardLabel.findUnique({
          where: {
            cardId_labelId: {
              cardId,
              labelId: payload.labelId
            }
          }
        })
        if (!exists) {
          await prisma.cardLabel.create({
            data: { cardId, labelId: payload.labelId }
          })
        }
      } else if (automation.type === 'MOVE_TO_COLUMN') {
         const payload = automation.payload as { targetColumnId: string; targetBoardId?: string, destinationPosition?: 'first' | 'last' }
         
         let newPos = 65536
         if (payload.destinationPosition === 'first') {
            const firstCard = await prisma.card.findFirst({
                where: { columnId: payload.targetColumnId },
                orderBy: { position: 'asc' }
            })
            if (firstCard) {
                newPos = firstCard.position / 2
            }
         } else {
            const lastCard = await prisma.card.findFirst({
               where: { columnId: payload.targetColumnId },
               orderBy: { position: 'desc' }
            })
            if (lastCard) {
                newPos = lastCard.position + 65536
            }
         }
         
         await prisma.card.update({
             where: { id: cardId },
             data: {
                 columnId: payload.targetColumnId,
                 boardId: payload.targetBoardId,
                 position: newPos
             }
         })
         
         await checkAndExecuteAutomations(cardId, payload.targetColumnId, depth + 1)
         break; 

      } else if (automation.type === 'COPY_TO_COLUMN') {
          const payload = automation.payload as { targetColumnId: string; targetBoardId?: string, destinationPosition?: 'first' | 'last' }
          
          const originalCard = await prisma.card.findUnique({
              where: { id: cardId },
              include: { labels: true } 
          })
          
          if (!originalCard) continue

          let newPos = 65536
          if (payload.destinationPosition === 'first') {
              const firstCard = await prisma.card.findFirst({
                  where: { columnId: payload.targetColumnId },
                  orderBy: { position: 'asc' }
              })
              if (firstCard) {
                  newPos = firstCard.position / 2
              }
          } else {
              const lastCard = await prisma.card.findFirst({
                where: { columnId: payload.targetColumnId },
                orderBy: { position: 'desc' }
              })
              if (lastCard) {
                  newPos = lastCard.position + 65536
              }
          }

          const source = originalCard as any
          const newCard = await prisma.card.create({
             data: {
                 title: originalCard.title,
                 description: originalCard.description,
                 columnId: payload.targetColumnId,
                 boardId: payload.targetBoardId || originalCard.boardId,
                 createdById: originalCard.createdById,
                 position: newPos,
                 dueAt: originalCard.dueAt,
                 isCompleted: originalCard.isCompleted,
                 coverType: source.coverType,
                 coverColor: source.coverColor,
                 coverImageUrl: source.coverImageUrl,
                 coverSize: source.coverSize,
             }
          })
          
          if (originalCard.labels.length > 0) {
             await prisma.cardLabel.createMany({
                 data: originalCard.labels.map(l => ({ cardId: newCard.id, labelId: l.labelId }))
             })
          }

          await checkAndExecuteAutomations(newCard.id, payload.targetColumnId, depth + 1)
      }
    } catch (error) {
       console.error('Error executing automation', error)
    }
  }
}
