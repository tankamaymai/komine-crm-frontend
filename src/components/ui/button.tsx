import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-[transform,background-color,box-shadow,color,border-color] duration-fast ease-elegant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matsu focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-matsu text-white shadow-elegant hover:bg-matsu-light hover:shadow-elegant-lg",
        destructive:
          "bg-beni text-white shadow-elegant hover:bg-beni-light hover:shadow-elegant-lg",
        outline:
          "border-2 border-gin bg-white text-sumi shadow-elegant-sm hover:border-matsu hover:bg-matsu-50 hover:text-matsu hover:shadow-elegant",
        secondary:
          "bg-kinari text-sumi border border-gin shadow-elegant-sm hover:bg-cha-50 hover:border-cha hover:shadow-elegant",
        ghost:
          "text-sumi hover:bg-kinari hover:text-matsu",
        link:
          "text-matsu underline-offset-4 hover:underline hover:text-matsu-light",
        matsu:
          "bg-matsu text-white shadow-matsu hover:bg-matsu-light hover:shadow-elegant-lg",
        cha:
          "bg-cha text-white shadow-cha hover:bg-cha-light hover:shadow-elegant-lg",
        ai:
          "bg-ai text-white shadow-elegant hover:bg-ai-light hover:shadow-elegant-lg",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-lg font-semibold",
        icon: "h-10 w-10",
        senior: "h-12 min-w-[120px] px-6 py-3 text-base font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
