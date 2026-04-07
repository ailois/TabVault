import React, { useEffect, useId, useState } from "react"

import { getMessage } from "../../lib/i18n/messages"
import type { DisplayLanguage } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import { DashboardIcon } from "./dashboard-icons"

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
            data-testid="dashboard-summary-edit"
            onClick={() => setIsEditing(true)}
            style={secondaryActionButtonStyle(theme)}
            type="button"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <DashboardIcon name="edit" />
              {t("dashboard.summary.edit")}
            </span>
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
            style={{ width: "100%", minHeight: "96px", boxSizing: "border-box", border: `1px solid ${theme.border}`, borderRadius: radius.medium, padding: spacing.sm, backgroundColor: theme.page, color: theme.textPrimary }}
            value={draft}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm }}>
            <button
              aria-label={t("dashboard.summary.cancelAria")}
              data-testid="dashboard-summary-cancel"
              disabled={isSaving}
              onClick={() => { setDraft(summary ?? ""); setIsEditing(false) }}
              style={secondaryActionButtonStyle(theme, isSaving)}
              type="button"
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <DashboardIcon name="close" />
                {t("dashboard.summary.cancel")}
              </span>
            </button>
            <button
              aria-label={t("dashboard.summary.saveAria")}
              data-testid="dashboard-summary-save"
              disabled={isSaving}
              onClick={() => void handleSave()}
              style={primaryActionButtonStyle(theme, isSaving)}
              type="button"
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <DashboardIcon name="save" />
                {t("dashboard.summary.save")}
              </span>
            </button>
          </div>
        </>
      ) : (
        <div style={{ color: summary ? theme.textPrimary : theme.textMuted, fontSize: "0.875rem", lineHeight: 1.6, padding: "12px 14px", borderRadius: radius.medium, backgroundColor: theme.page, border: `1px dashed ${theme.border}` }}>
          {summary ?? t("dashboard.summary.empty")}
        </div>
      )}
    </div>
  )
}

function secondaryActionButtonStyle(theme: ReturnType<typeof useThemeContext>, disabled = false): React.CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    borderRadius: radius.medium,
    backgroundColor: theme.surface,
    color: disabled ? theme.textMuted : theme.textPrimary,
    fontSize: "0.75rem",
    padding: "6px 10px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1
  }
}

function primaryActionButtonStyle(theme: ReturnType<typeof useThemeContext>, disabled = false): React.CSSProperties {
  return {
    border: `1px solid ${theme.accent}`,
    borderRadius: radius.medium,
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontSize: "0.75rem",
    padding: "6px 10px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1
  }
}
