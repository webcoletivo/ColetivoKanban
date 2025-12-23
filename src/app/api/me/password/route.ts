import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { changePasswordSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = changePasswordSchema.safeParse(body)
    
    if (!result.success) {
      const errorMessage = (result.error as any).errors?.[0]?.message || 'Dados inválidos'
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = result.data

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ message: 'Senha alterada com sucesso' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
