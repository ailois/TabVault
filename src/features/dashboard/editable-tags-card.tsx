import React, { useEffect, useId, useState } from "react"

import { getMessage } from "../../lib/i18n/messages"
import type { DisplayLanguage } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

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
            onClick={() => setIsEditing(true)}
            style={{ border: `1px solid ${theme.border}`, borderRadius: radius.medium, backgroundColor: theme.surface, color: theme.textPrimary, fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer" }}
            type="button"
          >
            {t("dashboard.tags.edit")}
          </button>
        )}
      </div>

      <div style={{ color: theme.textPrimary, fontSize: "0.875rem", marginBottom: spacing.sm }}>
        {[...localAiTags, ...localUserTags].join(", ") || t("dashboard.tags.empty")}
      </div>

      {isEditing ? (
        <>
          <input
            aria-label={t("dashboard.tags.inputAria")}
            aria-labelledby={titleId}
            data-testid="dashboard-tag-input"
            onChange={(event) => setTagInput(event.target.value)}
            placeholder={t("dashboard.tags.inputPlaceholder")}
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${theme.border}`, borderRadius: radius.medium, padding: spacing.sm, marginBottom: spacing.sm }}
            type="text"
            value={tagInput}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm }}>
            <button
              aria-label={t("dashboard.tags.cancelAria")}
              disabled={isSaving}
              onClick={() => { setLocalAiTags(aiTags); setLocalUserTags(userTags); setTagInput(""); setIsEditing(false) }}
              style={{ border: `1px solid ${theme.border}`, borderRadius: radius.medium, backgroundColor: theme.surface, color: theme.textSecondary, fontSize: "0.75rem", padding: "4px 10px", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1 }}
              type="button"
            >
              {t("dashboard.tags.cancel")}
            </button>
            <button
              aria-label={t("dashboard.tags.saveAria")}
              disabled={!canSave}
              onClick={() => void handleSave()}
              style={{ border: `1px solid ${theme.accent}`, borderRadius: radius.medium, backgroundColor: theme.accent, color: "#ffffff", fontSize: "0.75rem", padding: "4px 10px", cursor: canSave ? "pointer" : "not-allowed", opacity: canSave ? 1 : 0.7 }}
              type="button"
            >
              {t("dashboard.tags.save")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
