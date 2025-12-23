'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip, Upload, X, Download, Trash2, FileText, Image, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: { id: string; name: string }
}

interface CardAttachmentsProps {
  cardId: string
  boardId: string
  attachments: Attachment[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText
  return File
}

export function CardAttachments({ cardId, boardId, attachments }: CardAttachmentsProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({})
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [attachmentToDelete, setAttachmentToDelete] = React.useState<Attachment | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/cards/${cardId}/attachments`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Erro ao fazer upload')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError: () => {
      addToast('error', 'Erro ao fazer upload do arquivo')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao excluir anexo')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      addToast('success', 'Anexo removido')
      setAttachmentToDelete(null)
    },
    onError: () => {
      addToast('error', 'Erro ao remover anexo')
    },
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    files.forEach((file) => {
      uploadMutation.mutate(file)
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      uploadMutation.mutate(file)
    })
    e.target.value = ''
  }

  const handleDownload = async (attachmentId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/attachments/${attachmentId}/download`)
      if (!res.ok) throw new Error('Erro ao baixar')
      const { url } = await res.json()
      
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
    } catch {
      addToast('error', 'Erro ao baixar arquivo')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="h-5 w-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Anexos</h3>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors mb-4',
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
        )}
      >
        <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">
          Arraste arquivos aqui ou <span className="text-blue-600">clique para selecionar</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploadMutation.isPending && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Enviando arquivo...
          </p>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.mimeType)
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group"
              >
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Icon className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.fileSize)} • {attachment.uploadedBy.name}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(attachment.id, attachment.fileName)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Baixar"
                  >
                    <Download className="h-4 w-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => setAttachmentToDelete(attachment)}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!attachmentToDelete}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={() => attachmentToDelete && deleteMutation.mutate(attachmentToDelete.id)}
        title="Remover anexo?"
        description={`Deseja remover o anexo "${attachmentToDelete?.fileName}"? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
