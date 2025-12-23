import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLabelSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'

// GET /api/boards/[boardId]/labels - Get all labels for a board
export async function GET(
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
      await requireBoardPermission(boardId, session.user.id, 'view_board')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const labels = await prisma.label.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(labels)
  } catch (error) {
    console.error('Get labels error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST /api/boards/[boardId]/labels - Create a new label
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

    try {
      await requireBoardPermission(boardId, session.user.id, 'manage_labels')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = createLabelSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const label = await prisma.label.create({
      data: {
        ...result.data,
        boardId,
      },
    })

    return NextResponse.json(label, { status: 201 })
  } catch (error) {
    console.error('Create label error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
