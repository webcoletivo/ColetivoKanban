import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCardSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { generatePosition } from '@/lib/utils'
import { checkAndExecuteAutomations } from '@/lib/automation'

// POST /api/columns/[columnId]/cards - Create a new card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { columnId } = await params

    // Get column to find board
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    })

    if (!column) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 })
    }

    // Check permission
    try {
      await requireBoardPermission(column.boardId, session.user.id, 'create_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = createCardSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Get the last card position in this column
    const lastCard = await prisma.card.findFirst({
      where: { columnId, archivedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const position = generatePosition(lastCard?.position)

    const card = await prisma.$transaction(async (tx) => {
      const newCard = await tx.card.create({
        data: {
          title: result.data.title,
          position,
          columnId,
          boardId: column.boardId,
          createdById: session.user.id,
        },
      })

      // Create activity
      await tx.cardActivity.create({
        data: {
          cardId: newCard.id,
          actorId: session.user.id,
          type: 'CARD_CREATED',
          payload: { title: newCard.title },
        },
      })

      return newCard
    })

    // Execute automations (awaited for real-time consistency)
    try {
        await checkAndExecuteAutomations(card.id, columnId)
    } catch (err) {
        console.error('Error executing automation on create:', err)
    }

    return NextResponse.json({
      id: card.id,
      title: card.title,
      description: card.description,
      dueAt: card.dueAt,
      isCompleted: card.isCompleted,
      position: card.position,
      labels: [],
      checklistProgress: { total: 0, completed: 0 },
      commentCount: 0,
      attachmentCount: 0,
    }, { status: 201 })
  } catch (error) {
    console.error('Create card error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
