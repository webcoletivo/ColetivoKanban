import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveFile, deleteFile, STORAGE_DIRS } from '@/lib/storage'
import path from 'path'

// POST /api/me/avatar - Upload profile avatar
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
    }

    // Local Storage
    const filename = `avatar-${session.user.id}-${Date.now()}${path.extname(file.name)}`
    
    // Get old avatar to delete if exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true }
    })

    if (user?.avatarUrl) {
      // Check if it's a local upload (matches new or old pattern)
      if (user.avatarUrl.includes('/uploads/avatars/')) {
        const oldFilename = path.basename(user.avatarUrl)
        await deleteFile(STORAGE_DIRS.AVATARS, oldFilename)
      }
    }

    const { storageKey } = await saveFile(file, STORAGE_DIRS.AVATARS, filename)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: storageKey },
    })

    return NextResponse.json({ avatarUrl: `/api/files/inline?key=${storageKey}` })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/me/avatar - Remove profile avatar
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true }
    })

    if (user?.avatarUrl) {
       if (user.avatarUrl.includes('/uploads/avatars/')) {
        const oldFilename = path.basename(user.avatarUrl)
        await deleteFile(STORAGE_DIRS.AVATARS, oldFilename)
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
