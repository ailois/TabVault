import React from "react"

import { radius } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type SearchInputProps = React.InputHTMLAttributes<HTMLInputElement>

export function SearchInput({ style, ...props }: SearchInputProps) {
  const theme = useThemeContext()

  return (
    <input
      {...props}
      type={props.type ?? "search"}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 12px",
        border: `1px solid ${theme.border}`,
        borderRadius: radius.medium,
        backgroundColor: theme.surface,
        color: theme.textPrimary,
        fontSize: "0.875rem",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        ...style
      }}
    />
  )
}
