import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, disabled, children, ...props }, ref) => {
    // 1. Premium base styles: smooth scaling, refined focus ring, font tracking
    const baseStyles = cn(
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'active:scale-95 disabled:pointer-events-none disabled:opacity-50',
      'tracking-tight'
    )
    
    // 2. Updated variants using CSS variables
    const variants = {
      default: 'bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/25 hover:shadow-primary/40 border border-transparent',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    }
    
    // 3. Refined sizes
    const sizes = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-9 px-3 text-xs rounded-md',
      lg: 'h-11 px-8 text-base rounded-md',
      icon: 'h-10 w-10',
    }

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 animate-spin mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
