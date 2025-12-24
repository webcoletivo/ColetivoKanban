import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateCardSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import { sanitizeHtml } from '@/lib/utils/sanitization'
import fs from 'fs'
import { join } from 'path'

const LOG_FILE = join(process.cwd(), 'server_errors.log')

// GET /api/cards/[cardId] - Get card details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { cardId } = await params

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { select: { id: true, title: true } },
        labels: { include: { label: true } },
        checklists: {
          orderBy: { position: 'asc' },
          include: {
            items: { orderBy: { position: 'asc' } },
          },
        },
        attachments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            actor: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    }

    // Check permission
    try {
      await requireBoardPermission(card.boardId, session.user.id, 'view_board')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    return NextResponse.json({
      id: card.id,
      title: card.title,
      description: card.description,
      dueAt: card.dueAt,
      archivedAt: card.archivedAt,
      isCompleted: card.isCompleted,
      position: card.position,
      createdAt: card.createdAt,
      createdBy: card.createdBy,
      column: card.column,
      labels: card.labels.map((cl) => ({
        id: cl.label.id,
        name: cl.label.name,
        color: cl.label.color,
      })),
      checklists: card.checklists.map((cl) => ({
        id: cl.id,
        title: cl.title,
        position: cl.position,
        items: cl.items.map((item) => ({
          id: item.id,
          text: item.text,
          dueAt: item.dueAt,
          isCompleted: item.isCompleted,
          position: item.position,
        })),
      })),
      attachments: card.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: Number(a.fileSize),
        mimeType: a.mimeType,
        createdAt: a.createdAt,
        uploadedBy: a.uploadedBy,
      })),
      comments: card.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        user: c.user,
      })),
      activities: card.activities.map((a) => ({
        id: a.id,
        type: a.type,
        payload: a.payload,
        createdAt: a.createdAt,
        actor: a.actor,
      })),
      coverType: (card as any).coverType,
      coverColor: (card as any).coverColor,
      coverImageUrl: (card as any).coverImageUrl,
      coverSize: (card as any).coverSize,
      isTemplate: (card as any).isTemplate || false,
      templateSourceCardId: (card as any).templateSourceCardId || null,
    })
  } catch (error) {
    console.error('Get card error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PATCH /api/cards/[cardId] - Update card
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params
  
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const card = await (prisma.card as any).findUnique({
      where: { id: cardId },
      select: { boardId: true, title: true, dueAt: true, isCompleted: true, archivedAt: true, isTemplate: true },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    }

    // Check permission
    try {
      await requireBoardPermission(card.boardId, session.user.id, 'edit_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = updateCardSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = result.data

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    const activities: Array<{ type: string; payload: Record<string, unknown> }> = []

    if (data.title !== undefined && data.title !== card.title) {
      updateData.title = data.title
      activities.push({
        type: 'CARD_UPDATED',
        payload: { field: 'title', from: card.title, to: data.title },
      })
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? sanitizeHtml(data.description) : null
    }

    if (data.archivedAt !== undefined) {
       const archivedAt = data.archivedAt ? new Date(data.archivedAt) : null
       updateData.archivedAt = archivedAt
       if (!archivedAt && card.archivedAt) {
          activities.push({ type: 'CARD_UNARCHIVED', payload: {} })
       } else if (archivedAt && !card.archivedAt) {
          activities.push({ type: 'CARD_ARCHIVED', payload: {} })
       }
    }

    if (data.dueAt !== undefined) {
      updateData.dueAt = data.dueAt ? new Date(data.dueAt) : null
      if (data.dueAt && !card.dueAt) {
        activities.push({ type: 'DUE_SET', payload: { dueAt: data.dueAt } })
      } else if (!data.dueAt && card.dueAt) {
        activities.push({ type: 'DUE_REMOVED', payload: { previousDueAt: card.dueAt } })
      }
    }

    if (data.isCompleted !== undefined && data.isCompleted !== card.isCompleted) {
      updateData.isCompleted = data.isCompleted
      activities.push({
        type: data.isCompleted ? 'DUE_COMPLETED' : 'DUE_UNCOMPLETED',
        payload: {},
      })
    }

    if (data.coverType !== undefined) updateData.coverType = data.coverType
    if (data.coverColor !== undefined) updateData.coverColor = data.coverColor
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl
    if (data.coverSize !== undefined) updateData.coverSize = data.coverSize

    // Handle isTemplate toggle
    if (data.isTemplate !== undefined && data.isTemplate !== card.isTemplate) {
      updateData.isTemplate = data.isTemplate
      activities.push({
        type: data.isTemplate ? 'CARD_MARKED_AS_TEMPLATE' : 'CARD_UNMARKED_AS_TEMPLATE',
        payload: {},
      })
    }


    const updated = await prisma.$transaction(async (tx) => {
      const updatedCard = await (tx.card as any).update({
        where: { id: cardId },
        data: updateData,
      })

      // Create activities
      for (const activity of activities) {
        await tx.cardActivity.create({
          data: {
            cardId,
            actorId: session.user.id,
            type: activity.type as never,
            payload: activity.payload as any,
          },
        })
      }

      return updatedCard
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      dueAt: updated.dueAt,
      archivedAt: updated.archivedAt,
      isCompleted: updated.isCompleted,
      isTemplate: (updated as any).isTemplate || false,
      coverType: (updated as any).coverType,
      coverColor: (updated as any).coverColor,
      coverImageUrl: (updated as any).coverImageUrl,
      coverSize: (updated as any).coverSize,
    })
  } catch (error: any) {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] PATCH /api/cards/${cardId} Error: ${error.stack || error}\n`)
    console.error('Update card error for cardId:', cardId)
    console.error('Error details:', error)
    return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 })
  }
}

// DELETE /api/cards/[cardId] - Archive card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { cardId } = await params

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { boardId: true },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    }

    // Check permission
    try {
      await requireBoardPermission(card.boardId, session.user.id, 'delete_card')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    await prisma.card.delete({
      where: { id: cardId },
    })

    return NextResponse.json({ message: 'Card excluído com sucesso' })
  } catch (error) {
    console.error('Delete card error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
