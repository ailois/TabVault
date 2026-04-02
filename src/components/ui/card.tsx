import React from "react"

import { cn } from "../../ui/utils/cn"

type CardProps = {
  children: React.ReactNode
  className?: string
  accent?: boolean
}

export function Card({ children, className, accent = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-5 shadow-soft",
        accent ? "border-accent-primary/30" : "border-subtle",
        className
      )}
      data-testid="ui-card"
    >
      {children}
    </div>
  )
}
