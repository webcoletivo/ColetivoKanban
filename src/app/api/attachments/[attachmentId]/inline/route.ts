import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { isUsingS3, getFileUrl } from '@/lib/storage'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// GET /api/attachments/[attachmentId]/inline - Serve attachment for inline preview
export async function GET(
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
      include: { card: true },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })
    }

    try {
      await requireBoardPermission(attachment.card.boardId, session.user.id, 'view_board')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }
      throw error
    }

    if (isUsingS3()) {
      // S3: Redirect to presigned URL
      const presignedUrl = await getFileUrl(attachment.storageKey, {
        disposition: 'inline',
        filename: attachment.fileName,
        contentType: attachment.mimeType,
      })
      
      return NextResponse.redirect(presignedUrl)
    } else {
      // Local storage: Stream the file
      const filePath = path.join(process.cwd(), 'public', 'uploads', attachment.storageKey)
      
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'Arquivo físico não encontrado' }, { status: 404 })
      }

      const { createReadStream } = await import('fs')
      const fileStream = createReadStream(filePath)

      const readableStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk))
          fileStream.on('end', () => controller.close())
          fileStream.on('error', (err) => controller.error(err))
        },
        cancel() {
          fileStream.destroy()
        },
      })

      let contentType = attachment.mimeType
      if (attachment.fileName.endsWith('.mov') && contentType === 'application/octet-stream') {
        contentType = 'video/quicktime'
      }

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': attachment.fileSize.toString(),
          'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }
  } catch (error) {
    console.error('Inline attachment error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
