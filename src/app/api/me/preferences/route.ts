import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updatePreferencesSchema } from '@/lib/validations'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Attempt to fetch user with preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { preferences: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    let preferences = user.preferences

    // If preferences don't exist yet, create them with defaults
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: session.user.id,
          theme: 'system',
          timezone: 'America/Sao_Paulo',
          emailInvitesEnabled: true,
          notificationsEnabled: true,
          language: 'pt-BR',
        },
      })
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('[SETTINGS_GET] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar configurações. Tente novamente.' }, 
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = updatePreferencesSchema.safeParse(body)
    
    if (!result.success) {
      const errorMessage = (result.error as any).errors?.[0]?.message || 'Dados inválidos'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    // Robust upsert via user update to ensure relation is handled atomically
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        preferences: {
          upsert: {
            create: result.data,
            update: result.data,
          }
        }
      },
      include: { preferences: true }
    })

    return NextResponse.json(user.preferences)
  } catch (error) {
    console.error('[SETTINGS_PATCH] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configurações. Tente novamente.' }, 
      { status: 500 }
    )
  }
}
