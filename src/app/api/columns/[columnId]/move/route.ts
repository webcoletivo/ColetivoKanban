import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkBoardPermission } from '@/lib/permissions'
import { z } from 'zod'

const moveColumnSchema = z.object({
  targetBoardId: z.string().uuid(),
  position: z.number().min(1),
})

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
    const body = await req.json()
    const validation = moveColumnSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { targetBoardId, position } = validation.data

    // Fetch source column
    const sourceColumn = await prisma.column.findUnique({
      where: { id: columnId },
    })

    if (!sourceColumn) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 })
    }

    // Check permissions
    // 1. Edit source board (to remove column)
    const hasSourcePermission = await checkBoardPermission(
      sourceColumn.boardId,
      session.user.id,
      'delete_column' // Equivalent to moving it out
    )
    
    // 2. Edit target board (to add column)
    const hasTargetPermission = await checkBoardPermission(
      targetBoardId,
      session.user.id,
      'create_column'
    )

    if (!hasSourcePermission || !hasTargetPermission) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Calculate new position using strict spacing if needed, but here we likely rely on 
    // the frontend sending a reasonable position index, and we map it to our float system.
    // However, the prompt says "Posição 1..M+1". This implies index-based.
    // We need to convert that index to a float position in the target board.
    
    const targetBoardColumns = await prisma.column.findMany({
      where: { boardId: targetBoardId },
      orderBy: { position: 'asc' },
      select: { id: true, position: true }
    })

    let newPositionValue: number
    const targetIndex = position - 1 // 0-indexed

    if (targetBoardColumns.length === 0) {
      newPositionValue = 65536
    } else if (targetIndex <= 0) {
        // Before first
        newPositionValue = targetBoardColumns[0].position / 2
    } else if (targetIndex >= targetBoardColumns.length) {
        // After last
        newPositionValue = targetBoardColumns[targetBoardColumns.length - 1].position + 65536
    } else {
        // Between two
        const prev = targetBoardColumns[targetIndex - 1]
        const next = targetBoardColumns[targetIndex]
        newPositionValue = (prev.position + next.position) / 2
    }

    // Execute Move
    await prisma.$transaction(async (tx) => {
        // 1. Update Column
        await tx.column.update({
            where: { id: columnId },
            data: {
                boardId: targetBoardId,
                position: newPositionValue
            }
        })

        // 2. Update all cards in this column to belong to the new board
        // This is CRITICAL because card.boardId is denormalized
        await tx.card.updateMany({
            where: { columnId: columnId },
            data: { boardId: targetBoardId }
        })
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error moving column:', error)
    return NextResponse.json({ error: 'Erro interno ao mover coluna' }, { status: 500 })
  }
}
