import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkBoardPermission } from '@/lib/permissions'
import { z } from 'zod'

const sortCardsSchema = z.object({
  criteria: z.enum(['created_desc', 'created_asc', 'name_asc', 'due_date']),
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
    const validation = sortCardsSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Critério inválido' }, { status: 400 })
    }

    const { criteria } = validation.data

    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { cards: true }
    })

    if (!column) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 })
    }

    const hasPermission = await checkBoardPermission(
      column.boardId,
      session.user.id,
      'edit_column'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Sort in memory
    const cards = [...column.cards]
    
    cards.sort((a, b) => {
        switch (criteria) {
            case 'created_desc':
                return b.createdAt.getTime() - a.createdAt.getTime()
            case 'created_asc':
                return a.createdAt.getTime() - b.createdAt.getTime()
            case 'name_asc':
                return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
            case 'due_date':
                // Cards without due date last
                if (!a.dueAt && !b.dueAt) return 0
                if (!a.dueAt) return 1
                if (!b.dueAt) return -1
                return a.dueAt.getTime() - b.dueAt.getTime()
            default:
                return 0
        }
    })

    // Update positions in DB
    const POSITION_STEP = 65536
    let currentPosition = POSITION_STEP

    await prisma.$transaction(async (tx) => {
        for (const card of cards) {
            await tx.card.update({
                where: { id: card.id },
                data: { position: currentPosition }
            })
            currentPosition += POSITION_STEP
        }
    })

    return NextResponse.json({ success: true, cards: cards.map(c => c.id) })

  } catch (error) {
    console.error('Error sorting cards:', error)
    return NextResponse.json({ error: 'Erro interno ao ordenar' }, { status: 500 })
  }
}
