'use client'

import * as React from 'react'
import { Modal, ModalHeader, ModalContent, ModalFooter } from './modal'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  variant?: 'danger' | 'warning' | 'primary'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  variant = 'danger'
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>{title}</ModalHeader>
      <ModalContent>
        <p className="text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </ModalContent>
      <ModalFooter>
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'destructive' : variant === 'primary' ? 'default' : 'outline'}
          onClick={onConfirm}
          isLoading={isLoading}
          className={cn(
            variant === 'danger' && 'bg-red-600 hover:bg-red-700 text-white border-none'
          )}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
