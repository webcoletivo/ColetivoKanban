'use client'

import * as React from 'react'
import { Monitor, Sun, Moon, Globe, Bell, Mail, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updatePreferencesSchema, type UpdatePreferencesInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/hooks/use-preferences'

export function SettingsForm() {
  const { preferences, updatePreferences, isUpdating, isLoading } = usePreferences()
  const { addToast } = useToast()

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm<UpdatePreferencesInput>({
    resolver: zodResolver(updatePreferencesSchema),
    defaultValues: {
      theme: 'system',
      timezone: 'America/Sao_Paulo',
      emailInvitesEnabled: true,
      notificationsEnabled: true,
      language: 'pt-BR',
    },
  })

  // Sync form with data from hook
  React.useEffect(() => {
    if (preferences) {
      reset({
        theme: preferences.theme,
        timezone: preferences.timezone,
        emailInvitesEnabled: preferences.emailInvitesEnabled,
        notificationsEnabled: preferences.notificationsEnabled,
        language: preferences.language,
      })
    }
  }, [preferences, reset])

  const themeValue = watch('theme')
  const emailEnabled = watch('emailInvitesEnabled')
  const notifyEnabled = watch('notificationsEnabled')

  const onSubmit = (data: UpdatePreferencesInput) => {
    updatePreferences(data, {
      onSuccess: () => {
        addToast('success', 'Configurações salvas com sucesso!')
      },
      onError: (error: any) => {
        addToast('error', error.message)
      }
    })
  }

  const themes = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Escuro', icon: Moon },
    { id: 'system', label: 'Sistema', icon: Monitor },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-muted/20 rounded-xl border border-border/40" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Aparência */}
      <div className="bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/40 bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            Aparência
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha como o ColetivoKanban deve aparecer para você.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setValue('theme', theme.id as any)}
                className={cn(
                  'flex flex-col items-center gap-3 p-4 rounded-xl border transition-all relative overflow-hidden',
                  themeValue === theme.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/60 hover:border-border hover:bg-secondary/50'
                )}
              >
                <theme.icon className={cn('h-6 w-6 transition-colors', themeValue === theme.id ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-sm font-medium transition-colors', themeValue === theme.id ? 'text-primary' : 'text-foreground')}>
                  {theme.label}
                </span>
                {themeValue === theme.id && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Idioma e Região */}
      <div className="bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/40 bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Idioma e Região
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-muted-foreground">Idioma</label>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/20 text-sm text-muted-foreground flex justify-between items-center opacity-80">
              Português (Brasil)
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Padrão</span>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-muted-foreground">Fuso Horário</label>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/20 text-sm text-muted-foreground opacity-80">
              {preferences?.timezone || 'America/Sao_Paulo (UTC-03:00)'}
            </div>
          </div>
        </div>
      </div>

      {/* Notificações */}
      <div className="bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/40 bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between group">
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Convites por e-mail</p>
                <p className="text-xs text-muted-foreground">Receba um alerta quando for convidado para um board.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setValue('emailInvitesEnabled', !emailEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-background',
                emailEnabled ? 'bg-primary' : 'bg-input'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                emailEnabled ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between group">
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Notificações internas</p>
                <p className="text-xs text-muted-foreground">Alertas de atividades e alterações nos seus cards.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setValue('notificationsEnabled', !notifyEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-background',
                notifyEnabled ? 'bg-primary' : 'bg-input'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                notifyEnabled ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button 
          type="submit" 
          disabled={isUpdating} 
          size="lg" 
          className="px-8 shadow-lg shadow-primary/20 min-w-[180px]"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </div>
    </form>
  )
}
