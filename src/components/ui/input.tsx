import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, id, ...props }, ref) => {
    const inputId = id || React.useId()
    
    return (
      <div className="space-y-1.5">
        {label && (
          <label 
            htmlFor={inputId}
            className={cn(
               "block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
               error ? "text-destructive" : "text-foreground"
            )}
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive font-medium animate-in slide-in-from-top-1 fade-in-0">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
