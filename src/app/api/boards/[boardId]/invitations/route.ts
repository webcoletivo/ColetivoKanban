import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { inviteSchema } from '@/lib/validations'
import { requireBoardPermission, PermissionError } from '@/lib/permissions'
import crypto from 'crypto'

import { sendEmail } from '@/lib/mail'

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

      return NextResponse.json({
        message: 'Usuário adicionado ao board',
        added: true,
      }, { status: 201 })
    }

    // Check for existing pending invitation
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
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    // Send email with invite link
    const inviteUrl = `${process.env.NEXTAUTH_URL}/signup?invite=${token}`
    
    await sendEmail({
      to: email,
      subject: 'Convite para colaborar no ColetivoTrello',
      html: `
        <h1>Você foi convidado!</h1>
        <p>Alguém convidou você para colaborar em um board no ColetivoTrello.</p>
        <p>Clique no link abaixo para aceitar:</p>
        <a href="${inviteUrl}">${inviteUrl}</a>
      `
    })

    return NextResponse.json({
      message: 'Convite enviado',
      token, // Keeping token in response for easier local testing if needed, though logs show it too
    }, { status: 201 })
  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
