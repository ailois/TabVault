import React from "react"

import { radius } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type SectionCardProps = {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  accent?: boolean
}

export function SectionCard({ children, className, style, accent = false }: SectionCardProps) {
  const theme = useThemeContext()

  return (
    <div
      className={className}
      data-testid="section-card"
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${accent ? theme.accentSoft : theme.border}`,
        borderRadius: radius.large,
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        ...style
      }}
    >
      {children}
    </div>
  )
}
