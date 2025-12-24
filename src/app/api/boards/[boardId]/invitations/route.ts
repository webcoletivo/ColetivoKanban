import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { inviteSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import crypto from 'crypto'

import { sendEmail, getAddedToBoardTemplate, getInvitedToBoardTemplate } from '@/lib/mail'

// POST /api/boards/[boardId]/invitations - Send invitation
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

    // Fetch board and inviter info
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { name: true }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 })
    }

    try {
      await requireBoardPermission(boardId, session.user.id, 'invite_member')
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error
    }

    const body = await request.json()
    const result = inviteSchema.safeParse(body)
    
    if (!result.success) {
      const errorMessage = (result.error as any).errors?.[0]?.message || 'Dados inválidos'
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const email = result.data.email.toLowerCase()
    const inviterName = session.user.name || 'Um membro da equipe'
    const inviterEmail = session.user.email || ''

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      const existingMember = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId: existingUser.id } },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: 'Este usuário já é membro do board' },
          { status: 400 }
        )
      }

      // Add existing user directly
      await prisma.boardMember.create({
        data: {
          boardId,
          userId: existingUser.id,
          role: 'USER',
        },
      })

      // Send email informing they were added
      try {
        const boardUrl = `${process.env.NEXTAUTH_URL}/boards/${boardId}`
        await sendEmail({
          to: email,
          subject: `Você foi adicionado ao quadro: ${board.name}`,
          html: getAddedToBoardTemplate({
            boardName: board.name,
            addedByName: inviterName,
            addedByEmail: inviterEmail,
            boardUrl
          })
        })
      } catch (mailError) {
        console.error('Failed to send "Added to Board" email:', mailError)
        return NextResponse.json({
          message: 'Usuário adicionado ao board, mas houve uma falha ao enviar o e-mail de notificação.',
          added: true,
          emailSent: false
        }, { status: 201 })
      }

      return NextResponse.json({
        message: 'Usuário adicionado ao board e notificado por e-mail.',
        added: true,
        emailSent: true
      }, { status: 201 })
    }

    // Check for existing pending invitation (to avoid spam)
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        boardId,
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Já existe um convite pendente para este e-mail' },
        { status: 400 }
      )
    }

    // Create invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    await prisma.invitation.create({
      data: {
        email,
        tokenHash,
        boardId,
        role: result.data.role,
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      },
    })

    // Send email with invite link
    try {
      const inviteUrl = `${process.env.NEXTAUTH_URL}/signup?invite=${token}`
      
      await sendEmail({
        to: email,
        subject: `Convite para o quadro: ${board.name}`,
        html: getInvitedToBoardTemplate({
          boardName: board.name,
          invitedByName: inviterName,
          invitedByEmail: inviterEmail,
          inviteUrl
        })
      })
    } catch (mailError) {
      console.error('Failed to send "Invited to Board" email:', mailError)
      return NextResponse.json({
        message: 'Convite criado no sistema, mas houve uma falha ao enviar o e-mail.',
        emailSent: false
      }, { status: 201 })
    }

    return NextResponse.json({
      message: 'Convite enviado com sucesso por e-mail.',
      emailSent: true
    }, { status: 201 })
  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

