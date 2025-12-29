'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Laptop } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-lg w-fit animate-pulse">
        <div className="h-9 w-24 bg-muted rounded-md" />
        <div className="h-9 w-24 bg-muted rounded-md" />
        <div className="h-9 w-24 bg-muted rounded-md" />
      </div>
    )
  }

  const options = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Laptop },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Aparência</h3>
        <p className="text-sm text-muted-foreground">
          Escolha como o ColetivoKanban deve aparecer para você.
        </p>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const Icon = option.icon
          const isActive = theme === option.value
          
          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200",
                "hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-primary",
                isActive 
                  ? "bg-primary text-primary-foreground border-primary shadow-md" 
                  : "bg-card text-foreground border-border hover:border-primary/30"
              )}
              aria-label={`Mudar para tema ${option.label}`}
              aria-pressed={isActive}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              <span className="font-medium text-sm">{option.label}</span>
              {isActive && (
                 <span className="ml-1 flex h-2 w-2 rounded-full bg-white animate-in fade-in zoom-in" />
              )}
            </button>
          )
        })}
      </div>

      <div className="p-4 rounded-lg bg-secondary/30 border border-border text-sm text-muted-foreground">
        <p>
          Tema atual: <span className="font-medium text-foreground capitalize">{theme === 'system' ? `Sistema (${resolvedTheme})` : theme}</span>
        </p>
      </div>
    </div>
  )
}
