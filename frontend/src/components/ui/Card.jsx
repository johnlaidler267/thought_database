import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

