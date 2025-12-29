import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { isUsingS3, deleteFile, STORAGE_DIRS, getFileUrl } from '@/lib/storage'
import { uploadFile as s3UploadFile, generateStorageKey, S3_PREFIXES, deleteObject as s3DeleteObject } from '@/lib/s3'
import { saveFile as localSaveFile } from '@/lib/storage'
import { v4 as uuidv4 } from 'uuid'

// POST /api/cards/[cardId]/cover - Upload card cover image
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const card = await (prisma.card as any).findUnique({
      where: { id: cardId },
      select: { boardId: true, coverImageKey: true }
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo inválido. Use JPG, PNG ou WebP.' }, { status: 400 })
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 })
    }

    // Delete old cover if exists
    if (card.coverImageKey) {
      try {
        if (isUsingS3()) {
          await s3DeleteObject(card.coverImageKey)
        } else {
          await deleteFile(STORAGE_DIRS.COVERS, card.coverImageKey)
        }
      } catch (e) {
        console.error('Error deleting old cover:', e)
      }
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExtension}`
    
    let storageKey: string
    let coverImageUrl: string

    if (isUsingS3()) {
      // S3 Upload
      storageKey = generateStorageKey(S3_PREFIXES.COVERS, cardId, fileName)
      await s3UploadFile(file, storageKey)
      // URL will be generated via API route, use placeholder
      coverImageUrl = `/api/cards/${cardId}/cover/image`
    } else {
      // Local storage
      const result = await localSaveFile(file, STORAGE_DIRS.COVERS, fileName, cardId)
      storageKey = fileName // For local, just the filename
      coverImageUrl = result.url
    }

    // Update card
    const updatedCard = await (prisma.card as any).update({
      where: { id: cardId },
      data: {
        coverType: 'image',
        coverImageUrl,
        coverImageKey: storageKey,
        coverSize: 'strip' // Default to strip when uploading
      }
    })

    return NextResponse.json({
      coverType: updatedCard.coverType,
      coverImageUrl: updatedCard.coverImageUrl,
      coverSize: updatedCard.coverSize
    })

  } catch (error: any) {
    console.error('Upload cover error for cardId:', cardId, error)
    return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 })
  }
}

// DELETE /api/cards/[cardId]/cover - Remove card cover
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const card = await (prisma.card as any).findUnique({
      where: { id: cardId },
      select: { boardId: true, coverImageKey: true }
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

    // Delete file if exists
    if (card.coverImageKey) {
      try {
        if (isUsingS3()) {
          await s3DeleteObject(card.coverImageKey)
        } else {
          await deleteFile(STORAGE_DIRS.COVERS, card.coverImageKey)
        }
      } catch (e) {
        console.error('Error deleting cover file:', e)
      }
    }

    // Update card - always set to none, even if already none (idempotent)
    await (prisma.card as any).update({
      where: { id: cardId },
      data: {
        coverType: 'none',
        coverColor: null,
        coverImageUrl: null,
        coverImageKey: null
      }
    })

    return NextResponse.json({ message: 'Capa removida' })

  } catch (error: any) {
    console.error('Delete cover error for cardId:', cardId, error)
    return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 })
  }
}
