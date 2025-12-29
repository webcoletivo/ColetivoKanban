'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Trash2, Upload, Loader2, Image as ImageIcon } from 'lucide-react'
import { cn, getAssetUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const TRELLO_COLORS = [
  '#61bd4f', // green
  '#f2d600', // yellow
  '#ff9f1a', // orange
  '#eb5a46', // red
  '#c377e0', // purple
  '#0079bf', // blue
  '#00c2e0', // sky
  '#51e898', // lime
  '#ff78cb', // pink
  '#344563', // black/dark grey
]

interface CardCoverPopoverProps {
  isOpen: boolean
  onClose: () => void
  anchorRect: DOMRect | null
  cardId: string
  currentCover: {
    type: string | null
    color: string | null
    imageUrl: string | null
    imageKey?: string | null
    size: string | null
  }
  onUpdate: (data: any) => void
  onUpload: (file: File) => void
  onRemove: () => void
  isUpdating?: boolean
}

export function CardCoverPopover({
  isOpen,
  onClose,
  anchorRect,
  cardId,
  currentCover,
  onUpdate,
  onUpload,
  onRemove,
  isUpdating = false
}: CardCoverPopoverProps) {
  const [mounted, setMounted] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Close on scroll to maintain anchor integrity
  React.useEffect(() => {
    if (isOpen) {
      const handleScroll = () => {
        onClose()
      }
      // Listen on window and use capture to catch all scroll events (modal or board)
      window.addEventListener('scroll', handleScroll, { capture: true, passive: true })
      return () => window.removeEventListener('scroll', handleScroll, { capture: true })
    }
  }, [isOpen, onClose])

  // Calculate position when popover opens or anchor changes
  React.useEffect(() => {
    if (!isOpen || !anchorRect || !mounted) return
    
    // Use requestAnimationFrame to ensure DOM is ready
    const frame = requestAnimationFrame(() => {
      const popoverEl = popoverRef.current
      if (!popoverEl) return
      
      const popoverWidth = 304
      // Measure actual height, fallback to estimate
      const popoverHeight = popoverEl.offsetHeight || 450
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const gap = 8
      
      let top = 0
      let left = 0
      
      // For cards (context menu anchor), always use SIDE positioning
      // Check if this is a large anchor (card) vs small anchor (button)
      const isCardAnchor = anchorRect.height > 50
      
      if (isCardAnchor) {
        // === SIDE POSITIONING (Trello-like for cards) ===
        // 1. Try positioning to the RIGHT of the card
        left = anchorRect.right + gap
        top = anchorRect.top
        
        // 2. If doesn't fit on right, flip to LEFT
        if (left + popoverWidth > viewportWidth - gap) {
          left = anchorRect.left - popoverWidth - gap
        }
        
        // 3. Clamp LEFT to stay in viewport
        if (left < gap) {
          left = gap
        }
        
        // 4. Clamp TOP to stay in viewport
        if (top + popoverHeight > viewportHeight - gap) {
          top = viewportHeight - popoverHeight - gap
        }
        if (top < gap) {
          top = gap
        }
      } else {
        // === BOTTOM POSITIONING (for small button anchors) ===
        top = anchorRect.bottom + gap
        left = anchorRect.left
        
        // Flip to top if no space at bottom
        if (top + popoverHeight > viewportHeight - gap) {
          top = anchorRect.top - popoverHeight - gap
        }
        
        // Clamp horizontally
        if (left + popoverWidth > viewportWidth - gap) {
          left = viewportWidth - popoverWidth - gap
        }
        if (left < gap) {
          left = gap
        }
        
        // Clamp vertically
        if (top < gap) {
          top = gap
        }
      }
      
      setPosition({ top, left })
    })
    
    return () => cancelAnimationFrame(frame)
  }, [isOpen, anchorRect, mounted])

  if (!isOpen || !mounted || !anchorRect) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  return createPortal(
    <>
      {/* Backdrop for click outside */}
      <div 
        className="fixed inset-0 z-[120]" 
        onClick={onClose} 
      />

      <div
        ref={popoverRef}
        style={{ top: position.top, left: position.left }}
        className="fixed w-[304px] bg-popover border border-border rounded-lg shadow-xl z-[130] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
          <span className="text-sm font-semibold text-muted-foreground">Capa</span>
          <button 
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[450px]">
          {/* Size Section */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Tamanho</h4>
            <div className="grid grid-cols-2 gap-2">
              {/* Strip Size */}
              <button
                onClick={() => onUpdate({ coverType: currentCover.type || 'none', coverSize: 'strip' })}
                disabled={!currentCover.type || currentCover.type === 'none'}
                className={cn(
                  "relative h-16 rounded border-2 transition-all overflow-hidden bg-muted/30 hover:border-primary/50",
                  currentCover.size === 'strip' ? "border-primary shadow-sm" : "border-transparent",
                  (!currentCover.type || currentCover.type === 'none') && "opacity-50 cursor-not-allowed"
                )}
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-4" 
                  style={{ 
                    backgroundColor: currentCover.type === 'color' ? currentCover.color || '#dfe1e6' : '#dfe1e6',
                    backgroundImage: currentCover.type === 'image' ? `url(${getAssetUrl(currentCover.imageKey || currentCover.imageUrl)})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="absolute top-6 left-2 right-2 space-y-1">
                  <div className="h-1.5 w-full bg-border rounded-full" />
                  <div className="h-1.5 w-2/3 bg-border rounded-full" />
                </div>
                {currentCover.size === 'strip' && currentCover.type !== 'none' && (
                  <div className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-0.5">
                    <Check className="h-2 w-2" />
                  </div>
                )}
              </button>

              {/* Full Size */}
              <button
                onClick={() => onUpdate({ coverType: currentCover.type || 'none', coverSize: 'full' })}
                disabled={!currentCover.type || currentCover.type === 'none'}
                className={cn(
                  "relative h-16 rounded border-2 transition-all overflow-hidden bg-muted/30 hover:border-primary/50",
                  currentCover.size === 'full' ? "border-primary shadow-sm" : "border-transparent",
                  (!currentCover.type || currentCover.type === 'none') && "opacity-50 cursor-not-allowed"
                )}
              >
                <div 
                  className="absolute inset-0" 
                  style={{ 
                    backgroundColor: currentCover.type === 'color' ? currentCover.color || '#dfe1e6' : '#dfe1e6',
                    backgroundImage: currentCover.type === 'image' ? `url(${getAssetUrl(currentCover.imageKey || currentCover.imageUrl)})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.8
                  }}
                />
                <div className="absolute bottom-2 left-2 right-2 space-y-1 z-10">
                  <div className="h-1.5 w-full bg-white/80 rounded-full" />
                  <div className="h-1.5 w-2/3 bg-white/80 rounded-full" />
                </div>
                {currentCover.size === 'full' && currentCover.type !== 'none' && (
                  <div className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-0.5 z-20">
                    <Check className="h-2 w-2" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Remove Cover */}
          {currentCover.type && currentCover.type !== 'none' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs font-medium"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Remover capa
            </Button>
          )}

          {/* Colors Section */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Cores</h4>
            <div className="grid grid-cols-5 gap-2">
              {TRELLO_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => onUpdate({ coverType: 'color', coverColor: color, coverImageUrl: null })}
                  className={cn(
                    "h-8 rounded transition-all hover:opacity-80 flex items-center justify-center",
                    currentCover.type === 'color' && currentCover.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-popover" : ""
                  )}
                  style={{ backgroundColor: color }}
                >
                  {currentCover.type === 'color' && currentCover.color === color && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Attachments / Upload Section */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Anexos</h4>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
              Carregar uma imagem de capa
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
