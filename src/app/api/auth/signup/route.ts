import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { signupSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const result = signupSchema.safeParse(body)
    if (!result.success) {
      const errorMessage = (result.error as any).errors?.[0]?.message || 'Dados inválidos'
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const { name, email, password, invite: inviteToken } = result.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    })

    // 1. Handle specific token if provided
    let tokenInvitationBoardId: string | null = null
    if (inviteToken) {
      const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex')
      const invitation = await prisma.invitation.findUnique({
        where: { tokenHash },
      })

      if (invitation && invitation.status === 'PENDING' && invitation.expiresAt > new Date()) {
        tokenInvitationBoardId = invitation.boardId
        await prisma.$transaction([
          prisma.boardMember.upsert({
            where: {
              boardId_userId: {
                boardId: invitation.boardId,
                userId: user.id
              }
            },
            create: {
              boardId: invitation.boardId,
              userId: user.id,
              role: invitation.role,
            },
            update: {} // Already a member, do nothing
          }),
          prisma.invitation.update({
            where: { id: invitation.id },
            data: {
              status: 'ACCEPTED',
              acceptedById: user.id,
            },
          }),
        ])
      }
    }

    // 2. Also check for any other pending invitations matching the exact email (auto-accept)
    const otherInvitations = await prisma.invitation.findMany({
      where: {
        email: email.toLowerCase(),
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        boardId: tokenInvitationBoardId ? { not: tokenInvitationBoardId } : undefined
      },
    })

    if (otherInvitations.length > 0) {
      for (const invitation of otherInvitations) {
        await prisma.$transaction([
          prisma.boardMember.upsert({
            where: {
              boardId_userId: {
                boardId: invitation.boardId,
                userId: user.id
              }
            },
            create: {
              boardId: invitation.boardId,
              userId: user.id,
              role: invitation.role,
            },
            update: {}
          }),
          prisma.invitation.update({
            where: { id: invitation.id },
            data: {
              status: 'ACCEPTED',
              acceptedById: user.id,
            },
          }),
        ])
      }
    }

    return NextResponse.json(
      { 
        message: 'Conta criada com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        invitationsAccepted: (tokenInvitationBoardId ? 1 : 0) + otherInvitations.length,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

