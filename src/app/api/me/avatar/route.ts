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
    // Get old avatar to delete if exists
    const user = await (prisma.user as any).findUnique({
      where: { id: session.user.id },
      select: { avatarKey: true, avatarUrl: true }
    })

    // Delete old file
    if (user?.avatarKey) {
      try {
        await deleteFile(STORAGE_DIRS.AVATARS, user.avatarKey)
      } catch (e) {
        console.error('Error deleting old avatar:', e)
      }
    } else if (user?.avatarUrl && user.avatarUrl.includes('/uploads/')) {
        // Fallback for legacy local files
        try {
            const oldFilename = path.basename(user.avatarUrl)
            await deleteFile(STORAGE_DIRS.AVATARS, oldFilename)
        } catch (e) {
             console.error('Error deleting legacy avatar:', e)
        }
    }

    const { storageKey } = await saveFile(file, STORAGE_DIRS.AVATARS, filename)

    await (prisma.user as any).update({
      where: { id: session.user.id },
      data: { 
        avatarKey: storageKey,
        avatarUrl: null 
      },
    })
    
    // Deletion Handler
    // ...
    // Note: The delete handler below also needs fixing if it uses avatarKey


    return NextResponse.json({ 
      success: true,
      avatarKey: storageKey,
      url: `/api/files/inline?key=${storageKey}`
    })
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

    const user = await (prisma.user as any).findUnique({
      where: { id: session.user.id },
      select: { avatarKey: true, avatarUrl: true }
    })

    if (user?.avatarKey) {
        try {
            await deleteFile(STORAGE_DIRS.AVATARS, user.avatarKey)
        } catch (e) { console.error(e) }
    } else if (user?.avatarUrl && user.avatarUrl.includes('/uploads/')) {
        const oldFilename = path.basename(user.avatarUrl)
        try {
            await deleteFile(STORAGE_DIRS.AVATARS, oldFilename)
        } catch (e) { console.error(e) }
    }

    await (prisma.user as any).update({
      where: { id: session.user.id },
      data: { avatarUrl: null, avatarKey: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
