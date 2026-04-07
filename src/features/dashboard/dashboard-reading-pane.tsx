import React, { useEffect, useRef, useState } from "react"

import type { SettingsRepository } from "../../lib/config/settings-repository"
import { getMessage } from "../../lib/i18n/messages"
import type { AiProvider } from "../../lib/providers/provider"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage, ProviderConfig } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import { DashboardAiSidebar } from "./dashboard-ai-sidebar"

const READING_PLACEHOLDER_COPY: Record<DisplayLanguage, string> = {
  en: "Coming soon",
  zh: "即将上线"
}

type DashboardReadingPaneProps = {
  bookmark: BookmarkRecord | null
  bookmarks?: BookmarkRecord[]
  language?: DisplayLanguage
  onSaveSummary?: (summary: string) => Promise<void>
  onSaveTags?: (aiTags: string[], userTags: string[]) => Promise<void>
  onSaveNotes?: (notes: string) => Promise<void>
  onDelete?: () => void
  settingsRepository?: SettingsRepository
  createProvider?: (config: ProviderConfig) => AiProvider
  onOpenBookmark?: (bookmarkId: string) => void
}

type ReadingTab = "notes" | "ai"

export function DashboardReadingPane({
  bookmark,
  bookmarks,
  language = "en",
  onSaveSummary = async () => {},
  onSaveTags = async () => {},
  onSaveNotes = async () => {},
  onDelete,
  settingsRepository,
  createProvider,
  onOpenBookmark
}: DashboardReadingPaneProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const [activeTab, setActiveTab] = useState<ReadingTab>("notes")
  const [notesDraft, setNotesDraft] = useState(bookmark?.userNotes ?? "")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const hasHydratedNotesRef = useRef(false)
  const notesTabId = "dashboard-reading-tab-notes"
  const aiTabId = "dashboard-reading-tab-ai"
  const notesPanelId = "dashboard-reading-panel-notes"
  const aiPanelId = "dashboard-reading-panel-ai"
  const getPlaceholderTitle = (label: string) => `${label} - ${READING_PLACEHOLDER_COPY[language]}`
  const extractedText = bookmark?.extractedText?.trim() ?? ""

  useEffect(() => {
    hasHydratedNotesRef.current = false
    setNotesDraft(bookmark?.userNotes ?? "")
  }, [bookmark?.id, bookmark?.userNotes])

  useEffect(() => {
    const currentNotes = bookmark?.userNotes ?? ""
    if (!bookmark) {
      return undefined
    }

    if (!hasHydratedNotesRef.current) {
      hasHydratedNotesRef.current = true
      return undefined
    }

    if (notesDraft === currentNotes || isSavingNotes) {
      return undefined
    }

    let cancelled = false
    setIsSavingNotes(true)

    void onSaveNotes(notesDraft).finally(() => {
      if (!cancelled) {
        setIsSavingNotes(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [bookmark, isSavingNotes, notesDraft, onSaveNotes])

  const tabStyle = (tab: ReadingTab): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: "0.875rem",
    fontWeight: activeTab === tab ? 600 : 500,
    color: activeTab === tab ? theme.accent : theme.textMuted,
    backgroundColor: "transparent",
    border: "none",
    borderBottomStyle: "solid",
    borderBottomWidth: "2px",
    borderBottomColor: activeTab === tab ? theme.accent : "transparent",
    cursor: "pointer"
  })

  if (!bookmark) {
    return (
      <section
        data-testid="dashboard-reading-pane"
        style={{
          flex: 1,
          backgroundColor: theme.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          data-testid="dashboard-reading-empty"
          style={{
            color: theme.textMuted,
            fontSize: "0.9375rem",
            border: `1px dashed ${theme.border}`,
            borderRadius: radius.xl,
            padding: "32px",
            backgroundColor: theme.page,
            maxWidth: "280px",
            textAlign: "center"
          }}
        >
          {t("dashboard.reading.empty")}
        </div>
      </section>
    )
  }

  let hostname = ""
  try {
    hostname = new URL(bookmark.url).hostname
  } catch {
    hostname = bookmark.url
  }

  return (
    <section
      data-testid="dashboard-reading-pane"
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
          padding: "24px 24px 16px",
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: theme.textPrimary, lineHeight: 1.3, flex: 1 }}>
            {bookmark.title}
          </h2>
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            <button
              aria-label={t("dashboard.reading.action.open")}
              onClick={() => {
                globalThis.open?.(bookmark.url, "_blank")
              }}
              style={{ padding: "6px", border: "none", backgroundColor: "transparent", color: theme.textMuted, cursor: "pointer", borderRadius: "6px", fontSize: "0.75rem" }}
              title={t("dashboard.reading.action.open")}
              type="button"
            >
              O
            </button>
            {onDelete ? (
              <button
                aria-label={t("dashboard.reading.action.delete")}
                onClick={onDelete}
                style={{ padding: "6px", border: "none", backgroundColor: "transparent", color: theme.textMuted, cursor: "pointer", borderRadius: "6px", fontSize: "0.75rem" }}
                title={t("dashboard.reading.action.delete")}
                type="button"
              >
                X
              </button>
            ) : null}
          </div>
        </div>
        <a
          href={bookmark.url}
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "0.75rem", color: theme.accent, textDecoration: "none" }}
          target="_blank"
        >
          {hostname}
        </a>
      </header>

      <div
        data-testid="dashboard-reading-metadata"
        style={{
          display: "flex",
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.page,
          padding: "0 24px",
          flexShrink: 0
        }}
        role="tablist"
      >
        <button
          aria-controls={notesPanelId}
          aria-selected={activeTab === "notes"}
          data-testid="dashboard-notes-tab"
          id={notesTabId}
          onClick={() => setActiveTab("notes")}
          role="tab"
          style={tabStyle("notes")}
          type="button"
        >
          {t("dashboard.reading.tab.notes")}
        </button>
        <button
          aria-controls={aiPanelId}
          aria-selected={activeTab === "ai"}
          data-testid="dashboard-ai-tab"
          id={aiTabId}
          onClick={() => setActiveTab("ai")}
          role="tab"
          style={tabStyle("ai")}
          type="button"
        >
          {t("dashboard.reading.tab.ai")}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {activeTab === "notes" ? (
          <div aria-labelledby={notesTabId} id={notesPanelId} role="tabpanel" style={{ display: "grid", gap: "28px" }}>
            <section>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t("dashboard.reading.section.tags")}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                {[...bookmark.aiTags, ...bookmark.userTags].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.75rem",
                      backgroundColor: theme.accentSoft,
                      color: theme.accent,
                      border: `1px solid ${theme.accent}30`,
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontWeight: 500
                    }}
                  >
                    #{tag}
                  </span>
                ))}
                {[...bookmark.aiTags, ...bookmark.userTags].length === 0 ? (
                  <span style={{ fontSize: "0.75rem", color: theme.textMuted }}>{t("dashboard.reading.tags.empty")}</span>
                ) : null}
              </div>
            </section>

            <section>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t("dashboard.reading.section.summary")}
              </h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: theme.textPrimary, lineHeight: 1.7 }}>
                {bookmark.summary ?? t("dashboard.reading.summary.empty")}
              </p>
            </section>

            <section style={{ display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t("dashboard.reading.section.notes")}
              </h3>
              <div style={{ border: `1px solid ${theme.border}`, borderRadius: "12px", backgroundColor: theme.page, overflow: "hidden" }}>
                <textarea
                  aria-label={t("dashboard.reading.section.notes")}
                  data-testid="dashboard-notes-input"
                  onChange={(event) => setNotesDraft(event.target.value)}
                  placeholder={t("dashboard.reading.notes.empty")}
                  style={{
                    width: "100%",
                    minHeight: "140px",
                    boxSizing: "border-box",
                    padding: "16px",
                    border: "none",
                    outline: "none",
                    resize: "vertical",
                    backgroundColor: theme.page,
                    color: theme.textPrimary,
                    fontSize: "0.875rem",
                    lineHeight: 1.7
                  }}
                  value={notesDraft}
                />
                {extractedText ? (
                  <div style={{ borderTop: `1px solid ${theme.border}`, padding: "16px", backgroundColor: theme.surface }}>
                    <div style={{ marginBottom: "8px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {t("dashboard.summary.title")}
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: theme.textSecondary, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {extractedText}
                    </div>
                  </div>
                ) : null}
                <div style={{ borderTop: `1px solid ${theme.border}`, backgroundColor: theme.page, padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "12px", color: theme.textMuted, fontSize: "0.875rem" }}>
                    <button aria-disabled="true" data-testid="dashboard-format-bold" disabled style={{ padding: 0, border: "none", backgroundColor: "transparent", cursor: "not-allowed", color: "inherit", fontWeight: 700, opacity: 0.6 }} title={getPlaceholderTitle(t("dashboard.reading.format.bold"))} type="button"><span aria-hidden="true">B</span></button>
                    <button aria-disabled="true" data-testid="dashboard-format-italic" disabled style={{ padding: 0, border: "none", backgroundColor: "transparent", cursor: "not-allowed", color: "inherit", fontStyle: "italic", opacity: 0.6 }} title={getPlaceholderTitle(t("dashboard.reading.format.italic"))} type="button"><span aria-hidden="true">I</span></button>
                    <button aria-disabled="true" data-testid="dashboard-format-quote" disabled style={{ padding: 0, border: "none", backgroundColor: "transparent", cursor: "not-allowed", color: "inherit", opacity: 0.6 }} title={getPlaceholderTitle(t("dashboard.reading.format.quote"))} type="button"><span aria-hidden="true">{">"}</span></button>
                  </div>
                  <span style={{ fontSize: "0.625rem", color: theme.textMuted }}>{isSavingNotes ? "..." : t("dashboard.reading.autosave")}</span>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div aria-labelledby={aiTabId} id={aiPanelId} role="tabpanel">
            <DashboardAiSidebar
              bookmark={bookmark}
              bookmarks={bookmarks}
              createProvider={createProvider}
              language={language}
              onOpenBookmark={onOpenBookmark}
              onSaveSummary={onSaveSummary}
              onSaveTags={onSaveTags}
              settingsRepository={settingsRepository}
            />
          </div>
        )}
      </div>
    </section>
  )
}
