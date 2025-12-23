'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, X, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

const icons = {
  success: Check,
  error: X,
  warning: AlertCircle,
  info: Info,
}

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
}

const iconStyles = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = icons[toast.type]

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg min-w-[300px] max-w-[400px]',
        'animate-in slide-in-from-right-full duration-300',
        styles[toast.type]
      )}
    >
      <div className={cn('p-1 rounded-full text-white', iconStyles[toast.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
