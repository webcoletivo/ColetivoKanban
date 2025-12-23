'use client'

import * as React from 'react'
import { KeyRound, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

export function PasswordForm() {
  const [isLoading, setIsLoading] = React.useState(false)
  const { addToast } = useToast()
  const [showCurrent, setShowCurrent] = React.useState(false)
  const [showNew, setShowNew] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: ChangePasswordInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ocorreu um erro ao alterar a senha')
      }

      addToast('success', 'Senha alterada com sucesso!')
      reset()
    } catch (error: any) {
      addToast('error', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm mt-6">
      <div className="p-6 border-b border-border/40 bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Segurança da Conta
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Mantenha sua conta protegida alterando sua senha regularmente.
        </p>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2 relative">
            <label htmlFor="currentPassword" id="currentPasswordLabel" className="text-sm font-medium text-foreground">
              Senha atual
            </label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                {...register('currentPassword')}
                className={errors.currentPassword ? 'border-destructive pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-labelledby="currentPasswordLabel"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive mt-1">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2 relative">
              <label htmlFor="newPassword" id="newPasswordLabel" className="text-sm font-medium text-foreground">
                Nova senha
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  {...register('newPassword')}
                  className={errors.newPassword ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-labelledby="newPasswordLabel"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-destructive mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="grid gap-2 relative">
              <label htmlFor="confirmPassword" id="confirmPasswordLabel" className="text-sm font-medium text-foreground">
                Confirmar nova senha
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-labelledby="confirmPasswordLabel"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading} variant="outline" className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Alterar Senha
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
