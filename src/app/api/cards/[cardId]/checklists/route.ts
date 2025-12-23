import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createChecklistSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { generatePosition } from '@/lib/utils'

// POST /api/cards/[cardId]/checklists - Create a new checklist
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
      select: { boardId: true },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    }

    try {
      await requireBoardPermission(card.boardId, session.user.id, 'edit_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = createChecklistSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Get the last checklist position
    const lastChecklist = await prisma.checklist.findFirst({
      where: { cardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const position = generatePosition(lastChecklist?.position)

    const checklist = await prisma.$transaction(async (tx) => {
      const newChecklist = await tx.checklist.create({
        data: {
          ...result.data,
          position,
          cardId,
        },
        include: { items: true },
      })

      await tx.cardActivity.create({
        data: {
          cardId,
          actorId: session.user.id,
          type: 'CHECKLIST_CREATED',
          payload: { title: result.data.title },
        },
      })

      return newChecklist
    })

    return NextResponse.json(checklist, { status: 201 })
  } catch (error) {
    console.error('Create checklist error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
