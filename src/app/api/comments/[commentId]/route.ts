import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { ActivityType } from '@prisma/client'
import { sanitizeHtml } from '@/lib/utils/sanitization'

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comentário é obrigatório').max(5000, 'Comentário muito longo'),
})

// PATCH /api/comments/[commentId] - Update comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { commentId } = await params

    const comment = await prisma.cardComment.findUnique({
      where: { id: commentId, deletedAt: null },
      include: {
        card: { select: { boardId: true } },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 })
    }

    // Only the author can edit their own comment
    if (comment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Você não pode editar este comentário' }, { status: 403 })
    }

    const body = await request.json()
    const result = updateCommentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const comment = await tx.cardComment.update({
        where: { id: commentId },
        data: { content: sanitizeHtml(result.data.content) },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      await tx.cardActivity.create({
        data: {
          cardId: comment.cardId,
          actorId: session.user.id,
          type: 'COMMENT_EDITED' as any,
          payload: {},
        },
      })

      return comment
    })

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      user: updated.user,
    })
  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/comments/[commentId] - Delete comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { commentId } = await params

    const comment = await prisma.cardComment.findUnique({
      where: { id: commentId, deletedAt: null },
      include: {
        card: { select: { boardId: true } },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 })
    }

    // Check if user is the author or an admin of the board
    let canDelete = comment.userId === session.user.id

    if (!canDelete) {
      // Check if user is admin of the board
      try {
        await requireBoardPermission(comment.card.boardId, session.user.id, 'remove_member')
        canDelete = true
      } catch (error) {
        // Not an admin, can't delete
      }
    }

    if (!canDelete) {
      return NextResponse.json({ error: 'Você não pode excluir este comentário' }, { status: 403 })
    }

    // Soft delete the comment
    // Soft delete the comment and log activity
    await prisma.$transaction(async (tx) => {
      await tx.cardComment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      })

      await tx.cardActivity.create({
        data: {
          cardId: comment.cardId,
          actorId: session.user.id,
          type: 'COMMENT_DELETED' as any,
          payload: {},
        },
      })
    })

    return NextResponse.json({ message: 'Comentário excluído' })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
