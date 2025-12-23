import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
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

    const { name, email, password } = result.data

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

    // Check for pending invitations for this email
    const pendingInvitations = await prisma.invitation.findMany({
      where: {
        email: email.toLowerCase(),
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })

    // Accept all pending invitations
    for (const invitation of pendingInvitations) {
      await prisma.$transaction([
        prisma.boardMember.create({
          data: {
            boardId: invitation.boardId,
            userId: user.id,
            role: 'USER' as any, // Cast to match Enum if necessary
          },
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

    return NextResponse.json(
      { 
        message: 'Conta criada com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        pendingInvitationsAccepted: pendingInvitations.length,
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
