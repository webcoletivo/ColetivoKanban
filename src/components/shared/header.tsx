'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Kanban, User, LogOut, ChevronDown, Settings, Home } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

import { useCurrentUser } from '@/hooks/use-current-user'

interface HeaderProps {
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string | null
  }
}

export function DashboardHeader({ user: initialUser }: HeaderProps) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = React.useState(false)
  const { data: user } = useCurrentUser(initialUser)

  // Use current user data if available, otherwise fallback to prop (which is initial state)
  const currentUser = user || initialUser

  if (!currentUser) return null

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Kanban className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              ColetivoKanban
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/home"
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/home'
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Home className="h-4 w-4 inline mr-2" />
              Meus Quadros
            </Link>
          </nav>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50"
            >
              <Avatar 
                src={currentUser.avatarUrl} 
                name={currentUser.name} 
                size="sm" 
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-foreground">
                  {currentUser.name}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 mt-2 w-60 bg-popover rounded-xl shadow-xl border border-border/60 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-border/40">
                    <p className="text-sm font-medium text-foreground">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentUser.email}
                    </p>
                  </div>
                  
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <User className="h-4 w-4" />
                    Meu Perfil
                  </Link>
                  
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Link>
                  
                  <div className="border-t border-border/40 mt-1 pt-1">
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

