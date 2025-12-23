import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm, PageHeader } from '@/components/profile/ProfileForm'
import { PasswordForm } from '@/components/profile/PasswordForm'
import { DeleteAccount } from '@/components/profile/DeleteAccount'

export const metadata = {
  title: 'Meu Perfil | ColetivoKanban',
  description: 'Gerencie suas informações pessoais e segurança da conta.',
}

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <PageHeader 
        title="Meu Perfil" 
        description="Gerencie suas informações de conta e configurações de segurança."
        breadcrumbs={[{ label: 'Perfil' }]}
      />
      
      <div className="grid grid-cols-1 gap-8">
        <ProfileForm 
          initialData={{
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt.toISOString(),
          }} 
        />
        
        <PasswordForm />
        
        <DeleteAccount />
      </div>
    </div>
  )
}
