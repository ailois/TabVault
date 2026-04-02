import React from "react"

import { cn } from "../../ui/utils/cn"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
}

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        variant === "primary" && "bg-accent-primary text-white hover:bg-accent-hover",
        variant === "secondary" && "border border-subtle bg-surface text-primary hover:bg-base",
        variant === "ghost" && "bg-transparent text-secondary hover:bg-base hover:text-primary",
        variant === "danger" && "border border-red-200 bg-white text-red-600 hover:bg-red-50",
        className
      )}
      type={type}
      {...props}
    />
  )
}
