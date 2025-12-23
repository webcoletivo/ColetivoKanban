import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { PageHeader } from '@/components/profile/ProfileForm'
import { SettingsForm } from '@/components/settings/SettingsForm'

export const metadata = {
  title: 'Configurações | ColetivoKanban',
  description: 'Personalize sua experiência no ColetivoKanban.',
}

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <PageHeader 
        title="Configurações" 
        description="Personalize o tema, notificações e outras preferências do sistema."
        breadcrumbs={[{ label: 'Configurações' }]}
      />
      
      <div className="mt-8">
        <SettingsForm />
      </div>
    </div>
  )
}
