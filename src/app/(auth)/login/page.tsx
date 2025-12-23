'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Mail, Lock, LogIn } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/home'
  
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('E-mail ou senha incorretos')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Bem-vindo de volta!</CardTitle>
        <CardDescription>Entre na sua conta para continuar</CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {error}
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            <LogIn className="h-5 w-5" />
            Entrar
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          Não tem uma conta?{' '}
          <Link 
            href="/signup" 
            className="font-medium text-primary hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center p-8">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
