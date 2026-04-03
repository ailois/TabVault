import React, { useEffect, useState } from "react"

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
  const [localAiTags, setLocalAiTags] = useState(aiTags)
  const [localUserTags, setLocalUserTags] = useState(userTags)
  const [tagInput, setTagInput] = useState("")

  useEffect(() => {
    setLocalAiTags(aiTags)
    setLocalUserTags(userTags)
  }, [aiTags, userTags])

  return (
    <div data-testid="dashboard-tags-card" style={{ border: `1px solid ${theme.border}`, borderRadius: radius.xl, padding: "20px", backgroundColor: theme.surface, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
        <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.1em" }}>
          {t("dashboard.tags.title")}
        </div>
        <button
          aria-label={t("dashboard.tags.editAria")}
          onClick={() => setIsEditing(true)}
          style={{ border: `1px solid ${theme.border}`, borderRadius: radius.medium, backgroundColor: theme.surface, color: theme.textPrimary, fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer" }}
          type="button"
        >
          {t("dashboard.tags.edit")}
        </button>
      </div>

      <div style={{ color: theme.textPrimary, fontSize: "0.875rem", marginBottom: spacing.sm }}>
        {[...localAiTags, ...localUserTags].join(", ") || t("dashboard.tags.empty")}
      </div>

      {isEditing ? (
        <>
          <input
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
              onClick={() => { setLocalAiTags(aiTags); setLocalUserTags(userTags); setTagInput(""); setIsEditing(false) }}
              style={{ border: `1px solid ${theme.border}`, borderRadius: radius.medium, backgroundColor: theme.surface, color: theme.textSecondary, fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer" }}
              type="button"
            >
              {t("dashboard.tags.cancel")}
            </button>
            <button
              aria-label={t("dashboard.tags.saveAria")}
              onClick={async () => {
                const nextUserTags = tagInput.trim() ? [...localUserTags, tagInput.trim()] : localUserTags
                await onSave(localAiTags, nextUserTags)
                setTagInput("")
                setIsEditing(false)
              }}
              style={{ border: `1px solid ${theme.accent}`, borderRadius: radius.medium, backgroundColor: theme.accent, color: "#ffffff", fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer" }}
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
