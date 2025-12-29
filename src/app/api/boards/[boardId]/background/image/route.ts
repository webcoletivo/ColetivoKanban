import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { isUsingS3, STORAGE_DIRS } from '@/lib/storage'
import { getPresignedUrl } from '@/lib/s3'
import path from 'path'
import { existsSync, createReadStream } from 'fs'

// GET /api/boards/[boardId]/background/image - Serve board background image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { boardId } = await params

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { 
        backgroundImageKey: true,
        backgroundImageUrl: true 
      },
    })

    if (!board) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 })
    }

    if (!board.backgroundImageKey) {
      return NextResponse.json({ error: 'Board não possui imagem de fundo' }, { status: 404 })
    }

    try {
      await requireBoardPermission(boardId, session.user.id, 'view_board')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }
      throw error
    }

    if (isUsingS3()) {
      // S3: Redirect to presigned URL
      const presignedUrl = await getPresignedUrl(board.backgroundImageKey, {
        disposition: 'inline',
        expiresIn: 3600, // 1 hour for background images
      })
      
      return NextResponse.redirect(presignedUrl)
    } else {
      // Local storage: Stream the file
      const filePath = path.join(process.cwd(), 'uploads', STORAGE_DIRS.BOARDS, board.backgroundImageKey)
      
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
      }

      const { stat } = await import('fs/promises')
      const stats = await stat(filePath)
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

      // Determine content type from extension
      const ext = path.extname(board.backgroundImageKey).toLowerCase()
      const contentTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
      }
      const contentType = contentTypes[ext] || 'application/octet-stream'

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': stats.size.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }
  } catch (error) {
    console.error('Get background image error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
