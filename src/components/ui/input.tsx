import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  // Extending HTML input attributes
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-elegant border border-gin bg-white px-4 py-2 text-sm text-sumi shadow-elegant-sm transition-[border-color,box-shadow] duration-fast ease-elegant",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-hai",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matsu focus-visible:border-matsu",
          "hover:border-matsu-300",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-kinari",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
