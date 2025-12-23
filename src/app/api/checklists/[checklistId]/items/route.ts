import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createChecklistItemSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { generatePosition } from '@/lib/utils'

// POST /api/checklists/[checklistId]/items - Add item to checklist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ checklistId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { checklistId } = await params

    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: { card: { select: { boardId: true, id: true } } },
    })

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist não encontrado' }, { status: 404 })
    }

    try {
      await requireBoardPermission(checklist.card.boardId, session.user.id, 'edit_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = createChecklistItemSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Get the last item position
    const lastItem = await prisma.checklistItem.findFirst({
      where: { checklistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const position = generatePosition(lastItem?.position)

    const item = await prisma.$transaction(async (tx) => {
      const newItem = await tx.checklistItem.create({
        data: {
          ...result.data,
          dueAt: result.data.dueAt ? new Date(result.data.dueAt) : null,
          position,
          checklistId,
        },
      })

      await tx.cardActivity.create({
        data: {
          cardId: checklist.card.id,
          actorId: session.user.id,
          type: 'CHECKLIST_ITEM_ADDED',
          payload: { text: result.data.text, checklistTitle: checklist.title },
        },
      })

      return newItem
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Create checklist item error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
