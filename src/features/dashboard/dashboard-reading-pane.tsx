import React, { useState } from "react"

import { getMessage } from "../../lib/i18n/messages"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage } from "../../types/settings"
import { radius, spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import { DashboardAiSidebar } from "./dashboard-ai-sidebar"

type DashboardReadingPaneProps = {
  bookmark: BookmarkRecord | null
  language?: DisplayLanguage
  onSaveSummary?: (summary: string) => Promise<void>
  onSaveTags?: (aiTags: string[], userTags: string[]) => Promise<void>
  onDelete?: () => void
}

type ReadingTab = "notes" | "ai"

export function DashboardReadingPane({
  bookmark,
  language = "en",
  onSaveSummary = async () => {},
  onSaveTags = async () => {},
  onDelete
}: DashboardReadingPaneProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const [activeTab, setActiveTab] = useState<ReadingTab>("notes")

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
              onClick={() => { globalThis.open?.(bookmark.url, "_blank") }}
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
      >
        <button type="button" style={tabStyle("notes")} onClick={() => setActiveTab("notes")}>
          {t("dashboard.reading.tab.notes")}
        </button>
        <button type="button" style={tabStyle("ai")} onClick={() => setActiveTab("ai")}>
          {t("dashboard.reading.tab.ai")}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {activeTab === "notes" ? (
          <div style={{ display: "grid", gap: "28px" }}>
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
                <div style={{ padding: "16px", minHeight: "120px", fontSize: "0.875rem", color: bookmark.extractedText ? theme.textPrimary : theme.textMuted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {bookmark.extractedText ?? t("dashboard.reading.notes.empty")}
                </div>
                <div style={{ borderTop: `1px solid ${theme.border}`, backgroundColor: theme.page, padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "12px", color: theme.textMuted, fontSize: "0.875rem" }}>
                    <button style={{ padding: 0, border: "none", backgroundColor: "transparent", cursor: "pointer", color: "inherit", fontWeight: 700 }} title={t("dashboard.reading.format.bold")} type="button">B</button>
                    <button style={{ padding: 0, border: "none", backgroundColor: "transparent", cursor: "pointer", color: "inherit", fontStyle: "italic" }} title={t("dashboard.reading.format.italic")} type="button">I</button>
                    <button style={{ padding: 0, border: "none", backgroundColor: "transparent", cursor: "pointer", color: "inherit" }} title={t("dashboard.reading.format.quote")} type="button">{">"}</button>
                  </div>
                  <span style={{ fontSize: "0.625rem", color: theme.textMuted }}>{t("dashboard.reading.autosave")}</span>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <DashboardAiSidebar
            bookmark={bookmark}
            language={language}
            onSaveSummary={onSaveSummary}
            onSaveTags={onSaveTags}
          />
        )}
      </div>
    </section>
  )
}
