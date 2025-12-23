import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardHeader } from '@/components/shared/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <DashboardHeader user={session.user} />
      <main>{children}</main>
    </div>
  )
}
