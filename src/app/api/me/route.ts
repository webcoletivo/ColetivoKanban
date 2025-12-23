import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateProfileSchema, changePasswordSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'

// GET /api/me - Get current user profile
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PATCH /api/me - Update current user profile
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = updateProfileSchema.safeParse(body)
    
    if (!result.success) {
      const errorMessage = (result.error as any).errors?.[0]?.message || 'Dados inválidos'
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: result.data,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/me - Delete current user account
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { password, confirmation } = body

    if (confirmation !== 'EXCLUIR') {
      return NextResponse.json(
        { error: 'Digite "EXCLUIR" para confirmar' },
        { status: 400 }
      )
    }

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 400 })
    }

    // Check if user is the only admin of any board
    const adminMemberships = await prisma.boardMember.findMany({
      where: {
        userId: session.user.id,
        role: 'ADMIN',
      },
      include: {
        board: {
          include: {
            members: {
              where: { role: 'ADMIN' },
            },
          },
        },
      },
    })

    const boardsWithOnlyAdmin = adminMemberships.filter(
      (m: any) => m.board.members.length === 1
    )

    if (boardsWithOnlyAdmin.length > 0) {
      return NextResponse.json(
        { 
          error: 'Você é o único admin de alguns boards. Transfira a administração antes de excluir sua conta.',
          boards: boardsWithOnlyAdmin.map((m: any) => ({ id: m.board.id, name: m.board.name })),
        },
        { status: 400 }
      )
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ message: 'Conta excluída com sucesso' })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
