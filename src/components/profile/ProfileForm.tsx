'use client'

import * as React from 'react'
import { Check, Loader2, User, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'

import { AvatarUpload } from './AvatarUpload'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useQueryClient } from '@tanstack/react-query'

export function PageHeader({ title, description, breadcrumbs }: { title: string, description?: string, breadcrumbs: { label: string, href?: string }[] }) {
  return (
    <div className="mb-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/home" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <ChevronRight className="h-3.5 w-3.5" />
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
      <h1 className="text-3xl font-bold text-foreground tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground mt-2">{description}</p>}
    </div>
  )
}

interface ProfileFormProps {
  initialData: {
    name: string
    email: string
    avatarUrl?: string | null
    avatarKey?: string | null
    createdAt: string
    updatedAt: string
  }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser(initialData)

  const currentUser = user || initialData

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: currentUser.name,
    },
  })

  // Update form if user data changes from query
  React.useEffect(() => {
    if (user) {
      setValue('name', user.name)
    }
  }, [user, setValue])

  const onSubmit = async (data: UpdateProfileInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ocorreu um erro ao atualizar o perfil')
      }

      addToast('success', 'Perfil atualizado com sucesso!')
      // Invalidate query to update header and other components
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    } catch (error: any) {
      addToast('error', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <AvatarUpload 
        currentAvatarUrl={currentUser.avatarUrl}
        currentAvatarKey={(currentUser as any).avatarKey}
        updatedAt={(currentUser as any).updatedAt}
        name={currentUser.name} 
      />

      <div className="bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/40 bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Informações Pessoais
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Atualize seus dados básicos.
          </p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                E-mail (não editável)
              </label>
              <Input
                id="email"
                value={currentUser.email}
                disabled
                className="bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Nome completo
              </label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ex: João Silva"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/40 p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <AlertTriangle className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h3 className="font-medium text-foreground text-sm">Conta criada em</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(currentUser.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

