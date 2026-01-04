import { cn } from '../../lib/utils'

export function Button({ 
  className, 
  variant = 'outline', 
  size = 'default',
  children, 
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-serif text-sm transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50"
  
  const variants = {
    outline: "border bg-transparent hover:bg-muted",
    default: "bg-ink text-paper hover:bg-opacity-90",
  }
  
  const sizes = {
    default: "h-10 px-4 py-2",
    icon: "h-10 w-10",
    sm: "h-9 px-3",
    lg: "h-11 px-8",
  }

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      style={{
        borderColor: variant === 'outline' ? 'var(--stroke)' : 'transparent',
        color: variant === 'outline' ? 'var(--ink)' : 'var(--paper)',
        backgroundColor: variant === 'outline' ? 'transparent' : 'var(--ink)',
      }}
      onMouseEnter={(e) => {
        if (variant === 'outline') {
          e.currentTarget.style.backgroundColor = 'var(--muted)'
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'outline') {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

