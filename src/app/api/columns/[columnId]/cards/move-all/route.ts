import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkBoardPermission } from '@/lib/permissions'
import { checkAndExecuteAutomations } from '@/lib/automation'
import { z } from 'zod'

const moveAllCardsSchema = z.object({
  targetColumnId: z.string().uuid(),
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
    const validation = moveAllCardsSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { targetColumnId } = validation.data

    if (columnId === targetColumnId) {
        return NextResponse.json({ error: 'Colunas iguais' }, { status: 400 })
    }

    // Fetch columns to verify they are on same board (as per initial scope)
    const sourceColumn = await prisma.column.findUnique({
      where: { id: columnId },
      include: { cards: { orderBy: { position: 'asc' } } } // Get cards to reorder
    })
    
    const targetColumn = await prisma.column.findUnique({
      where: { id: targetColumnId },
      include: { cards: { orderBy: { position: 'asc' }, take: 1 } } // Need to find end pos
    })

    if (!sourceColumn || !targetColumn) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 })
    }

    if (sourceColumn.boardId !== targetColumn.boardId) {
         // Should technically be allowed if we handle boardId updates, 
         // but Requirements: "Mover todos os cartões desta lista: Coluna destino (somente dentro do mesmo quadro, por enquanto)"
         return NextResponse.json({ error: 'Apenas mesmo quadro' }, { status: 400 })
    }

    const hasPermission = await checkBoardPermission(
      sourceColumn.boardId,
      session.user.id,
      'move_card'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Determine start position in target column
    // We want to append to the end.
    const lastCardInTarget = await prisma.card.findFirst({
        where: { columnId: targetColumnId },
        orderBy: { position: 'desc' }
    })

    let basePosition = lastCardInTarget ? lastCardInTarget.position : 0
    const POSITION_STEP = 65536

    // Transaction
    await prisma.$transaction(async (tx) => {
        // We need to update each card's position to be sequential after the existing ones
        // sourceColumn.cards is already ordered.
        
        for (let i = 0; i < sourceColumn.cards.length; i++) {
            const card = sourceColumn.cards[i]
            basePosition += POSITION_STEP
            
            await tx.card.update({
                where: { id: card.id },
                data: {
                    columnId: targetColumnId,
                    position: basePosition,
                    // boardId is same, so no change
                }
            })
        }
    })

    // Execute automations for all moved cards (awaited for consistency)
    for (const card of sourceColumn.cards) {
         try {
             await checkAndExecuteAutomations(card.id, targetColumnId)
         } catch (err: any) {
             console.error(`Error executing automation for card ${card.id}:`, err)
         }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error moving all cards:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
