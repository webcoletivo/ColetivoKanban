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
    const { boardId, columnId, position } = body

    // 1. Fetch original card with all relations
    const originalCard = await prisma.card.findUnique({
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

    if (!originalCard) {
      return NextResponse.json({ error: 'Card original não encontrado' }, { status: 404 })
    }

    // 2. Check destination permissions
    try {
      await requireBoardPermission(boardId, session.user.id, 'create_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    // 3. Create duplicate in transaction
    const newCard = await prisma.$transaction(async (tx) => {
      const createdCard = await tx.card.create({
        data: {
          title: originalCard.title,
          description: originalCard.description,
          dueAt: originalCard.dueAt,
          isCompleted: originalCard.isCompleted,
          position: position || (originalCard.position + 1000), // Fallback or computed position
          boardId: boardId,
          columnId: columnId,
          createdById: session.user.id,
          // Labels
          labels: {
            create: originalCard.labels.map(l => ({
              labelId: l.labelId
            }))
          },
          // Checklists
          checklists: {
            create: originalCard.checklists.map(cl => ({
              title: cl.title,
              position: cl.position,
              items: {
                create: cl.items.map(item => ({
                  text: item.text,
                  isCompleted: item.isCompleted,
                  position: item.position,
                  dueAt: item.dueAt
                }))
              }
            }))
          }
        }
      })

      // Registry Activity
      await tx.cardActivity.create({
        data: {
          cardId: createdCard.id,
          actorId: session.user.id,
          type: 'CARD_CREATED' as any,
          payload: { copiedFromId: originalCard.id }
        }
      })

      return createdCard
    })

    // Execute automations (awaited for real-time consistency)
    try {
      await checkAndExecuteAutomations(newCard.id, columnId)
    } catch (err) {
      console.error('Error executing automation on copy:', err)
    }

    return NextResponse.json(newCard, { status: 201 })
  } catch (error) {
    console.error('Copy card error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
