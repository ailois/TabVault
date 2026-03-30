import React from "react"

import { useThemeContext } from "../../ui/theme-context"

type AppShellProps = {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function AppShell({ children, style }: AppShellProps) {
  const theme = useThemeContext()

  return (
    <div
      data-testid="app-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        backgroundColor: theme.page,
        color: theme.textPrimary,
        fontFamily: "system-ui, sans-serif",
        ...style
      }}
    >
      {children}
    </div>
  )
}
