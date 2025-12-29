import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { isUsingS3, getFileUrl, STORAGE_DIRS } from '@/lib/storage'
import { getPresignedUrl } from '@/lib/s3'
import path from 'path'
import { existsSync, createReadStream } from 'fs'

// GET /api/cards/[cardId]/cover/image - Serve card cover image
export async function GET(
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
      select: { 
        boardId: true, 
        coverType: true,
        coverImageKey: true,
        coverImageUrl: true 
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    }

    if (card.coverType !== 'image' || !card.coverImageKey) {
      return NextResponse.json({ error: 'Card não possui capa de imagem' }, { status: 404 })
    }

    try {
      await requireBoardPermission(card.boardId, session.user.id, 'view_board')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }
      throw error
    }

    if (isUsingS3()) {
      // S3: Redirect to presigned URL
      const presignedUrl = await getPresignedUrl(card.coverImageKey, {
        disposition: 'inline',
        expiresIn: 3600, // 1 hour for images
      })
      
      return NextResponse.redirect(presignedUrl)
    } else {
      // Local storage: Stream the file
      const filePath = path.join(process.cwd(), 'uploads', STORAGE_DIRS.COVERS, card.coverImageKey)
      
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
      const ext = path.extname(card.coverImageKey).toLowerCase()
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
    console.error('Get cover image error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
