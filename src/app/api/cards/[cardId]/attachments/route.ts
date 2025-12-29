import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { 
  isUsingS3, 
  saveFile, 
  STORAGE_DIRS,
  getCurrentBucket 
} from '@/lib/storage'
import { 
  uploadFile as s3UploadFile, 
  generateStorageKey, 
  S3_PREFIXES 
} from '@/lib/s3'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST /api/cards/[cardId]/attachments - Upload attachment
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
      await requireBoardPermission(card.boardId, session.user.id, 'add_attachment')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    }

    // Check file size (max 300MB)
    const maxSize = 300 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo: 300MB' },
        { status: 400 }
      )
    }

    let storageKey: string
    let bucket: string | undefined

    if (isUsingS3()) {
      // S3 Upload
      storageKey = generateStorageKey(S3_PREFIXES.ATTACHMENTS, cardId, file.name)
      const result = await s3UploadFile(file, storageKey)
      bucket = result.bucket
    } else {
      // Local Storage
      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', cardId)
      
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, filename), buffer)

      // Storage key is path relative to public/uploads
      storageKey = path.join(cardId, filename).replace(/\\/g, '/')
    }

    const attachment = await prisma.$transaction(async (tx: any) => {
      const newAttachment = await tx.attachment.create({
        data: {
          fileName: file.name,
          fileSize: BigInt(file.size),
          mimeType: file.type || 'application/octet-stream',
          storageKey,
          cardId,
          uploadedById: session.user.id,
        },
        include: {
          uploadedBy: { select: { id: true, name: true } },
        },
      })

      await tx.cardActivity.create({
        data: {
          cardId,
          actorId: session.user.id,
          type: 'ATTACHMENT_ADDED',
          payload: { fileName: file.name },
        },
      })

      return newAttachment
    })

    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: Number(attachment.fileSize),
      mimeType: attachment.mimeType,
      storageKey: attachment.storageKey,
      createdAt: attachment.createdAt,
      uploadedBy: attachment.uploadedBy,
    }, { status: 201 })
  } catch (error) {
    console.error('Upload attachment error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
