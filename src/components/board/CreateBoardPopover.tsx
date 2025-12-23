'use client'

import * as React from 'react'
import { Plus, Import, Layout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CreateBoardPopoverProps {
  onCreateClick: () => void
  onImportClick: () => void
}

export function CreateBoardPopover({ onCreateClick, onImportClick }: CreateBoardPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <Button onClick={() => setIsOpen(!isOpen)} className="shadow-sm">
        <Plus className="h-5 w-5 mr-1" />
        Novo Board
      </Button>

      {isOpen && (
        <>
          {/* Overlay to catch clicks on mobile or just and extra layer of safety */}
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 top-full mt-2 w-72 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/60 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
             <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
                <h3 className="text-sm font-semibold">Criar board</h3>
             </div>
             
             <div className="p-2 space-y-1">
                <button 
                  onClick={() => { setIsOpen(false); onCreateClick() }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/60 transition-colors text-left group"
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Layout className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Criar do zero</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Comece com um quadro em branco e organize como preferir.</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setIsOpen(false); onImportClick() }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/60 transition-colors text-left group"
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                    <Import className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Importar da Trello</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Traga seu arquivo JSON do Trello e crie o board automaticamente.</p>
                  </div>
                </button>
             </div>
             
             <div className="p-3 bg-muted/20 border-t border-border/40">
                <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider font-semibold">
                    ColetivoKanban Importer v1.0
                </p>
             </div>
          </div>
        </>
      )}
    </div>
  )
}
