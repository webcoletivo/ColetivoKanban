import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateColumnSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'

// PATCH /api/columns/[columnId] - Update column
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { columnId } = await params

    // Get column to find board
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    })

    if (!column) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 })
    }

    // Check permission
    try {
      await requireBoardPermission(column.boardId, session.user.id, 'edit_column')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    
    // Handle position update separately
    if (body.position !== undefined) {
      const updated = await prisma.column.update({
        where: { id: columnId },
        data: { position: body.position },
      })
      return NextResponse.json({
        id: updated.id,
        title: updated.title,
        position: updated.position,
      })
    }

    const result = updateColumnSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const updated = await prisma.column.update({
      where: { id: columnId },
      data: result.data,
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      position: updated.position,
    })
  } catch (error) {
    console.error('Update column error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/columns/[columnId] - Archive column
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { columnId } = await params

    // Get column to find board
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    })

    if (!column) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 })
    }

    // Check permission
    try {
      await requireBoardPermission(column.boardId, session.user.id, 'delete_column')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    // Hard delete column and its cards
    await prisma.$transaction([
      prisma.card.deleteMany({
        where: { columnId },
      }),
      prisma.column.delete({
        where: { id: columnId },
      }),
    ])

    return NextResponse.json({ message: 'Coluna excluída com sucesso' })
  } catch (error) {
    console.error('Delete column error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
