import React, { useEffect, useId, useState } from "react"

import { getMessage } from "../../lib/i18n/messages"
import type { DisplayLanguage } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import { DashboardIcon } from "./dashboard-icons"

type EditableTagsCardProps = {
  aiTags: string[]
  userTags: string[]
  language?: DisplayLanguage
  onSave: (aiTags: string[], userTags: string[]) => Promise<void>
}

export function EditableTagsCard({ aiTags, userTags, language = "en", onSave }: EditableTagsCardProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localAiTags, setLocalAiTags] = useState(aiTags)
  const [localUserTags, setLocalUserTags] = useState(userTags)
  const [tagInput, setTagInput] = useState("")
  const titleId = useId()

  useEffect(() => {
    setLocalAiTags(aiTags)
    setLocalUserTags(userTags)
  }, [aiTags, userTags])

  const canSave = tagInput.trim().length > 0 && !isSaving

  async function handleSave(): Promise<void> {
    const nextTag = tagInput.trim()
    if (!nextTag) return

    setIsSaving(true)
    try {
      await onSave(localAiTags, [...localUserTags, nextTag])
      setTagInput("")
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div data-testid="dashboard-tags-card" style={{ border: `1px solid ${theme.border}`, borderRadius: radius.xl, padding: "20px", backgroundColor: theme.surface, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
        <div id={titleId} style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em" }}>
          {t("dashboard.tags.title")}
        </div>
        {isEditing ? null : (
          <button
            aria-label={t("dashboard.tags.editAria")}
            data-testid="dashboard-tags-edit"
            onClick={() => setIsEditing(true)}
            style={secondaryActionButtonStyle(theme)}
            type="button"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <DashboardIcon name="edit" />
              {t("dashboard.tags.edit")}
            </span>
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: spacing.sm }}>
        {[...localAiTags, ...localUserTags].map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "999px",
              backgroundColor: theme.accentSoft,
              color: theme.accent,
              fontSize: "0.75rem",
              fontWeight: 600
            }}
          >
            #{tag}
          </span>
        ))}
        {[...localAiTags, ...localUserTags].length === 0 ? (
          <div style={{ color: theme.textMuted, fontSize: "0.875rem", lineHeight: 1.6, padding: "12px 14px", borderRadius: radius.medium, backgroundColor: theme.page, border: `1px dashed ${theme.border}`, width: "100%" }}>
            {t("dashboard.tags.empty")}
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <>
          <input
            aria-label={t("dashboard.tags.inputAria")}
            aria-labelledby={titleId}
            data-testid="dashboard-tag-input"
            onChange={(event) => setTagInput(event.target.value)}
            placeholder={t("dashboard.tags.inputPlaceholder")}
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${theme.border}`, borderRadius: radius.medium, padding: spacing.sm, marginBottom: spacing.sm, backgroundColor: theme.page, color: theme.textPrimary }}
            type="text"
            value={tagInput}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm }}>
            <button
              aria-label={t("dashboard.tags.cancelAria")}
              data-testid="dashboard-tags-cancel"
              disabled={isSaving}
              onClick={() => { setLocalAiTags(aiTags); setLocalUserTags(userTags); setTagInput(""); setIsEditing(false) }}
              style={secondaryActionButtonStyle(theme, isSaving)}
              type="button"
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <DashboardIcon name="close" />
                {t("dashboard.tags.cancel")}
              </span>
            </button>
            <button
              aria-label={t("dashboard.tags.saveAria")}
              data-testid="dashboard-tags-save"
              disabled={!canSave}
              onClick={() => void handleSave()}
              style={primaryActionButtonStyle(theme, !canSave)}
              type="button"
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <DashboardIcon name="save" />
                {t("dashboard.tags.save")}
              </span>
            </button>
          </div>
        </>
      ) : null}
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
