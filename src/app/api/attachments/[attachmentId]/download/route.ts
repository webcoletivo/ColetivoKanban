import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// GET /api/attachments/[attachmentId]/download - Download attachment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      // In production, signed URLs bypass auth at download time because the URL itself is the secret.
      // For this MVP local storage implementation, we will enforce auth to keep it simple and secure.
      // Alternatively, we could generate a temporary token in the DB, but auth check is easier here.
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
       // If user cannot view board, they cannot download attachment
      if (error instanceof PermissionError) {
         return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }
      throw error
    }

    // Serve local file
    const filePath = path.join(process.cwd(), 'public', 'uploads', attachment.storageKey)
    
    if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'Arquivo físico não encontrado' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': attachment.fileSize.toString(),
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
      },
    })
  } catch (error) {
    console.error('Download attachment error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
