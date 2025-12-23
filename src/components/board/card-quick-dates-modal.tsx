'use client'

import * as React from 'react'
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { toLocalDateTimeString } from '@/lib/utils'

interface CardQuickDatesModalProps {
  isOpen: boolean
  onClose: () => void
  cardId: string
  currentDueAt: string | null
  onSave: (date: string | null) => void
  isLoading?: boolean
}

export function CardQuickDatesModal({
  isOpen,
  onClose,
  cardId,
  currentDueAt,
  onSave,
  isLoading
}: CardQuickDatesModalProps) {
  const [date, setDate] = React.useState(currentDueAt ? toLocalDateTimeString(currentDueAt) : '')

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>Datas</ModalHeader>
      <ModalContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Data de entrega</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <div className="flex gap-2">
          {currentDueAt && (
            <Button variant="outline" onClick={() => onSave(null)} disabled={isLoading}>
              Remover
            </Button>
          )}
          <Button 
            onClick={() => onSave(date ? new Date(date).toISOString() : null)} 
            disabled={!date && !currentDueAt}
            isLoading={isLoading}
          >
            Salvar
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
