import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'

// POST /api/cards/[cardId]/labels/[labelId] - Add label to card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string; labelId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { cardId, labelId } = await params

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

    // Check if already assigned
    const existing = await prisma.cardLabel.findUnique({
      where: { cardId_labelId: { cardId, labelId } },
    })

    if (existing) {
      return NextResponse.json({ message: 'Label já atribuída' })
    }

    await prisma.$transaction([
      prisma.cardLabel.create({
        data: { cardId, labelId },
      }),
      prisma.cardActivity.create({
        data: {
          cardId,
          actorId: session.user.id,
          type: 'LABEL_ADDED',
          payload: { labelId },
        },
      }),
    ])

    return NextResponse.json({ message: 'Label adicionada' }, { status: 201 })
  } catch (error) {
    console.error('Add label error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/cards/[cardId]/labels/[labelId] - Remove label from card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string; labelId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { cardId, labelId } = await params

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

    await prisma.$transaction([
      prisma.cardLabel.delete({
        where: { cardId_labelId: { cardId, labelId } },
      }),
      prisma.cardActivity.create({
        data: {
          cardId,
          actorId: session.user.id,
          type: 'LABEL_REMOVED',
          payload: { labelId },
        },
      }),
    ])

    return NextResponse.json({ message: 'Label removida' })
  } catch (error) {
    console.error('Remove label error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
