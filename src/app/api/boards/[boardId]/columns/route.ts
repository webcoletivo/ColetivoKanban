import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createColumnSchema, reorderColumnsSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { generatePosition } from '@/lib/utils'

// POST /api/boards/[boardId]/columns - Create a new column
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

    // Check permission
    try {
      await requireBoardPermission(boardId, session.user.id, 'create_column')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = createColumnSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Get the last column position
    const lastColumn = await prisma.column.findFirst({
      where: { boardId, archivedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const position = generatePosition(lastColumn?.position)

    const column = await prisma.column.create({
      data: {
        title: result.data.title,
        position,
        boardId,
      },
    })

    return NextResponse.json({
      id: column.id,
      title: column.title,
      position: column.position,
      cards: [],
    }, { status: 201 })
  } catch (error) {
    console.error('Create column error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
