import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { deleteFile, isUsingS3 } from '@/lib/storage'

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

    // Delete physical file from storage (S3 or local)
    try {
      if (isUsingS3()) {
        // S3: storageKey is the full path
        await deleteFile(attachment.storageKey)
      } else {
        // Local storage: file is in public/uploads/[storageKey]
        const path = await import('path')
        const { unlink } = await import('fs/promises')
        const { existsSync } = await import('fs')
        
        const filePath = path.join(process.cwd(), 'public', 'uploads', attachment.storageKey)
        
        if (existsSync(filePath)) {
          await unlink(filePath)
        }
      }
    } catch (deleteError) {
      console.error('Error deleting physical file:', deleteError)
      // Continue anyway to remove the database record
    }

    await prisma.$transaction([
      prisma.attachment.delete({
        where: { id: attachmentId },
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

    return NextResponse.json({ message: 'Anexo removido e arquivo excluído' })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
