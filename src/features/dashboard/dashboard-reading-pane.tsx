import React, { useEffect, useRef, useState } from "react"

import type { GhostreaderBookmarkAddedPayload } from "../../features/ghostreader-session/ghostreader-bookmark-events"
import type { ChromeGhostreaderSessionStore } from "../../features/ghostreader-session/ghostreader-session-store"
import type { SettingsRepository } from "../../lib/config/settings-repository"
import { getMessage } from "../../lib/i18n/messages"
import type { AiProvider } from "../../lib/providers/provider"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage, ProviderConfig } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import { DashboardAiSidebar } from "./dashboard-ai-sidebar"
import { EditableSummaryCard } from "./editable-summary-card"
import { EditableTagsCard } from "./editable-tags-card"
import { DashboardIcon } from "./dashboard-icons"

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
  ghostreaderSessionStore?: Pick<ChromeGhostreaderSessionStore, "loadSessions" | "saveSessions" | "clearActiveSession">
  latestGhostreaderBookmarkEvent?: GhostreaderBookmarkAddedPayload | null
}

type ReadingTab = "details" | "ai"

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
  onOpenBookmark,
  ghostreaderSessionStore,
  latestGhostreaderBookmarkEvent
}: DashboardReadingPaneProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const [activeTab, setActiveTab] = useState<ReadingTab>("details")
  const [notesDraft, setNotesDraft] = useState(bookmark?.userNotes ?? "")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const hasHydratedNotesRef = useRef(false)
  const notesInputRef = useRef<HTMLTextAreaElement | null>(null)
  const detailsTabId = "dashboard-reading-tab-details"
  const aiTabId = "dashboard-reading-tab-ai"
  const detailsPanelId = "dashboard-reading-panel-details"
  const aiPanelId = "dashboard-reading-panel-ai"
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

  function applyNotesFormatting(kind: "bold" | "italic" | "quote"): void {
    const textarea = notesInputRef.current
    const selectionStart = textarea?.selectionStart ?? notesDraft.length
    const selectionEnd = textarea?.selectionEnd ?? notesDraft.length
    const selectedText = notesDraft.slice(selectionStart, selectionEnd)

    let nextValue = notesDraft

    if (kind === "bold") {
      const wrapped = `**${selectedText || "text"}**`
      nextValue = `${notesDraft.slice(0, selectionStart)}${wrapped}${notesDraft.slice(selectionEnd)}`
    } else if (kind === "italic") {
      const wrapped = `_${selectedText || "text"}_`
      nextValue = `${notesDraft.slice(0, selectionStart)}${wrapped}${notesDraft.slice(selectionEnd)}`
    } else {
      const quoteSource = selectedText || notesDraft
      const quoted = quoteSource
        .split("\n")
        .map((line) => (line.startsWith("> ") ? line : `> ${line}`))
        .join("\n")
      nextValue = selectedText
        ? `${notesDraft.slice(0, selectionStart)}${quoted}${notesDraft.slice(selectionEnd)}`
        : quoted
    }

    setNotesDraft(nextValue)
    textarea?.focus()
  }

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
              data-testid="dashboard-reading-open"
              onClick={() => {
                globalThis.open?.(bookmark.url, "_blank")
              }}
              style={{ padding: "6px", border: "none", backgroundColor: "transparent", color: theme.textMuted, cursor: "pointer", borderRadius: "6px", fontSize: "0.75rem" }}
              title={t("dashboard.reading.action.open")}
              type="button"
            >
              <DashboardIcon name="external" />
            </button>
            {onDelete ? (
              <button
                aria-label={t("dashboard.reading.action.delete")}
                data-testid="dashboard-reading-delete"
                onClick={onDelete}
                style={{ padding: "6px", border: "none", backgroundColor: "transparent", color: theme.textMuted, cursor: "pointer", borderRadius: "6px", fontSize: "0.75rem" }}
                title={t("dashboard.reading.action.delete")}
                type="button"
              >
                <DashboardIcon name="delete" />
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
          aria-controls={detailsPanelId}
          aria-selected={activeTab === "details"}
          data-testid="dashboard-details-tab"
          id={detailsTabId}
          onClick={() => setActiveTab("details")}
          role="tab"
          style={tabStyle("details")}
          type="button"
        >
          {t("dashboard.reading.tab.details")}
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
        {activeTab === "details" ? (
          <div aria-labelledby={detailsTabId} id={detailsPanelId} role="tabpanel" style={{ display: "grid", gap: "28px" }}>
            <EditableTagsCard aiTags={bookmark.aiTags} language={language} userTags={bookmark.userTags} onSave={onSaveTags} />

            <EditableSummaryCard language={language} summary={bookmark.summary} onSave={onSaveSummary} />

            <section style={{ display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t("dashboard.reading.section.notes")}
              </h3>
              <div style={{ border: `1px solid ${theme.border}`, borderRadius: "12px", backgroundColor: theme.page, overflow: "hidden" }}>
                <textarea
                  aria-label={t("dashboard.reading.section.notes")}
                  data-testid="dashboard-notes-input"
                  ref={notesInputRef}
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
                  <div style={{ display: "flex", gap: "8px", color: theme.textMuted, fontSize: "0.875rem" }}>
                    <button aria-label={t("dashboard.reading.format.bold")} data-testid="dashboard-format-bold" onClick={() => applyNotesFormatting("bold")} style={formatButtonStyle(theme)} title={t("dashboard.reading.format.bold")} type="button"><DashboardIcon name="bold" size={15} /></button>
                    <button aria-label={t("dashboard.reading.format.italic")} data-testid="dashboard-format-italic" onClick={() => applyNotesFormatting("italic")} style={formatButtonStyle(theme)} title={t("dashboard.reading.format.italic")} type="button"><DashboardIcon name="italic" size={15} /></button>
                    <button aria-label={t("dashboard.reading.format.quote")} data-testid="dashboard-format-quote" onClick={() => applyNotesFormatting("quote")} style={formatButtonStyle(theme)} title={t("dashboard.reading.format.quote")} type="button"><DashboardIcon name="quote" size={15} /></button>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.625rem", color: theme.textMuted }}>
                    {isSavingNotes ? <DashboardIcon name="loading" size={12} /> : <DashboardIcon name="save" size={12} />}
                    {isSavingNotes ? "..." : t("dashboard.reading.autosave")}
                  </span>
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
              settingsRepository={settingsRepository}
              ghostreaderSessionStore={ghostreaderSessionStore}
              latestGhostreaderBookmarkEvent={latestGhostreaderBookmarkEvent}
            />
          </div>
        )}
      </div>
    </section>
  )
}

function formatButtonStyle(theme: ReturnType<typeof useThemeContext>): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    padding: 0,
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    backgroundColor: theme.surface,
    cursor: "pointer",
    color: theme.textMuted
  }
}
