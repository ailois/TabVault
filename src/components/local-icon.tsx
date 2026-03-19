import React from "react"

import { radius } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type LocalIconProps = {
  url: string
  size?: number
}

export function LocalIcon({ url, size = 16 }: LocalIconProps) {
  const theme = useThemeContext()

  let letter = "?"
  try {
    const hostname = new URL(url).hostname
    letter = hostname.charAt(0).toUpperCase()
  } catch {
    // fallback to "?"
  }

  const iconStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: radius.small,
    backgroundColor: theme.surfaceElevated,
    color: theme.textMuted,
    fontSize: `${Math.max(9, size * 0.6)}px`,
    fontWeight: 600,
    lineHeight: 1,
    flexShrink: 0,
    userSelect: "none"
  }

  return (
    <span aria-hidden="true" data-testid="local-icon" style={iconStyle}>
      {letter}
    </span>
  )
}
