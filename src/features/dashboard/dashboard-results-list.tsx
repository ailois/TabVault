import React from "react"

import { getMessage } from "../../lib/i18n/messages"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage } from "../../types/settings"
import { spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import type { BookmarkFilterMode } from "./bookmark-workspace"

type DashboardResultsListProps = {
  bookmarks: BookmarkRecord[]
  activeUrl: string | null
  analyzedCount: number
  pendingCount: number
  analysisError: string | null
  analysisProgress: {
    running: boolean
    current: number
    total: number
  }
  filterMode: BookmarkFilterMode
  language?: DisplayLanguage
  onAnalyzeAll: () => void
  onAnalyzeSelected: () => void
  onAnalyzeUnanalyzed: () => void
  onClearSelection: () => void
  onFilterModeChange: (mode: BookmarkFilterMode) => void
  onSearchQueryChange: (value: string) => void
  onSelectUrl: (url: string) => void
  onSelectVisible: () => void
  onToggleSelection: (bookmarkId: string) => void
  searchQuery: string
  selectedBookmarkIds: Set<string>
  heading?: string
}

export function DashboardResultsList({
  bookmarks,
  activeUrl,
  analyzedCount,
  pendingCount,
  analysisError,
  analysisProgress,
  filterMode,
  language = "en",
  onAnalyzeAll,
  onAnalyzeSelected,
  onAnalyzeUnanalyzed,
  onClearSelection,
  onFilterModeChange,
  onSearchQueryChange,
  onSelectUrl,
  onSelectVisible,
  onToggleSelection,
  searchQuery,
  selectedBookmarkIds,
  heading
}: DashboardResultsListProps) {
  const theme = useThemeContext()
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)
  const headingId = "dashboard-results-heading"
  const selectedCount = Array.from(selectedBookmarkIds).length
  const filterOptions: Array<{
    key: BookmarkFilterMode
    label: string
    count: number
    testId: string
  }> = [
    { key: "all", label: t("dashboard.results.filter.all"), count: analyzedCount + pendingCount, testId: "dashboard-filter-all" },
    { key: "analyzed", label: t("dashboard.results.filter.analyzed"), count: analyzedCount, testId: "dashboard-filter-analyzed" },
    { key: "unanalyzed", label: t("dashboard.results.filter.unanalyzed"), count: pendingCount, testId: "dashboard-filter-unanalyzed" }
  ]

  return (
    <section
      aria-labelledby={headingId}
      data-testid="dashboard-results-column"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "min(460px, 38vw)",
        minWidth: "380px",
        maxWidth: "560px",
        borderRight: `1px solid ${theme.border}`,
        backgroundColor: theme.page,
        boxSizing: "border-box"
      }}
    >
      <header style={{ padding: "24px 24px 12px", flexShrink: 0, display: "grid", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <h2 id={headingId} style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: theme.textPrimary }}>
            {heading ?? t("dashboard.results.heading")}
          </h2>
          {analysisProgress.running ? (
            <div
              data-testid="dashboard-analysis-progress"
              style={{
                fontSize: "0.6875rem",
                color: theme.accent,
                backgroundColor: theme.accentSoft,
                padding: "4px 8px",
                borderRadius: "999px",
                fontWeight: 700
              }}
            >
              {t("dashboard.results.bulk.running")
                .replace("{current}", String(analysisProgress.current))
                .replace("{total}", String(analysisProgress.total))}
            </div>
          ) : null}
        </div>

        <div style={{ position: "relative" }}>
          <input
            aria-label={t("dashboard.results.heading")}
            data-testid="dashboard-search-input"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={t("dashboard.results.searchPlaceholder")}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 64px 12px 40px",
              border: `1px solid ${theme.border}`,
              borderRadius: "12px",
              backgroundColor: theme.surface,
              color: theme.textPrimary,
              fontSize: "0.875rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              outline: "none"
            }}
            type="text"
            value={searchQuery}
          />
          <span aria-hidden="true" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>
            S
          </span>
          <span aria-hidden="true" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.625rem", color: theme.textMuted, border: `1px solid ${theme.border}`, padding: "2px 6px", borderRadius: "6px", backgroundColor: theme.page }}>
            {t("dashboard.results.searchShortcut")}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {filterOptions.map((option) => {
            const active = option.key === filterMode
            return (
              <button
                data-testid={option.testId}
                key={option.key}
                onClick={() => onFilterModeChange(option.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "999px",
                  border: `1px solid ${active ? theme.accent : theme.border}`,
                  backgroundColor: active ? theme.accentSoft : theme.surface,
                  color: active ? theme.accent : theme.textMuted,
                  padding: "6px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                type="button"
              >
                <span>{option.label}</span>
                <span style={{ fontSize: "0.6875rem" }}>{option.count}</span>
              </button>
            )
          })}
        </div>

        <div
          data-testid="dashboard-bulk-actions"
          style={{
            display: "grid",
            gap: "8px",
            padding: "12px",
            borderRadius: "14px",
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.surface
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <ActionButton
              disabled={analysisProgress.running}
              label={t("dashboard.results.bulk.analyzeAll")}
              onClick={onAnalyzeAll}
              testId="dashboard-analyze-all"
            />
            <ActionButton
              disabled={analysisProgress.running || pendingCount === 0}
              label={t("dashboard.results.bulk.analyzeUnanalyzed")}
              onClick={onAnalyzeUnanalyzed}
              testId="dashboard-analyze-unanalyzed"
            />
            <ActionButton
              disabled={analysisProgress.running || selectedCount === 0}
              label={t("dashboard.results.bulk.analyzeSelected")}
              onClick={onAnalyzeSelected}
              testId="dashboard-analyze-selected"
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <button
              data-testid="dashboard-select-visible"
              onClick={onSelectVisible}
              style={secondaryActionStyle(theme)}
              type="button"
            >
              {t("dashboard.results.bulk.selectVisible")}
            </button>
            <button
              data-testid="dashboard-clear-selection"
              disabled={selectedCount === 0}
              onClick={onClearSelection}
              style={secondaryActionStyle(theme, selectedCount === 0)}
              type="button"
            >
              {t("dashboard.results.bulk.clearSelection")}
            </button>
            <span style={{ fontSize: "0.75rem", color: theme.textMuted, fontWeight: 600 }}>
              {t("dashboard.results.bulk.selectedCount").replace("{count}", String(selectedCount))}
            </span>
          </div>

          {analysisError ? (
            <div data-testid="dashboard-analysis-error" style={{ fontSize: "0.75rem", color: "#B91C1C" }}>
              {analysisError}
            </div>
          ) : null}
        </div>
      </header>

      <div style={{ display: "grid", gap: "12px", overflowY: "auto", padding: "12px 24px 24px" }}>
        {bookmarks.length === 0 ? (
          <div style={{ padding: spacing.md, color: theme.textMuted, fontSize: "0.875rem" }}>
            {t("dashboard.results.empty")}
          </div>
        ) : null}

        {bookmarks.map((bookmark) => {
          const selected = activeUrl === bookmark.url
          const batchSelected = selectedBookmarkIds.has(bookmark.id)
          const combinedTags = [...bookmark.aiTags, ...bookmark.userTags]
          const statusLabel = getStatusLabel(bookmark.status, t)
          const statusStyle = getStatusStyle(bookmark.status)
          let hostname = bookmark.url
          try {
            hostname = new URL(bookmark.url).hostname
          } catch {}

          return (
            <button
              aria-current={selected ? "true" : undefined}
              aria-pressed={selected}
              key={bookmark.id}
              data-testid="dashboard-result-button"
              onClick={() => onSelectUrl(bookmark.url)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: selected ? "16px 16px 16px 20px" : "16px",
                borderRadius: "12px",
                border: `2px solid ${selected ? theme.accent : batchSelected ? theme.borderFocus : theme.border}`,
                backgroundColor: theme.surface,
                color: theme.textPrimary,
                cursor: "pointer",
                fontSize: "0.875rem",
                lineHeight: 1.4,
                boxShadow: selected ? "0 4px 12px rgba(107,142,115,0.08)" : "0 2px 4px rgba(0,0,0,0.02)",
                position: "relative"
              }}
              type="button"
            >
              {selected ? (
                <span aria-hidden="true" style={{ position: "absolute", left: 0, top: "12px", bottom: "12px", width: "4px", backgroundColor: theme.accent, borderRadius: "0 4px 4px 0" }} />
              ) : null}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                  <input
                    aria-label={t("dashboard.results.selectBookmark").replace("{title}", bookmark.title)}
                    checked={batchSelected}
                    data-testid={`dashboard-select-${bookmark.id}`}
                    onChange={() => onToggleSelection(bookmark.id)}
                    onClick={(event) => event.stopPropagation()}
                    style={{ marginTop: "2px" }}
                    type="checkbox"
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: selected ? 600 : 500, fontSize: "0.9375rem" }}>{bookmark.title}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                      <span
                        data-testid={`dashboard-status-${bookmark.id}`}
                        style={{
                          fontSize: "0.625rem",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontWeight: 700,
                          backgroundColor: statusStyle.background,
                          color: statusStyle.text
                        }}
                      >
                        {statusLabel}
                      </span>
                      <span style={{ fontSize: "0.625rem", color: theme.accent, backgroundColor: theme.accentSoft, padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                        {bookmark.summary ? t("dashboard.results.summaryBadge") : t("dashboard.results.savedBadge")}
                      </span>
                    </div>
                  </div>
                </div>
                <div aria-hidden="true" style={{ color: selected ? "#FBBF24" : "#D0D6D1" }}>*</div>
              </div>

              <div style={{ fontSize: "0.75rem", color: theme.textMuted, marginTop: "10px" }}>
                {(bookmark.summary ?? bookmark.extractedText ?? "").slice(0, 120) || t("dashboard.results.noSummary")}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: "10px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", color: theme.textMuted, fontSize: "0.6875rem" }}>
                  <span>{hostname}</span>
                  {combinedTags[0] ? <span style={{ width: "4px", height: "4px", borderRadius: "999px", backgroundColor: theme.border }} /> : null}
                  {combinedTags[0] ? <span style={{ backgroundColor: theme.accentSoft, color: theme.accent, padding: "2px 6px", borderRadius: "999px", fontWeight: 600 }}>#{combinedTags[0]}</span> : null}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ActionButton({
  disabled,
  label,
  onClick,
  testId
}: {
  disabled?: boolean
  label: string
  onClick: () => void
  testId: string
}) {
  const theme = useThemeContext()

  return (
    <button
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${disabled ? theme.border : theme.accent}`,
        backgroundColor: disabled ? theme.page : theme.accentSoft,
        color: disabled ? theme.textMuted : theme.accent,
        borderRadius: "10px",
        padding: "8px 10px",
        fontSize: "0.75rem",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1
      }}
      type="button"
    >
      {label}
    </button>
  )
}

function secondaryActionStyle(theme: ReturnType<typeof useThemeContext>, disabled = false): React.CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.page,
    color: disabled ? theme.textMuted : theme.textPrimary,
    borderRadius: "10px",
    padding: "7px 10px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1
  }
}

function getStatusLabel(
  status: BookmarkRecord["status"],
  t: (key: Parameters<typeof getMessage>[1]) => string
): string {
  if (status === "done") return t("drawer.status.done")
  if (status === "analyzing") return t("drawer.status.analyzing")
  if (status === "error") return t("drawer.status.error")
  return t("drawer.status.saved")
}

function getStatusStyle(status: BookmarkRecord["status"]) {
  if (status === "done") {
    return { background: "#DCFCE7", text: "#166534" }
  }

  if (status === "analyzing") {
    return { background: "#DBEAFE", text: "#1D4ED8" }
  }

  if (status === "error") {
    return { background: "#FEE2E2", text: "#B91C1C" }
  }

  return { background: "#E5E7EB", text: "#374151" }
}
