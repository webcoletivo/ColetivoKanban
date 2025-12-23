import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCommentSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { sanitizeHtml } from '@/lib/utils/sanitization'

// POST /api/cards/[cardId]/comments - Add comment
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
      await requireBoardPermission(card.boardId, session.user.id, 'add_comment')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = createCommentSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.cardComment.create({
        data: {
          content: sanitizeHtml(result.data.content),
          cardId,
          userId: session.user.id,
        },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      await tx.cardActivity.create({
        data: {
          cardId,
          actorId: session.user.id,
          type: 'COMMENT_ADDED',
          payload: {},
        },
      })

      return newComment
    })

    return NextResponse.json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: comment.user,
    }, { status: 201 })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
