'use client'

import * as React from 'react'
import { Upload, X, FileJson, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface ImportTrelloModalProps {
  isOpen: boolean
  onClose: () => void
}

interface TrelloPreview {
  name: string
  listCount: number
  cardCount: number
  raw: any
}

export function ImportTrelloModal({ isOpen, onClose }: ImportTrelloModalProps) {
  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<TrelloPreview | null>(null)
  const [isImporting, setIsImporting] = React.useState(false)
  const [status, setStatus] = React.useState<'idle' | 'uploading' | 'validating' | 'importing'>('idle')
  const [error, setError] = React.useState<string | null>(null)
  
  const { addToast } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const processFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Por favor, selecione um arquivo JSON exportado do Trello.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        if (!json.name || !Array.isArray(json.lists) || !Array.isArray(json.cards)) {
          throw new Error('O arquivo não parece ser um export válido do Trello.')
        }

        setPreview({
          name: json.name,
          listCount: json.lists.filter((l: any) => !l.closed).length,
          cardCount: json.cards.filter((c: any) => !c.closed).length,
          raw: json
        })
        setFile(file)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Erro ao ler arquivo JSON.')
        setFile(null)
        setPreview(null)
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!file) return

    setIsImporting(true)
    setError(null)
    setStatus('uploading')

    try {
      const formData = new FormData()
      formData.append('file', file)

      // We use a custom fetch to track "simulated" progress if needed, 
      // but for now, we just update status based on stages
      setStatus('uploading')
      
      const response = await fetch('/api/boards/import/trello', {
        method: 'POST',
        // Note: No 'Content-Type' header, fetch will set it correctly for FormData
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao importar quadro.')
      }

      setStatus('importing')
      const { boardId } = await response.json()
      
      addToast('success', 'Quadro importado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      router.push(`/boards/${boardId}`)
      onClose()
    } catch (err: any) {
      setError(err.message)
      addToast('error', err.message)
    } finally {
      setIsImporting(false)
      setStatus('idle')
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Modal isOpen={isOpen} onClose={() => !isImporting && onClose()} size="md">
      <ModalHeader onClose={onClose}>
        Importar do Trello
      </ModalHeader>
      
      <ModalContent>
        {!preview ? (
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed border-border/60 rounded-xl p-10 flex flex-col items-center justify-center gap-4 transition-all hover:bg-muted/50 hover:border-primary/40 cursor-pointer text-center",
                error && "border-red-500/50 bg-red-50/10"
              )}
            >
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <p className="text-base font-semibold">Envie o arquivo JSON do Trello</p>
                <p className="text-sm text-muted-foreground mt-1">Exportado através de: Menu {'>'} Mais {'>'} Imprimir e Exportar {'>'} Exportar como JSON</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">O que será importado:</p>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                  <li>Nomes de Listas (Colunas)</li>
                  <li>Cartões (Títulos e Descrições)</li>
                  <li>Etiquetas (Labels)</li>
                  <li>Checklists e Itens</li>
                  <li>Datas de entrega (Due dates)</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-secondary/30 rounded-xl border border-border/60 relative">
              <button 
                onClick={reset}
                className="absolute top-4 right-4 p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <FileJson className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{preview.name}</h3>
                  <p className="text-sm text-muted-foreground">Arquivo: {file?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 p-4 rounded-lg border border-border/40 text-center">
                  <p className="text-2xl font-bold text-primary">{preview.listCount}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Colunas</p>
                </div>
                <div className="bg-background/50 p-4 rounded-lg border border-border/40 text-center">
                  <p className="text-2xl font-bold text-primary">{preview.cardCount}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Cartões</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={isImporting}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleImport}
          disabled={!file || isImporting}
          className="min-w-[140px]"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {status === 'uploading' && 'Enviando arquivo...'}
              {status === 'validating' && 'Validando dados...'}
              {status === 'importing' && 'Criando quadro...'}
            </>
          ) : (
            <>
              Iniciar Importação
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
