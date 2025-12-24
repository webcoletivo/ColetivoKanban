import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkBoardPermission } from '@/lib/permissions'
import { z } from 'zod'

const createAutomationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('MOVE_TO_COLUMN'),
    payload: z.object({
      targetColumnId: z.string().uuid(),
      targetBoardId: z.string().uuid().optional(),
      destinationPosition: z.enum(['first', 'last']).default('last'),
    })
  }),
  z.object({
    type: z.literal('COPY_TO_COLUMN'),
    payload: z.object({
      targetColumnId: z.string().uuid(),
      targetBoardId: z.string().uuid().optional(),
      destinationPosition: z.enum(['first', 'last']).default('last'),
    })
  }),
  z.object({
    type: z.literal('ADD_LABEL'),
    payload: z.object({
      labelId: z.string().uuid(),
    })
  })
])

export async function GET(
  req: Request,
  { params }: { params: Promise<{ columnId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '401' }, { status: 401 })

  const { columnId } = await params
  const automations = await prisma.columnAutomation.findMany({
    where: { columnId },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(automations)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { columnId } = await params
    const body = await req.json()
    const validation = createAutomationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const column = await prisma.column.findUnique({ where: { id: columnId } })
    if (!column) return NextResponse.json({ error: '404' }, { status: 404 })

    const hasPermission = await checkBoardPermission(
      column.boardId,
      session.user.id,
      'edit_column'
    )
    if (!hasPermission) return NextResponse.json({ error: '403' }, { status: 403 })

    const automation = await prisma.columnAutomation.create({
      data: {
        columnId,
        type: validation.data.type,
        payload: validation.data.payload as any // Prisma stores as Json, so any is acceptable here
      }
    })

    return NextResponse.json(automation)

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: '401' }, { status: 401 })

    const body = await req.json()
    const { id, type, payload } = body

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const automation = await prisma.columnAutomation.findUnique({
      where: { id },
      include: { column: true }
    })

    if (!automation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const hasPermission = await checkBoardPermission(
      automation.column.boardId,
      session.user.id,
      'edit_column'
    )
    if (!hasPermission) return NextResponse.json({ error: '403' }, { status: 403 })

    const updated = await prisma.columnAutomation.update({
      where: { id },
      data: {
        type: type || automation.type,
        payload: payload ? { ...(automation.payload as any), ...payload } : automation.payload
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ columnId: string }> }
) {
    // Note: This route structure might be awkward for DELETE specific ID if we use /automation
    // Better to have /api/columns/[columnId]/automation for LIST/CREATE
    // and /api/automation/[automationId] for DELETE? 
    // Or send ID in body? REST implies /automation/[id]
    
    // For simplicity, let's assume we pass ID in search params or body for now, 
    // OR the user actually requested "Automação (regra simples Trello-like)" which implies 1 rule?
    // "Action builder... Reutilizar o modal... salvar como regra."
    // Let's support deleting via query param for now or body.
    
    // But standard Next patterns suggest separate route `api/automations/[automationId]`
    // I'll stick to a simple body delete or just assume one automation per type if simpler?
    // No, let's do it clean. I will create `api/automations/[automationId]/route.ts` separately if needed.
    // However, I am in `columns/[columnId]/automation`.
    // I'll check query param ?id=...
    
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: '401' }, { status: 401 })
    
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    
    // permissions check needs to find the automation first to check board ownership
    const automation = await prisma.columnAutomation.findUnique({
        where: { id },
        include: { column: true }
    })
    
    if (!automation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        
    const hasPermission = await checkBoardPermission(
      automation.column.boardId,
      session.user.id,
      'edit_column'
    )
    
    if (!hasPermission) return NextResponse.json({ error: '403' }, { status: 403 })
        
    await prisma.columnAutomation.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
}
