import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'

// DELETE /api/boards/[boardId]/members/[userId] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; userId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { boardId, userId } = await params

    try {
      await requireBoardPermission(boardId, session.user.id, 'remove_member')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    // Can't remove yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Você não pode se remover do board' },
        { status: 400 }
      )
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: true },
    })

    if (!board) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 })
    }

    // Protection: Cannot remove Owner
    if (board.createdById === userId) {
      return NextResponse.json(
        { error: 'O dono do quadro não pode ser removido' },
        { status: 400 }
      )
    }

    const member = board.members.find(m => m.userId === userId)

    if (!member) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })
    }

    // Protection: Cannot remove the last Admin
    if (member.role === 'ADMIN') {
      const adminCount = board.members.filter(m => m.role === 'ADMIN').length
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Não é possível remover o último administrador' },
          { status: 400 }
        )
      }
    }

    await prisma.boardMember.delete({
      where: { id: member.id },
    })

    return NextResponse.json({ message: 'Membro removido' })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PATCH /api/boards/[boardId]/members/[userId] - Change member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; userId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { boardId, userId } = await params

    try {
      await requireBoardPermission(boardId, session.user.id, 'change_member_role')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const { role } = body

    // Fix property usage
    if (!['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 })
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: true },
    })

    if (!board) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 })
    }

    const member = board.members.find(m => m.userId === userId)

    if (!member) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })
    }

    // Protection: Cannot downgrade Owner
    if (board.createdById === userId && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'O dono do quadro deve ser sempre Admin' },
        { status: 400 }
      )
    }

    // Protection: Cannot downgrade Last Admin
    if (member.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = board.members.filter(m => m.role === 'ADMIN').length
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Não é possível rebaixar o último administrador' },
          { status: 400 }
        )
      }
    }

    await prisma.boardMember.update({
      where: { id: member.id },
      data: { role },
    })

    return NextResponse.json({ message: 'Papel atualizado' })
  } catch (error) {
    console.error('Change role error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
