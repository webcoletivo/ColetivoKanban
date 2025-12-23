import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

// POST /api/boards/[boardId]/background - Upload board background
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { boardId } = await params

    // Check if board exists and user has permission
    try {
      const { member } = await requireBoardPermission(boardId, session.user.id, 'edit_board')
      if (member.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Apenas administradores podem alterar o fundo' }, { status: 403 })
      }
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

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP' }, { status: 400 })
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo: 10MB' },
        { status: 400 }
      )
    }

    // Local Storage Logic
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `bg-${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'boards', boardId)
    
    await mkdir(uploadDir, { recursive: true })
    
    // Delete old file if exists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { backgroundImageKey: true }
    })
    
    if (board?.backgroundImageKey) {
      const oldPath = path.join(process.cwd(), 'public', 'uploads', 'boards', board.backgroundImageKey)
      try {
        await unlink(oldPath)
      } catch (err) {
        console.warn('Failed to delete old background:', err)
      }
    }

    await writeFile(path.join(uploadDir, filename), buffer)

    // Storage key logic (path relative to boards folder)
    const storageKey = path.join(boardId, filename).replace(/\\/g, '/')
    const backgroundImageUrl = `/uploads/boards/${storageKey}`

    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: {
        backgroundImageUrl,
        backgroundImageKey: storageKey,
      },
    })

    return NextResponse.json(updatedBoard)
  } catch (error) {
    console.error('Upload board background error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/boards/[boardId]/background - Remove board background
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { boardId } = await params

    try {
      const { member } = await requireBoardPermission(boardId, session.user.id, 'edit_board')
      if (member.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Apenas administradores podem remover o fundo' }, { status: 403 })
      }
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { backgroundImageKey: true }
    })

    if (board?.backgroundImageKey) {
      const oldPath = path.join(process.cwd(), 'public', 'uploads', 'boards', board.backgroundImageKey)
      try {
        await unlink(oldPath)
      } catch (err) {
        console.warn('Failed to delete background file:', err)
      }
    }

    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: {
        backgroundImageUrl: null,
        backgroundImageKey: null,
      },
    })

    return NextResponse.json(updatedBoard)
  } catch (error) {
    console.error('Remove board background error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
