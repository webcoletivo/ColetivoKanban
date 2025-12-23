import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'

// GET /api/boards/[boardId]/search - Search cards in board
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
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')?.trim()

    if (!query) {
      return NextResponse.json([])
    }

    try {
      await requireBoardPermission(boardId, session.user.id, 'view_board')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const cards = await prisma.card.findMany({
      where: {
        boardId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        column: { select: { title: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(
      cards.map((card) => ({
        id: card.id,
        title: card.title,
        columnTitle: card.column.title,
        archivedAt: card.archivedAt,
      }))
    )
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
