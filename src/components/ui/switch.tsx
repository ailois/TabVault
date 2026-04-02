import React from "react"

import { cn } from "../../ui/utils/cn"

type ToggleSwitchProps = {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}

export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "inline-flex h-6 w-10 flex-shrink-0 items-center rounded-full border p-[3px] transition-colors",
        checked ? "border-accent-primary bg-accent-primary" : "border-subtle bg-base"
      )}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "h-4 w-4 flex-shrink-0 rounded-full transition-transform",
          checked ? "translate-x-4 bg-white" : "bg-secondary"
        )}
      />
    </button>
  )
}
