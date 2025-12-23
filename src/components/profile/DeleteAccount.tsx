'use client'

import * as React from 'react'
import { Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal'

export function DeleteAccount() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const { addToast } = useToast()
  const [password, setPassword] = React.useState('')
  const [confirmation, setConfirmation] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const handleDelete = async () => {
    if (confirmation !== 'EXCLUIR') return

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmation }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro ao excluir a conta')
      }

      addToast('success', 'Sua conta foi excluída com sucesso.')
      signOut({ callbackUrl: '/login' })
    } catch (err: any) {
      setError(err.message)
      addToast('error', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-destructive/5 rounded-xl border border-destructive/20 overflow-hidden shadow-sm mt-6 mb-12">
      <div className="p-6 border-b border-destructive/10 bg-destructive/10">
        <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Excluir Conta
        </h2>
        <p className="text-sm text-destructive/80 mt-1">
          Atenção: Esta ação é permanente e não pode ser desfeita.
        </p>
      </div>
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-sm text-muted-foreground">
              Ao excluir sua conta, todos os seus dados pessoais, boards (onde você é o único membro), e preferências serão removidos permanentemente.
            </p>
          </div>
          <Button 
            variant="destructive" 
            onClick={() => setIsOpen(true)}
            className="shrink-0"
          >
            Excluir minha conta
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!isLoading) {
            setIsOpen(false)
            setPassword('')
            setConfirmation('')
            setError(null)
          }
        }}
        size="md"
      >
        <ModalHeader onClose={() => setIsOpen(false)}>
          Excluir Conta Permanentemente
        </ModalHeader>
        <ModalContent className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="text-sm text-destructive">
              <p className="font-semibold">Tem certeza absoluta?</p>
              <p className="mt-1">Esta ação apagará permanentemente todos os seus dados. Se você for o único admin de um board, precisará transferir a administração antes.</p>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Sua senha</label>
            <Input
              type="password"
              placeholder="Digite sua senha atual"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">
              Confirme digitando <span className="font-bold text-destructive">EXCLUIR</span>
            </label>
            <Input
              type="text"
              placeholder="Digite EXCLUIR"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/10">
              {error}
            </p>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-2"
            onClick={handleDelete}
            disabled={isLoading || confirmation !== 'EXCLUIR' || !password}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Sim, excluir conta'
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
