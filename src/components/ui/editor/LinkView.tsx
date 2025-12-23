'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { createPortal } from 'react-dom'
import { 
  ExternalLink, 
  Copy, 
  Type, 
  Layout, 
  Youtube, 
  Trash2, 
  Link2, 
  Link2Off,
  X,
  Settings2,
  Play
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

type DisplayMode = 'url' | 'inline' | 'card' | 'embed'

interface LinkMetadata {
  title?: string
  icon?: string
  image?: string
  provider?: string
  description?: string
}

// Extract YouTube video ID from URL - supports all YouTube URL formats
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null
  
  try {
    const urlObj = new URL(url)
    
    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v')
    }
    
    // youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('/')[0]
    }
    
    // youtube.com/embed/VIDEO_ID or youtube.com/shorts/VIDEO_ID or youtube.com/v/VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      const pathParts = urlObj.pathname.split('/')
      if (pathParts.includes('embed') || pathParts.includes('shorts') || pathParts.includes('v')) {
        const idx = Math.max(
          pathParts.indexOf('embed'),
          pathParts.indexOf('shorts'),
          pathParts.indexOf('v')
        )
        if (pathParts[idx + 1]) {
          return pathParts[idx + 1].split('?')[0]
        }
      }
    }
  } catch {
    // Fallback to regex if URL parsing fails
    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /embed\/([a-zA-Z0-9_-]{11})/,
      /shorts\/([a-zA-Z0-9_-]{11})/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
  }
  
  return null
}

// Hover Control Button
function LinkHoverControl({
  anchorRect,
  onClick,
}: {
  anchorRect: DOMRect
  onClick: () => void
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const padding = 4
    let top = anchorRect.top - 28
    let left = anchorRect.right + padding
    
    if (left + 28 > window.innerWidth) {
      left = anchorRect.left
    }
    
    if (top < 0) {
      top = anchorRect.bottom + padding
    }
    
    setPosition({ top, left })
  }, [anchorRect])

  return createPortal(
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 99999,
      }}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded",
        "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700",
        "shadow-lg border border-slate-600",
        "animate-in fade-in zoom-in-95 duration-100",
        "transition-colors cursor-pointer"
      )}
      title="Configurar link"
    >
      <Settings2 className="h-4 w-4" />
    </button>,
    document.body
  )
}

// Horizontal Link Backdrop Toolbar
function LinkBackdrop({
  href,
  displayMode,
  isYouTube,
  anchorRect,
  onChangeMode,
  onEdit,
  onOpenNewTab,
  onCopy,
  onRemoveLink,
  onRemoveAll,
  onClose,
}: {
  href: string
  displayMode: DisplayMode
  isYouTube: boolean
  anchorRect: DOMRect
  onChangeMode: (mode: DisplayMode) => void
  onEdit: () => void
  onOpenNewTab: () => void
  onCopy: () => void
  onRemoveLink: () => void
  onRemoveAll: () => void
  onClose: () => void
}) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!backdropRef.current) return

    const backdropRect = backdropRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const padding = 8

    let top: number
    let left: number

    const spaceBelow = viewportHeight - anchorRect.bottom

    if (spaceBelow >= backdropRect.height + padding) {
      top = anchorRect.bottom + padding
    } else {
      top = anchorRect.top - backdropRect.height - padding
    }

    left = anchorRect.left
    
    if (left < padding) {
      left = padding
    } else if (left + backdropRect.width > viewportWidth - padding) {
      left = viewportWidth - backdropRect.width - padding
    }

    setPosition({ top, left })
  }, [anchorRect])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (backdropRef.current && !backdropRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 50)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={backdropRef}
      style={{ 
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 99999,
      }}
      className={cn(
        "flex items-center gap-0.5 px-1.5 py-1 bg-slate-800 rounded-lg shadow-2xl border border-slate-700",
        "animate-in fade-in zoom-in-95 duration-150"
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-600">
        <button
          onClick={() => onChangeMode('url')}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "p-1.5 rounded transition-all",
            displayMode === 'url' 
              ? "bg-blue-600 text-white" 
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          )}
          title="URL"
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onChangeMode('inline')}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "p-1.5 rounded transition-all",
            displayMode === 'inline' 
              ? "bg-blue-600 text-white" 
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          )}
          title="Em linha"
        >
          <Type className="h-4 w-4" />
        </button>
        <button
          onClick={() => onChangeMode('card')}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "p-1.5 rounded transition-all",
            displayMode === 'card' 
              ? "bg-blue-600 text-white" 
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          )}
          title="Cartão"
        >
          <Layout className="h-4 w-4" />
        </button>
        <button
          onClick={() => onChangeMode('embed')}
          onMouseDown={(e) => e.preventDefault()}
          disabled={!isYouTube}
          className={cn(
            "p-1.5 rounded transition-all",
            displayMode === 'embed' 
              ? "bg-blue-600 text-white" 
              : isYouTube
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-slate-600 cursor-not-allowed"
          )}
          title={isYouTube ? "Integrar" : "Integrar (apenas YouTube)"}
        >
          <Youtube className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={onEdit}
        onMouseDown={(e) => e.preventDefault()}
        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-all"
      >
        Editar link
      </button>

      <div className="w-px h-5 bg-slate-600 mx-1" />

      <button
        onClick={onOpenNewTab}
        onMouseDown={(e) => e.preventDefault()}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
        title="Abrir em nova guia"
      >
        <ExternalLink className="h-4 w-4" />
      </button>
      <button
        onClick={onCopy}
        onMouseDown={(e) => e.preventDefault()}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
        title="Copiar URL"
      >
        <Copy className="h-4 w-4" />
      </button>
      <button
        onClick={onRemoveLink}
        onMouseDown={(e) => e.preventDefault()}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
        title="Remover link (manter texto)"
      >
        <Link2Off className="h-4 w-4" />
      </button>
      <button
        onClick={onRemoveAll}
        onMouseDown={(e) => e.preventDefault()}
        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-all"
        title="Remover"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>,
    document.body
  )
}

// Edit Link Popover
function EditLinkPopover({
  href,
  anchorRect,
  onSave,
  onClose,
}: {
  href: string
  anchorRect: DOMRect
  onSave: (newUrl: string) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState(href)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    if (!popoverRef.current) return

    const popoverRect = popoverRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const padding = 8

    const top = anchorRect.bottom + padding
    let left = anchorRect.left

    if (left + popoverRect.width > viewportWidth - padding) {
      left = viewportWidth - popoverRect.width - padding
    }

    setPosition({ top, left })
  }, [anchorRect])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      onClose()
      return
    }

    let finalUrl = url.trim()
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl
    }

    try {
      new URL(finalUrl)
      onSave(finalUrl)
    } catch {
      onClose()
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[99998]" onClick={onClose} />
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 99999,
        }}
        className="animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <form 
          onSubmit={handleSubmit}
          className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg shadow-2xl border border-slate-700"
        >
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cole ou digite a URL..."
            className="px-3 py-1.5 text-sm bg-slate-900 text-white border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>,
    document.body
  )
}

// ============================================
// DISPLAY MODE COMPONENTS (Kanban-like)
// ============================================

// URL Mode - Simple blue link text
function UrlModeDisplay({ href }: { href: string }) {
  return (
    <span className="text-blue-500 hover:underline cursor-pointer break-all">
      {href}
    </span>
  )
}

// Inline Mode - Compact enriched link badge (Kanban-like)
function InlineModeDisplay({ 
  href, 
  title, 
  isYouTube 
}: { 
  href: string
  title?: string
  isYouTube: boolean
}) {
  const displayTitle = title || href

  return (
    <span className="inline-flex items-start gap-1.5 py-1 px-2 my-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-200 align-middle max-w-full">
      {isYouTube && (
        <span className="flex-shrink-0 mt-0.5">
          <Youtube className="h-4 w-4 text-red-500" />
        </span>
      )}
      <span className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors leading-snug break-words">
        {displayTitle}
      </span>
    </span>
  )
}

// Card Mode - Rich preview card (Kanban-like)
// Card Mode - Rich preview card (Kanban-like)
function CardModeDisplay({ 
  href, 
  title, 
  description, 
  thumbnail,
  videoId,
  isYouTube,
  isEditing,
  onOpenLink,
}: { 
  href: string
  title?: string
  description?: string
  thumbnail?: string
  videoId: string | null
  isYouTube: boolean
  isEditing: boolean
  onOpenLink: () => void
}) {
  const displayTitle = title || href
  
  // Logic for thumbnail:
  // 1. Use provided thumbnail (from metadata/backend) if available
  // 2. If YouTube, try constructing maxresdefault (or hqdefault fallback via onError logic in img)
  // 3. Fallback to null
  const ytThumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null
  const displayThumbnail = thumbnail || ytThumbnail

  const handleTitleClick = (e: React.MouseEvent) => {
    if (!isEditing) {
      e.preventDefault() // LinkView parent might catch this?
      e.stopPropagation()
      onOpenLink()
    }
  }

  // Fallback image handler
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget
    if (videoId && img.src.includes('maxresdefault')) {
      img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    } else {
      img.style.display = 'none' // Hide if all fail
    }
  }

  return (
    <div className="my-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden max-w-[400px] shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex flex-col">
        {/* Thumbnail (Top for Trello card style, or Side? Trello usually does top for rich cards or side for small links. Let's do Trello-style 100% width if big, or side. 
           Wait, Trello link cards usually put image on the side if it's small, or full width. 
           User request: "Thumbnail (obrigatória)... object-fit: cover... container com tamanho fixo".
           Let's stick to the side/horizontal layout as it's more compact for lists, or consistent with existing code if possible.
           Refactoring to side layout as per previous code but fixing size.
        */}
        <div className="flex h-[100px]">
          {displayThumbnail && (
            <div 
              className="w-[120px] h-full flex-shrink-0 relative bg-black cursor-pointer overflow-hidden border-r border-slate-200 dark:border-slate-700 flex items-center justify-center"
              onClick={!isEditing ? handleTitleClick : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={displayThumbnail}
                alt={displayTitle}
                onError={handleImageError}
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
              />
              {isYouTube && !isEditing && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                    </div>
                 </div>
              )}
            </div>
          )}
          
          <div className="flex-1 p-3 flex flex-col min-w-0 justify-between">
            <div className="flex flex-col gap-1">
              <span 
                onClick={handleTitleClick}
                className={cn(
                  "text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2",
                  !isEditing && "hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer hover:underline decoration-2 underline-offset-2"
                )}
                title={displayTitle}
              >
                {displayTitle}
              </span>
              
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              {isYouTube ? (
                <div className="flex items-center gap-1">
                   <Youtube className="h-3 w-3 text-[#FF0000]" />
                   <span className="text-[10px] text-slate-500 font-medium">YOUTUBE.COM</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Link2 className="h-3 w-3 text-slate-400" />
                  <span className="text-[10px] text-slate-500 uppercase font-medium truncate max-w-[150px]">
                     {(() => { try { return new URL(href).hostname.replace('www.', '') } catch { return 'LINK' } })()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Embed Mode - Real YouTube player via official iframe (Kanban-like)
// Embed Mode - Real YouTube player via official iframe (Kanban-like)
function EmbedModeDisplay({ 
  href, 
  title,
  videoId,
  isEditing,
  onOpenConfig,
}: { 
  href: string
  title?: string
  videoId: string
  isEditing: boolean
  onOpenConfig: () => void
}) {
  const handleClick = (e: React.MouseEvent) => {
    // Only intercept clicks in edit mode to prevent iframe interaction
    // In read mode, the overlay is hidden via CSS/conditional rendering so iframe takes events
    if (isEditing) {
      e.preventDefault()
      e.stopPropagation()
      onOpenConfig()
    }
  }

  // Use official youtube.com/embed with modest branding
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`
  // We use hqdefault for the placeholder as maxresdefault isn't always available without api check
  const placeholderUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

  return (
    <div 
      className={cn(
        "my-3 rounded-lg overflow-hidden max-w-[600px] shadow-lg border border-slate-200 dark:border-slate-800 bg-black",
        isEditing ? "cursor-pointer ring-offset-2 hover:ring-2 hover:ring-blue-500/50" : ""
      )}
      onClick={isEditing ? handleClick : undefined}
    >
      {/* Video container - 16:9 Aspect Ratio */}
      <div className="relative w-full pb-[56.25%] bg-black">
        {isEditing ? (
          // In EDIT MODE: Show static image overlay to prevent interaction
          <div className="absolute inset-0 flex flex-col items-center justify-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={placeholderUrl}
              alt={title || 'Video Preview'}
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
            />
             <div className="z-10 bg-black/50 backdrop-blur-sm p-3 rounded-full mb-2 group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300">
               <Settings2 className="h-6 w-6 text-white" />
             </div>
             <span className="z-10 text-xs font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
               Editar visualização
             </span>
          </div>
        ) : (
          // In READ MODE: Canonical IFRAME without overlays
          <iframe
            src={embedUrl}
            title={title || 'YouTube Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
          />
        )}
      </div>
      
      {/* Minimal Footer for Embed Mode */}
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden">
           <Youtube className="h-4 w-4 text-[#FF0000] flex-shrink-0" />
           <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={title || href}>
             {title || 'YouTube Video'}
           </span>
        </div>
        {isEditing && (
           <span className="text-[10px] uppercase font-bold text-slate-400">Preview</span>
        )}
      </div>
    </div>
  )
}

// ============================================
// MAIN LINKVIEW COMPONENT
// ============================================

const LinkView: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, deleteNode, editor, getPos, selected } = props
  const { href, displayMode = 'url', title, thumbnail, icon, description } = node.attrs
  
  const [isHovered, setIsHovered] = useState(false)
  const [showBackdrop, setShowBackdrop] = useState(false)
  const [showEditPopover, setShowEditPopover] = useState(false)
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  
  const linkRef = useRef<HTMLSpanElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const toastContext = useToast()

  const isYouTube = href?.includes('youtube.com') || href?.includes('youtu.be')
  const videoId = isYouTube ? getYouTubeVideoId(href) : null
  const isEditing = editor.isEditable

  // Fetch metadata for rich display modes
  useEffect(() => {
    if ((displayMode === 'card' || displayMode === 'inline' || displayMode === 'embed') && !title && href) {
      fetchMetadata()
    }
  }, [href, displayMode, title])

  const fetchMetadata = async () => {
    if (isLoading || !href) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
      if (res.ok) {
        const data = await res.json()
        setMetadata(data)
        updateAttributes({
          title: data.title || null,
          icon: data.icon || null,
          thumbnail: data.image || null,
          description: data.description || null,
        })
      }
    } catch (e) {
      console.error('Failed to fetch link metadata:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const updateAnchorRect = useCallback(() => {
    if (linkRef.current) {
      setAnchorRect(linkRef.current.getBoundingClientRect())
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (!isEditing) return
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    
    updateAnchorRect()
    setIsHovered(true)
  }, [isEditing, updateAnchorRect])

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (!showBackdrop) {
        setIsHovered(false)
      }
    }, 200)
  }, [showBackdrop])

  const handleControlClick = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    updateAnchorRect()
    setShowBackdrop(true)
    setIsHovered(false)
  }, [updateAnchorRect])

  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    if (!isEditing) {
      if (displayMode === 'url' || displayMode === 'inline') {
        e.preventDefault()
        window.open(href, '_blank', 'noopener,noreferrer')
      }
      return
    }

    e.preventDefault()
    e.stopPropagation()
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    updateAnchorRect()
    setShowBackdrop(true)
    setIsHovered(false)
  }, [isEditing, href, displayMode, updateAnchorRect])

  const handleOpenLink = useCallback(() => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }, [href])

  const handleChangeMode = useCallback((mode: DisplayMode) => {
    updateAttributes({ displayMode: mode })
  }, [updateAttributes])

  const handleEdit = useCallback(() => {
    setShowBackdrop(false)
    updateAnchorRect()
    setShowEditPopover(true)
  }, [updateAnchorRect])

  const handleSaveEdit = useCallback((newUrl: string) => {
    updateAttributes({ href: newUrl, title: null, icon: null, thumbnail: null })
    setShowEditPopover(false)
    setMetadata(null)
  }, [updateAttributes])

  const handleOpenNewTab = useCallback(() => {
    window.open(href, '_blank', 'noopener,noreferrer')
    setShowBackdrop(false)
  }, [href])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(href)
    if (toastContext?.addToast) {
      toastContext.addToast('success', 'Link copiado!')
    }
    setShowBackdrop(false)
  }, [href, toastContext])

  const handleRemoveLink = useCallback(() => {
    if (typeof getPos === 'function') {
      const pos = getPos()
      if (typeof pos === 'number') {
        editor.chain()
          .focus()
          .insertContentAt({ from: pos, to: pos + node.nodeSize }, href)
          .run()
      }
    }
    setShowBackdrop(false)
  }, [editor, getPos, node.nodeSize, href])

  const handleRemoveAll = useCallback(() => {
    deleteNode()
    setShowBackdrop(false)
  }, [deleteNode])

  const handleCloseBackdrop = useCallback(() => {
    setShowBackdrop(false)
    setIsHovered(false)
  }, [])

  const handleCloseEditPopover = useCallback(() => {
    setShowEditPopover(false)
  }, [])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Get display data
  const displayTitle = title || metadata?.title
  const displayDescription = metadata?.description

  // Render content based on display mode
  const renderContent = () => {
    switch (displayMode) {
      case 'inline':
        return (
          <InlineModeDisplay 
            href={href} 
            title={displayTitle} 
            isYouTube={isYouTube} 
          />
        )
      case 'card':
        return (
          <CardModeDisplay 
            href={href}
            title={displayTitle}
            description={displayDescription}
            videoId={videoId}
            isYouTube={isYouTube}
            isEditing={isEditing}
            onOpenLink={handleOpenLink}
          />
        )
      case 'embed':
        if (isYouTube && videoId) {
          return (
            <EmbedModeDisplay 
              href={href}
              title={displayTitle}
              videoId={videoId}
              isEditing={isEditing}
              onOpenConfig={handleControlClick}
            />
          )
        }
        return <UrlModeDisplay href={href} />
      case 'url':
      default:
        return <UrlModeDisplay href={href} />
    }
  }

  const isBlockMode = displayMode === 'card' || displayMode === 'embed'

  return (
    <NodeViewWrapper as="span" className={isBlockMode ? 'block' : 'inline'}>
      <span
        ref={linkRef}
        onClick={handleLinkClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "cursor-pointer relative",
          isBlockMode ? "block" : "inline",
          (showBackdrop || selected) && "ring-2 ring-blue-500 ring-offset-2 ring-offset-background rounded",
          isEditing && isHovered && !showBackdrop && "ring-1 ring-blue-400/50 rounded"
        )}
        data-kanban-link="true"
        data-href={href}
      >
        {renderContent()}
      </span>

      {isHovered && !showBackdrop && !showEditPopover && anchorRect && isEditing && (
        <LinkHoverControl
          anchorRect={anchorRect}
          onClick={handleControlClick}
        />
      )}

      {showBackdrop && anchorRect && isEditing && (
        <LinkBackdrop
          href={href}
          displayMode={displayMode}
          isYouTube={isYouTube}
          anchorRect={anchorRect}
          onChangeMode={handleChangeMode}
          onEdit={handleEdit}
          onOpenNewTab={handleOpenNewTab}
          onCopy={handleCopy}
          onRemoveLink={handleRemoveLink}
          onRemoveAll={handleRemoveAll}
          onClose={handleCloseBackdrop}
        />
      )}

      {showEditPopover && anchorRect && (
        <EditLinkPopover
          href={href}
          anchorRect={anchorRect}
          onSave={handleSaveEdit}
          onClose={handleCloseEditPopover}
        />
      )}
    </NodeViewWrapper>
  )
}

export default LinkView
