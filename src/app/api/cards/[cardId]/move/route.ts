import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { moveCardSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { checkAndExecuteAutomations } from '@/lib/automation'

// POST /api/cards/[cardId]/move - Move card to another column
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

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { select: { id: true, title: true } } },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    }

    // Check permission
    try {
      await requireBoardPermission(card.boardId, session.user.id, 'move_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = moveCardSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { columnId, position, boardId } = result.data

    // Get target column info
    const targetColumn = await prisma.column.findUnique({
      where: { id: columnId },
      select: { id: true, title: true, boardId: true },
    })

    if (!targetColumn) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 })
    }

    // Determine target board ID (if not provided, assume same board)
    const targetBoardId = boardId || card.boardId

    // Check consistency: column must belong to the target board
    if (targetColumn.boardId !== targetBoardId) {
       return NextResponse.json({ error: 'Coluna não pertence ao board de destino' }, { status: 400 })
    }

    // If moving to a DIFFERENT board, check permissions there too
    if (targetBoardId !== card.boardId) {
       try {
         await requireBoardPermission(targetBoardId, session.user.id, 'move_card')
       } catch (error) {
          if (error instanceof PermissionError) {
             return NextResponse.json({ error: 'Sem permissão no quadro de destino' }, { status: 403 })
          }
          throw error
       }
    }

    const movedToNewColumn = card.columnId !== columnId

    await prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: cardId },
        data: { 
          columnId, 
          position,
          boardId: targetBoardId 
        },
      })

      // Only create activity if moved to a different column
      if (movedToNewColumn) {
        await tx.cardActivity.create({
          data: {
            cardId,
            actorId: session.user.id,
            type: 'CARD_MOVED',
            payload: {
              fromColumn: { id: card.column.id, title: card.column.title },
              toColumn: { id: targetColumn.id, title: targetColumn.title },
            },
          },
        })
      }
    })

    // Execute automations (awaited for real-time consistency)
    if (movedToNewColumn) {
       try {
         await checkAndExecuteAutomations(cardId, columnId)
       } catch (err) {
         console.error('Error executing automation on move:', err)
       }
    }

    return NextResponse.json({
      id: cardId,
      columnId,
      position,
    })
  } catch (error) {
    console.error('Move card error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
