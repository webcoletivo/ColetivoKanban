'use client'

import * as React from 'react'
import { 
  ExternalLink, 
  Tag, 
  Clock, 
  Image as ImageIcon, 
  ArrowRight, 
  Copy, 
  Archive, 
  Trash2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CardContextMenuProps {
  anchorRect: DOMRect
  onClose: () => void
  onAction: (action: string) => void
  permissions?: {
    canDelete?: boolean
    canArchive?: boolean
  }
}

export function CardContextMenu({ anchorRect, onClose, onAction, permissions }: CardContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  React.useLayoutEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const offset = 8

      let top = anchorRect.top
      let left = anchorRect.right + offset

      // Collision detection - Right
      if (left + menuRect.width > viewportWidth) {
        left = anchorRect.left - menuRect.width - offset
      }

      // Collision detection - Bottom
      if (top + menuRect.height > viewportHeight) {
        top = viewportHeight - menuRect.height - offset
      }

      // Ensure it doesn't go off top or left
      top = Math.max(offset, top)
      left = Math.max(offset, left)

      setPosition({ top, left })
    }
  }, [anchorRect])

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const actions = [
    { id: 'open', label: 'Abrir cartão', icon: ExternalLink },
    { id: 'labels', label: 'Editar etiquetas', icon: Tag },
    { id: 'dates', label: 'Editar datas', icon: Clock },
    { id: 'cover', label: 'Alterar capa', icon: ImageIcon },
    { id: 'move', label: 'Mover', icon: ArrowRight },
    { id: 'copy', label: 'Copiar', icon: Copy },
    { id: 'archive', label: 'Arquivar', icon: Archive, danger: false, disabled: permissions?.canArchive === false },
    { id: 'delete', label: 'Excluir', icon: Trash2, danger: true, disabled: permissions?.canDelete === false },
  ]

  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.top,
    left: position.left,
    zIndex: 100,
    visibility: position.top === 0 ? 'hidden' : 'visible'
  }

  return (
    <div 
      ref={menuRef}
      style={style}
      onClick={(e) => e.stopPropagation()}
      className="w-48 bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/40 mb-1">
        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Ações</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      </div>

      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            disabled={action.disabled}
            onClick={() => {
              onAction(action.id)
              onClose()
            }}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors disabled:opacity-50",
              action.danger 
                ? "text-destructive hover:bg-destructive/10" 
                : "text-foreground hover:bg-secondary/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
