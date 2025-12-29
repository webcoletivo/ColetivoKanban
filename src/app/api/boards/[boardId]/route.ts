import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateBoardSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'

// GET /api/boards/[boardId] - Get board details with columns and cards
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

    // Check permission
    try {
      await requireBoardPermission(boardId, session.user.id, 'view_board')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
          include: {
            cards: {
              where: { archivedAt: null },
              orderBy: { position: 'asc' },
              include: {
                labels: {
                  include: { label: true },
                },
                checklists: {
                  include: {
                    items: true,
                  },
                },
                _count: {
                  select: { 
                    comments: true,
                    attachments: { where: { deletedAt: null } },
                  },
                },
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, avatarKey: true, updatedAt: true } as any,
            },
          },
        },
        labels: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!board) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 })
    }

    const myMembership = board.members.find((m) => m.userId === session.user.id)

    return NextResponse.json({
      id: board.id,
      name: board.name,
      ownerId: board.createdById, // Map createdById to ownerId for frontend
      myUserId: session.user.id,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      backgroundImageUrl: board.backgroundImageUrl,
      backgroundImageKey: board.backgroundImageKey,
      myRole: myMembership?.role,
      columns: board.columns.map((col) => ({
        id: col.id,
        title: col.title,
        position: col.position,
        cards: col.cards.map((card) => ({
          id: card.id,
          title: card.title,
          description: card.description,
          dueAt: card.dueAt,
          isCompleted: card.isCompleted,
          position: card.position,
          labels: card.labels.map((cl) => ({
            id: cl.label.id,
            name: cl.label.name,
            color: cl.label.color,
          })),
          checklistProgress: card.checklists.reduce(
            (acc, cl) => {
              const total = cl.items.length
              const completed = cl.items.filter((i) => i.isCompleted).length
              return { total: acc.total + total, completed: acc.completed + completed }
            },
            { total: 0, completed: 0 }
          ),
          commentCount: card._count.comments,
          attachmentCount: card._count.attachments,
          coverType: card.coverType,
          coverColor: card.coverColor,
          coverImageUrl: card.coverImageUrl,
          coverImageKey: card.coverImageKey,
          coverSize: card.coverSize,
          isTemplate: (card as any).isTemplate || false,
          updatedAt: card.updatedAt,
        })),
      })),
      members: board.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        // @ts-ignore
        avatarKey: m.user.avatarKey,
        updatedAt: m.user.updatedAt,
        role: m.role,
      })),
      labels: board.labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
    })
  } catch (error) {
    console.error('Get board error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PATCH /api/boards/[boardId] - Update board
export async function PATCH(
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
      await requireBoardPermission(boardId, session.user.id, 'edit_board')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = updateBoardSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const board = await prisma.board.update({
      where: { id: boardId },
      data: result.data,
    })

    return NextResponse.json({
      id: board.id,
      name: board.name,
      updatedAt: board.updatedAt,
    })
  } catch (error) {
    console.error('Update board error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/boards/[boardId] - Delete board (Admin only)
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

    // Check permission (Admin only)
    try {
      await requireBoardPermission(boardId, session.user.id, 'delete_board')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    // Hard delete via transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Due to Cascade delete in schema, deleting the board will delete:
      // - BoardMembers
      // - Columns (and Cards, Labels, Checklists, Attachments, Comments, Activities)
      // - Labels
      // - Invitations
      await tx.board.delete({
        where: { id: boardId },
      })
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Delete board error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 })
  }
}
