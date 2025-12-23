import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
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
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `avatar-${session.user.id}-${Date.now()}${path.extname(file.name)}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    
    await mkdir(uploadDir, { recursive: true })
    
    // Get old avatar to delete if exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true }
    })

    if (user?.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
        try {
            const oldPath = path.join(process.cwd(), 'public', user.avatarUrl)
            await unlink(oldPath)
        } catch (e) {
            console.warn('Could not delete old avatar:', e)
        }
    }

    await writeFile(path.join(uploadDir, filename), buffer)
    const avatarUrl = `/uploads/avatars/${filename}`

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    })

    return NextResponse.json({ avatarUrl })
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

    if (user?.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
        try {
            const oldPath = path.join(process.cwd(), 'public', user.avatarUrl)
            await unlink(oldPath)
        } catch (e) {
            console.warn('Could not delete avatar file:', e)
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
