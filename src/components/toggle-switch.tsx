import React from "react"

import { radius } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type ToggleSwitchProps = {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}

export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  const theme = useThemeContext()

  const trackStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    width: "34px",
    height: "20px",
    borderRadius: radius.pill,
    backgroundColor: checked ? theme.accent : theme.surfaceElevated,
    border: `1px solid ${checked ? theme.accent : theme.border}`,
    padding: "2px",
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    flexShrink: 0,
    boxSizing: "border-box"
  }

  const thumbStyle: React.CSSProperties = {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    backgroundColor: checked ? "#ffffff" : theme.textMuted,
    transform: checked ? "translateX(14px)" : "translateX(0)",
    transition: "transform 0.15s ease, background-color 0.15s ease",
    flexShrink: 0
  }

  return (
    <button
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      role="switch"
      style={trackStyle}
      type="button"
    >
      <span style={thumbStyle} />
    </button>
  )
}
