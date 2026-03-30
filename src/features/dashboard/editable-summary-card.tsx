import React, { useEffect, useState } from "react"

import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type EditableSummaryCardProps = {
  summary?: string
  onSave: (summary: string) => Promise<void>
}

export function EditableSummaryCard({ summary, onSave }: EditableSummaryCardProps) {
  const theme = useThemeContext()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(summary ?? "")

  useEffect(() => {
    setDraft(summary ?? "")
  }, [summary])

  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: radius.large, padding: spacing.md, backgroundColor: theme.surface }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
        <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em" }}>
          AI SUMMARY
        </div>
        <button aria-label="Edit summary" onClick={() => setIsEditing(true)} type="button">
          Edit
        </button>
      </div>

      {isEditing ? (
        <>
          <textarea
            data-testid="dashboard-summary-input"
            onChange={(event) => setDraft(event.target.value)}
            style={{ width: "100%", minHeight: "96px", boxSizing: "border-box", border: `1px solid ${theme.border}`, borderRadius: radius.medium, padding: spacing.sm }}
            value={draft}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm }}>
            <button aria-label="Cancel summary edit" onClick={() => { setDraft(summary ?? ""); setIsEditing(false) }} type="button">
              Cancel
            </button>
            <button aria-label="Save summary" onClick={async () => { await onSave(draft); setIsEditing(false) }} type="button">
              Save
            </button>
          </div>
        </>
      ) : (
        <div style={{ color: theme.textPrimary, fontSize: "0.875rem", lineHeight: 1.5 }}>
          {summary ?? "No summary yet."}
        </div>
      )}
    </div>
  )
}
