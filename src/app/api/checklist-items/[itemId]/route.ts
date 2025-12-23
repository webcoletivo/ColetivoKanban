import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateChecklistItemSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'

// PATCH /api/checklist-items/[itemId] - Update item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { itemId } = await params

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { 
        checklist: { 
          include: { card: { select: { boardId: true, id: true } } } 
        } 
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    try {
      await requireBoardPermission(item.checklist.card.boardId, session.user.id, 'edit_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = updateChecklistItemSchema.safeParse(body)
    
    if (!result.success) {
      const errorMessage = (result.error as any).errors?.[0]?.message || 'Dados inválidos'
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const data: any = {}
    if (result.data.text !== undefined) data.text = result.data.text
    if (result.data.isCompleted !== undefined) data.isCompleted = result.data.isCompleted
    if (result.data.dueAt !== undefined) {
      data.dueAt = result.data.dueAt ? new Date(result.data.dueAt) : null
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const updatedItem = await tx.checklistItem.update({
        where: { id: itemId },
        data,
      })

      // Create activity for completion changes
      if (result.data.isCompleted !== undefined && result.data.isCompleted !== item.isCompleted) {
        await tx.cardActivity.create({
          data: {
            cardId: item.checklist.card.id,
            actorId: session.user.id,
            type: result.data.isCompleted ? 'CHECKLIST_ITEM_COMPLETED' : 'CHECKLIST_ITEM_UNCOMPLETED',
            payload: { text: updatedItem.text },
          },
        })
      }

      return updatedItem
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update checklist item error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/checklist-items/[itemId] - Delete item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { itemId } = await params

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { 
        checklist: { 
          include: { card: { select: { boardId: true, id: true } } } 
        } 
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    try {
      await requireBoardPermission(item.checklist.card.boardId, session.user.id, 'edit_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    await prisma.$transaction([
      prisma.checklistItem.delete({ where: { id: itemId } }),
      prisma.cardActivity.create({
        data: {
          cardId: item.checklist.card.id,
          actorId: session.user.id,
          type: 'CHECKLIST_ITEM_DELETED',
          payload: { text: item.text },
        },
      }),
    ])

    return NextResponse.json({ message: 'Item excluído' })
  } catch (error) {
    console.error('Delete checklist item error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
