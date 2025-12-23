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
        // Check if label exists on card to avoid duplicates
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
         const payload = automation.payload as { targetColumnId: string; targetBoardId?: string }
         
         // Fetch last position
         const lastCard = await prisma.card.findFirst({
            where: { columnId: payload.targetColumnId },
            orderBy: { position: 'desc' }
         })
         const newPos = (lastCard?.position || 0) + 65536
         
         await prisma.card.update({
             where: { id: cardId },
             data: {
                 columnId: payload.targetColumnId,
                 boardId: payload.targetBoardId, // Optional update if cross-board
                 position: newPos
             }
         })
         
         // Recursive check for the NEW column
         await checkAndExecuteAutomations(cardId, payload.targetColumnId, depth + 1)
         
         // If we moved, we should stop processing other automations for the OLD column?
         // Usually yes, because the card is gone.
         break; 

      } else if (automation.type === 'COPY_TO_COLUMN') {
          const payload = automation.payload as { targetColumnId: string; targetBoardId?: string }
          
          // Get original card
          const originalCard = await prisma.card.findUnique({
              where: { id: cardId },
              include: { labels: true } 
          })
          
          if (!originalCard) continue

          // Fetch last position in target
          const lastCard = await prisma.card.findFirst({
            where: { columnId: payload.targetColumnId },
            orderBy: { position: 'desc' }
          })
          const newPos = (lastCard?.position || 0) + 65536

          // Create copy
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
          
          // Copy labels
          if (originalCard.labels.length > 0) {
             await prisma.cardLabel.createMany({
                 data: originalCard.labels.map(l => ({ cardId: newCard.id, labelId: l.labelId }))
             })
          }

          // Trigger automation for the NEW card in the NEW column
          await checkAndExecuteAutomations(newCard.id, payload.targetColumnId, depth + 1)
      }
    } catch (error) {
       console.error('Error executing automation', error)
    }
  }
}
