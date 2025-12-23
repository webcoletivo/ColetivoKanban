import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'

// DELETE /api/attachments/[attachmentId] - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { attachmentId } = await params

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { card: { select: { boardId: true, id: true } } },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })
    }

    try {
      await requireBoardPermission(attachment.card.boardId, session.user.id, 'delete_attachment')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    // In production, delete from S3 here

    await prisma.$transaction([
      prisma.attachment.update({
        where: { id: attachmentId },
        data: { deletedAt: new Date() },
      }),
      prisma.cardActivity.create({
        data: {
          cardId: attachment.card.id,
          actorId: session.user.id,
          type: 'ATTACHMENT_REMOVED',
          payload: { fileName: attachment.fileName },
        },
      }),
    ])

    return NextResponse.json({ message: 'Anexo removido' })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
