'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  wrapperClassName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className, 
  wrapperClassName,
  size = 'md' 
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false)

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw] max-h-[90vh]',
  }

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className={cn("fixed inset-0 z-[100] flex items-center justify-center p-4", wrapperClassName)}>
      {/* Backdrop with premium blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in-0"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div
        className={cn(
          'relative w-full bg-background border border-border rounded-xl shadow-2xl overflow-hidden',
          'flex flex-col gap-0 duration-300 animate-in zoom-in-95 fade-in-0 slide-in-from-bottom-2',
          'max-h-[90vh] z-[110]',
          sizes[size],
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

interface ModalHeaderProps {
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

export function ModalHeader({ children, onClose, className }: ModalHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between p-6 border-b border-border/40', className)}>
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

interface ModalContentProps {
  children: React.ReactNode
  className?: string
}

export function ModalContent({ children, className }: ModalContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6 border-t border-border/40 bg-muted/20 rounded-b-xl', className)}>
      {children}
    </div>
  )
}
