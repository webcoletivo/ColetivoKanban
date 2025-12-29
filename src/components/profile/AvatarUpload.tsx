'use client'

import * as React from 'react'
import { Camera, Loader2, X, UploadCloud } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
import { cn, getAssetUrl } from '@/lib/utils'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  currentAvatarKey?: string | null
  updatedAt?: string | Date
  name: string
}

export function AvatarUpload({ currentAvatarUrl, currentAvatarKey, updatedAt, name }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const handleUpload = async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      addToast('error', 'Formato de arquivo inválido. Use JPG, PNG ou WEBP.')
      return
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      addToast('error', 'Arquivo muito grande. Máximo 5MB.')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/me/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao fazer upload da imagem')
      }

      addToast('success', 'Foto de perfil atualizada!')
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    } catch (error: any) {
      addToast('error', error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Tem certeza que deseja remover sua foto de perfil?')) return

    setIsUploading(true)
    try {
      const response = await fetch('/api/me/avatar', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao remover imagem')
      }

      addToast('success', 'Foto de perfil removida!')
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    } catch (error: any) {
      addToast('error', error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-card rounded-xl border border-border/40 shadow-sm">
      <div 
        className={cn(
          "relative group cursor-pointer transition-all duration-200",
          isDragging && "scale-105 ring-4 ring-primary/20 rounded-full"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Avatar 
          src={getAssetUrl(currentAvatarKey || currentAvatarUrl, updatedAt)} 
          name={name} 
          size="xl" 
          className="h-24 w-24 ring-4 ring-background shadow-lg"
        />
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-white" />
          )}
        </div>
        
        {isDragging && (
          <div className="absolute -inset-2 flex items-center justify-center bg-primary/10 rounded-full border-2 border-dashed border-primary animate-pulse pointer-events-none">
            <UploadCloud className="h-8 w-8 text-primary" />
          </div>
        )}
      </div>

      <div className="flex-1 text-center sm:text-left">
        <h3 className="text-lg font-semibold text-foreground">Foto do Perfil</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Clique na imagem ou arraste um arquivo para trocar. <br className="hidden sm:block" />
          JPG, PNG ou WEBP. Máximo 5MB.
        </p>
        
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded-lg"
          >
            Alterar foto
          </Button>
          
          {currentAvatarUrl && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRemove}
              disabled={isUploading}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
            >
              <X className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
          }}
        />
      </div>
    </div>
  )
}
