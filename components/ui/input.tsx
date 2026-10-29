import * as React from "react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

// '-' and '+' would allow negative/signed values, 'e' allows exponents ("1e-5").
const BLOCKED_NUMBER_KEYS = ["-", "+", "e", "E"]

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", onKeyDown, onWheel, ...props }, ref) => (
    <input
      ref={ref}
      {...(props.type === "number" ? { min: 0 } : {})}
      onKeyDown={(e) => {
        if (props.type === "number" && BLOCKED_NUMBER_KEYS.includes(e.key)) e.preventDefault()
        onKeyDown?.(e)
      }}
      onWheel={(e) => {
        if (props.type === "number") e.currentTarget.blur()
        onWheel?.(e)
      }}
      className={`flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
