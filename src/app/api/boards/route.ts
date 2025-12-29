import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createBoardSchema } from '@/lib/validations'

// GET /api/boards - List all boards for current user
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const boards = await prisma.board.findMany({
      where: {
        members: {
          some: { userId: session.user.id },
        },
        deletedAt: null,
      },
      include: {
        members: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                avatarUrl: true,
                avatarKey: true,
                updatedAt: true
              },
            },
          },
        },
        _count: {
          select: { cards: { where: { archivedAt: null } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Format response
    // Format response
    const formattedBoards = (boards as any).map((board: any) => ({
      id: board.id,
      name: board.name,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      backgroundImageUrl: board.backgroundImageUrl,
      backgroundImageKey: board.backgroundImageKey,
      cardCount: board._count.cards,
      members: board.members.map((m: any) => ({
        id: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        avatarKey: m.user.avatarKey,
        updatedAt: m.user.updatedAt,
        role: m.role,
      })),
      myRole: board.members.find((m: any) => m.userId === session.user.id)?.role,
    }))

    return NextResponse.json(formattedBoards)
  } catch (error) {
    console.error('Get boards error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST /api/boards - Create a new board
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = createBoardSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name } = result.data

    const board = await prisma.board.create({
      data: {
        name,
        createdById: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                avatarUrl: true,
                avatarKey: true,
                updatedAt: true
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      id: board.id,
      name: board.name,
      createdAt: board.createdAt,
      members: board.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        avatarKey: (m.user as any).avatarKey,
        updatedAt: (m.user as any).updatedAt,
        role: m.role,
      })),
      myRole: 'ADMIN',
    }, { status: 201 })
  } catch (error) {
    console.error('Create board error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
