import React from "react"

import { radius } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export function IconButton({ style, children, type = "button", ...props }: IconButtonProps) {
  const theme = useThemeContext()

  return (
    <button
      {...props}
      type={type}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: theme.textMuted,
        padding: "4px",
        borderRadius: radius.small,
        lineHeight: 1,
        transition: "color 0.15s ease",
        ...style
      }}
    >
      {children}
    </button>
  )
}
