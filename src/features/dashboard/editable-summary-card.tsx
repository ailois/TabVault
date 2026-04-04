import React, { useEffect, useId, useState } from "react"

import { getMessage } from "../../lib/i18n/messages"
import type { DisplayLanguage } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type EditableSummaryCardProps = {
  summary?: string
  language?: DisplayLanguage
  onSave: (summary: string) => Promise<void>
}

export function EditableSummaryCard({ summary, language = "en", onSave }: EditableSummaryCardProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState(summary ?? "")
  const titleId = useId()

  useEffect(() => {
    setDraft(summary ?? "")
  }, [summary])

  async function handleSave(): Promise<void> {
    setIsSaving(true)
    try {
      await onSave(draft)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div data-testid="dashboard-summary-card" style={{ border: `1px solid ${theme.border}`, borderRadius: radius.xl, padding: "20px", backgroundColor: theme.surface, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
        <div id={titleId} style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em" }}>
          {t("dashboard.summary.title")}
        </div>
        {isEditing ? null : (
          <button
            aria-label={t("dashboard.summary.editAria")}
            onClick={() => setIsEditing(true)}
            style={{ border: `1px solid ${theme.border}`, borderRadius: radius.medium, backgroundColor: theme.surface, color: theme.textPrimary, fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer" }}
            type="button"
          >
            {t("dashboard.summary.edit")}
          </button>
        )}
      </div>

      {isEditing ? (
        <>
          <textarea
            aria-label={t("dashboard.summary.inputAria")}
            aria-labelledby={titleId}
            data-testid="dashboard-summary-input"
            onChange={(event) => setDraft(event.target.value)}
            style={{ width: "100%", minHeight: "96px", boxSizing: "border-box", border: `1px solid ${theme.border}`, borderRadius: radius.medium, padding: spacing.sm }}
            value={draft}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm }}>
            <button
              aria-label={t("dashboard.summary.cancelAria")}
              disabled={isSaving}
              onClick={() => { setDraft(summary ?? ""); setIsEditing(false) }}
              style={{ border: `1px solid ${theme.border}`, borderRadius: radius.medium, backgroundColor: theme.surface, color: theme.textSecondary, fontSize: "0.75rem", padding: "4px 10px", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1 }}
              type="button"
            >
              {t("dashboard.summary.cancel")}
            </button>
            <button
              aria-label={t("dashboard.summary.saveAria")}
              disabled={isSaving}
              onClick={() => void handleSave()}
              style={{ border: `1px solid ${theme.accent}`, borderRadius: radius.medium, backgroundColor: theme.accent, color: "#ffffff", fontSize: "0.75rem", padding: "4px 10px", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1 }}
              type="button"
            >
              {t("dashboard.summary.save")}
            </button>
          </div>
        </>
      ) : (
        <div style={{ color: theme.textPrimary, fontSize: "0.875rem", lineHeight: 1.5 }}>
          {summary ?? t("dashboard.summary.empty")}
        </div>
      )}
    </div>
  )
}
