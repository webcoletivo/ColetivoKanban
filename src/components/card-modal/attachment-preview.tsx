'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  Download, 
  ExternalLink, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Music, 
  File,
  Plus,
  Minus,
  Maximize,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: { id: string; name: string }
  storageKey?: string
}

interface AttachmentPreviewProps {
  isOpen: boolean
  onClose: () => void
  attachment: Attachment
  onDownload: (id: string, name: string) => void
  onDelete: (attachment: Attachment) => void
  canDelete?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentPreview({
  isOpen,
  onClose,
  attachment,
  onDownload,
  onDelete,
  canDelete = false,
}: AttachmentPreviewProps) {
  const [zoom, setZoom] = React.useState(1)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)
  const imgRef = React.useRef<HTMLImageElement>(null)

  const isImage = attachment.mimeType.startsWith('image/')
  const isPdf = attachment.mimeType === 'application/pdf'
  const isVideo = attachment.mimeType.startsWith('video/')
  const isAudio = attachment.mimeType.startsWith('audio/')
  const downloadUrl = attachment.storageKey 
    ? `/api/files/download?key=${attachment.storageKey}`
    : `/api/attachments/${attachment.id}/download`
  
  const inlineUrl = attachment.storageKey
    ? `/api/files/inline?key=${attachment.storageKey}&v=${new Date(attachment.createdAt).getTime()}`
    : `/api/attachments/${attachment.id}/inline`

  // Reset zoom and position when attachment changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, attachment.id])

  // Handle Esc key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.25, 0.5)
      if (newZoom === 1) setPosition({ x: 0, y: 0 })
      return newZoom
    })
  }
  const handleResetZoom = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 animate-in fade-in duration-200">
      {/* Top Header/Close Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-end px-6 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main Preview Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative overflow-hidden cursor-default select-none"
        onClick={(e) => e.target === containerRef.current && onClose()}
      >
        {isImage && (
          <div 
            className={cn(
              "relative transition-transform duration-200",
              isDragging ? "cursor-grabbing" : zoom > 1 ? "cursor-grab" : "cursor-default"
            )}
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imgRef}
              src={inlineUrl}
              alt={attachment.fileName}
              className="max-w-[90vw] max-h-[80vh] shadow-2xl pointer-events-none"
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
        )}

        {isPdf && (
          <div className="w-[90vw] h-[80vh] bg-white rounded-sm overflow-hidden shadow-2xl">
            <iframe
              src={`${inlineUrl}#toolbar=0`}
              className="w-full h-full border-none"
              title={attachment.fileName}
            />
          </div>
        )}

        {isVideo && (
          <div className="max-w-[90vw] max-h-[80vh] bg-black shadow-2xl rounded overflow-hidden flex items-center justify-center aspect-video">
            <video
              controls
              autoPlay
              className="max-w-full max-h-full object-contain"
              src={inlineUrl}
            >
              Seu navegador não suporta a reprodução de vídeo.
            </video>
          </div>
        )}

        {isAudio && (
          <div className="w-[500px] p-12 bg-zinc-900 rounded-xl shadow-2xl flex flex-col items-center">
            <Music className="h-20 w-20 text-blue-500 mb-8" />
            <audio controls src={inlineUrl} className="w-full">
              Seu navegador não suporta a reprodução de áudio.
            </audio>
          </div>
        )}

        {!isImage && !isPdf && !isVideo && !isAudio && (
          <div className="flex flex-col items-center justify-center p-16 bg-zinc-900/50 rounded-2xl border border-white/10 shadow-2xl text-center">
            <File className="h-24 w-24 text-white/20 mb-6" />
            <p className="text-white/90 text-lg font-medium mb-2">
              Pré-visualização indisponível
            </p>
            <p className="text-white/40 mb-8 max-w-xs">
              Este tipo de arquivo não pode ser visualizado diretamente no navegador.
            </p>
            <Button size="lg" onClick={() => onDownload(attachment.id, attachment.fileName)}>
              <Download className="h-5 w-5 mr-2" />
              Baixar Arquivo
            </Button>
          </div>
        )}

        {/* Image Controls */}
        {isImage && (
          <div className="absolute top-1/2 right-6 -translate-y-1/2 flex flex-col gap-2 bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-xl z-50">
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10" onClick={handleZoomIn}>
              <Plus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10" onClick={handleResetZoom}>
              <Maximize className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10" onClick={handleZoomOut}>
              <Minus className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Metadata & Actions Bar */}
      <div className="h-24 bg-black/80 backdrop-blur-xl border-t border-white/10 px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
            {isImage && <ImageIcon className="h-6 w-6 text-blue-400" />}
            {isPdf && <FileText className="h-6 w-6 text-red-400" />}
            {isVideo && <Film className="h-6 w-6 text-purple-400" />}
            {isAudio && <Music className="h-6 w-6 text-emerald-400" />}
            {!isImage && !isPdf && !isVideo && !isAudio && <File className="h-6 w-6 text-zinc-400" />}
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg max-w-[400px] truncate">
              {attachment.fileName}
            </h3>
            <p className="text-white/50 text-xs mt-0.5">
              Adicionado em {new Date(attachment.createdAt).toLocaleDateString()} às {new Date(attachment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {formatFileSize(attachment.fileSize)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => window.open(inlineUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir em uma nova guia
          </Button>
          <Button
            variant="secondary"
            className="bg-white/10 text-white border-white/10 hover:bg-white/20 transition-all font-medium"
            onClick={() => onDownload(attachment.id, attachment.fileName)}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => onDelete(attachment)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
