import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'

// DELETE /api/checklists/[checklistId] - Delete checklist
export async function DELETE(
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

    await prisma.$transaction([
      prisma.checklist.delete({ where: { id: checklistId } }),
      prisma.cardActivity.create({
        data: {
          cardId: checklist.card.id,
          actorId: session.user.id,
          type: 'CHECKLIST_DELETED',
          payload: { title: checklist.title },
        },
      }),
    ])

    return NextResponse.json({ message: 'Checklist excluído' })
  } catch (error) {
    console.error('Delete checklist error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
