'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CardLabelPicker } from '@/components/card-modal/card-labels'

interface CardQuickLabelsPopoverProps {
  isOpen: boolean
  onClose: () => void
  anchorRect: DOMRect | null
  cardId: string
  boardId: string
  cardLabels: Array<{ id: string; name: string; color: string }>
  boardLabels: Array<{ id: string; name: string; color: string }>
}

export function CardQuickLabelsPopover({
  isOpen,
  onClose,
  anchorRect,
  cardId,
  boardId,
  cardLabels,
  boardLabels
}: CardQuickLabelsPopoverProps) {
  const [mounted, setMounted] = React.useState(false)
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
      
      const popoverWidth = 300 // Approx width of the picker
      const popoverHeight = popoverEl.offsetHeight || 400
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const gap = 8
      
      let top = 0
      let left = 0
      
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
      
      setPosition({ top, left })
    })
    
    return () => cancelAnimationFrame(frame)
  }, [isOpen, anchorRect, mounted])

  if (!isOpen || !mounted || !anchorRect) return null

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
        className="fixed z-[130] animate-in fade-in zoom-in-95 duration-200"
      >
        <CardLabelPicker
          cardId={cardId}
          boardId={boardId}
          cardLabels={cardLabels}
          boardLabels={boardLabels}
          onClose={onClose}
        />
      </div>
    </>,
    document.body
  )
}
