import React, { useMemo, useState } from "react"

import { getMessage } from "../../lib/i18n/messages"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import { DashboardIcon } from "./dashboard-icons"

type DashboardBulkEditPanelProps = {
  bookmarks: BookmarkRecord[]
  language?: DisplayLanguage
  onApply: (input: { notes: string; tags: string[] }) => Promise<void>
  onCancel: () => void
}

function parseBulkTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  )
}

export function DashboardBulkEditPanel({
  bookmarks,
  language = "en",
  onApply,
  onCancel
}: DashboardBulkEditPanelProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const [notesDraft, setNotesDraft] = useState("")
  const [tagsDraft, setTagsDraft] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const parsedTags = useMemo(() => parseBulkTags(tagsDraft), [tagsDraft])
  const canApply = (notesDraft.trim().length > 0 || parsedTags.length > 0) && !isSaving

  async function handleApply(): Promise<void> {
    if (!canApply) {
      return
    }

    setIsSaving(true)
    try {
      await onApply({
        notes: notesDraft.trim(),
        tags: parsedTags
      })
      setNotesDraft("")
      setTagsDraft("")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section
      data-testid="dashboard-bulk-edit-view"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.surface,
        overflow: "hidden"
      }}
    >
      <header
        style={{
          padding: "24px",
          borderBottom: `1px solid ${theme.border}`,
          display: "grid",
          gap: "8px"
        }}
      >
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {t("dashboard.bulkEdit.title")}
        </div>
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: theme.textPrimary }}>
          {t("dashboard.bulkEdit.selectedCount").replace("{count}", String(bookmarks.length))}
        </h2>
        <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted, lineHeight: 1.6 }}>
          {t("dashboard.bulkEdit.description")}
        </p>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "grid", gap: "20px" }}>
        <section style={{ display: "grid", gap: "10px" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {t("dashboard.bulkEdit.selectedList")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {bookmarks.map((bookmark) => (
              <span
                key={bookmark.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  fontSize: "0.75rem",
                  borderRadius: radius.pill,
                  backgroundColor: theme.page,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.border}`
                }}
              >
                {bookmark.title}
              </span>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gap: "10px" }}>
          <label
            htmlFor="dashboard-bulk-notes-input"
            style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            {t("dashboard.bulkEdit.notesLabel")}
          </label>
          <textarea
            data-testid="dashboard-bulk-notes-input"
            id="dashboard-bulk-notes-input"
            onChange={(event) => setNotesDraft(event.target.value)}
            placeholder={t("dashboard.bulkEdit.notesPlaceholder")}
            style={{
              width: "100%",
              minHeight: "140px",
              boxSizing: "border-box",
              padding: spacing.md,
              border: `1px solid ${theme.border}`,
              borderRadius: radius.large,
              backgroundColor: theme.page,
              color: theme.textPrimary,
              fontSize: "0.875rem",
              lineHeight: 1.6,
              resize: "vertical",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
            }}
            value={notesDraft}
          />
        </section>

        <section style={{ display: "grid", gap: "10px" }}>
          <label
            htmlFor="dashboard-bulk-tags-input"
            style={{ fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            {t("dashboard.bulkEdit.tagsLabel")}
          </label>
          <input
            data-testid="dashboard-bulk-tags-input"
            id="dashboard-bulk-tags-input"
            onChange={(event) => setTagsDraft(event.target.value)}
            placeholder={t("dashboard.bulkEdit.tagsPlaceholder")}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              border: `1px solid ${theme.border}`,
              borderRadius: radius.large,
              backgroundColor: theme.page,
              color: theme.textPrimary,
              fontSize: "0.875rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
            }}
            type="text"
            value={tagsDraft}
          />
          {parsedTags.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {parsedTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: radius.pill,
                    backgroundColor: theme.accentSoft,
                    color: theme.accent,
                    fontSize: "0.75rem",
                    fontWeight: 600
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <footer
        style={{
          padding: "16px 24px 24px",
          borderTop: `1px solid ${theme.border}`,
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end"
        }}
      >
        <button
          data-testid="dashboard-bulk-cancel"
          disabled={isSaving}
          onClick={onCancel}
          style={secondaryActionButtonStyle(theme, isSaving)}
          type="button"
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <DashboardIcon name="close" />
            {t("dashboard.bulkEdit.cancel")}
          </span>
        </button>
        <button
          data-testid="dashboard-bulk-apply"
          disabled={!canApply}
          onClick={() => {
            void handleApply()
          }}
          style={primaryActionButtonStyle(theme, !canApply)}
          type="button"
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            {isSaving ? (
              <span data-testid="dashboard-bulk-apply-loading" style={{ display: "inline-flex", animation: "dashboard-bulk-spin 0.8s linear infinite" }}>
                <DashboardIcon name="loading" />
              </span>
            ) : (
              <DashboardIcon name="save" />
            )}
            {isSaving ? t("dashboard.bulkEdit.saving") : t("dashboard.bulkEdit.apply")}
          </span>
        </button>
      </footer>
      <style>{`
        @keyframes dashboard-bulk-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}

function secondaryActionButtonStyle(theme: ReturnType<typeof useThemeContext>, disabled = false): React.CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    borderRadius: radius.medium,
    backgroundColor: theme.page,
    color: disabled ? theme.textMuted : theme.textPrimary,
    padding: "10px 14px",
    fontSize: "0.8125rem",
    fontWeight: 600,
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
    padding: "10px 14px",
    fontSize: "0.8125rem",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1
  }
}
