import { Kanban } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md space-y-6">
        {/* Logo - Minimalist */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Kanban className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">ColetivoTrello</span>
          </div>
          <p className="text-sm text-muted-foreground">Gestão de projetos simplificada</p>
        </div>
        
        {children}
      </div>
    </div>
  )
}
