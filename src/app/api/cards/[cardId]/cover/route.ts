import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { saveFile, deleteFile, STORAGE_DIRS } from '@/lib/storage'
import fs from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const LOG_FILE = join(process.cwd(), 'server_errors.log')

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

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExtension}`

    // Delete old file if exists
    if (card.coverImageKey) {
      await deleteFile(STORAGE_DIRS.COVERS, card.coverImageKey)
    }

    // Save new file
    const { url } = await saveFile(file, STORAGE_DIRS.COVERS, fileName)

    // Update card
    const updatedCard = await (prisma.card as any).update({
      where: { id: cardId },
      data: {
        coverType: 'image',
        coverImageUrl: url,
        coverImageKey: fileName,
        coverSize: 'strip' // Default to strip when uploading
      }
    })

    return NextResponse.json({
      coverType: (updatedCard as any).coverType,
      coverImageUrl: (updatedCard as any).coverImageUrl,
      coverSize: (updatedCard as any).coverSize
    })

  } catch (error: any) {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] POST /api/cards/${cardId}/cover Error: ${error.stack || error}\n`)
    console.error('Upload cover error for cardId:', cardId)
    console.error('Error details:', error)
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
      await deleteFile(STORAGE_DIRS.COVERS, card.coverImageKey)
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
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] DELETE /api/cards/${cardId}/cover Error: ${error.stack || error}\n`)
    console.error('Delete cover error for cardId:', cardId)
    console.error('Error details:', error)
    return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 })
  }
}
