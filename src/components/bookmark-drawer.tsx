import React, { useEffect, useState } from "react"
import type { BookmarkRecord } from "../types/bookmark"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type BookmarkDrawerProps = {
  bookmark: BookmarkRecord | null
  onClose: () => void
  onAnalyze: (id: string) => Promise<void>
  onClearAnalysis: (id: string) => Promise<void>
  onUpdateTags: (id: string, aiTags: string[], userTags: string[]) => Promise<void>
}

export function BookmarkDrawer({ bookmark, onClose, onAnalyze, onClearAnalysis, onUpdateTags }: BookmarkDrawerProps) {
  const theme = useThemeContext()
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [localAiTags, setLocalAiTags] = useState<string[]>([])
  const [localUserTags, setLocalUserTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  useEffect(() => {
    if (bookmark) {
      setLocalAiTags(bookmark.aiTags)
      setLocalUserTags(bookmark.userTags)
      setIsEditingTags(false)
      setTagInput("")
    }
  }, [bookmark?.id])

  useEffect(() => {
    if (!bookmark) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isEditingTags) {
          setIsEditingTags(false)
        } else {
          void handleClose()
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [bookmark, isEditingTags])

  if (!bookmark) return null

  const showAnalyzeButton = bookmark.status === "saved" || bookmark.status === "error"
  const showClearButton = bookmark.status === "done" || bookmark.status === "error" || bookmark.status === "analyzing"

  const tagsChanged =
    JSON.stringify(localAiTags) !== JSON.stringify(bookmark.aiTags) ||
    JSON.stringify(localUserTags) !== JSON.stringify(bookmark.userTags)

  async function handleClose() {
    if (tagsChanged) {
      await onUpdateTags(bookmark!.id, localAiTags, localUserTags)
    }
    onClose()
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTagsFromInput()
    }
  }

  function addTagsFromInput() {
    const newTags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .filter((t) => !localAiTags.includes(t) && !localUserTags.includes(t))

    if (newTags.length > 0) {
      setLocalUserTags([...localUserTags, ...newTags])
    }
    setTagInput("")
  }

  const allTagCount = localAiTags.length + localUserTags.length

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => void handleClose()}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.3)",
          zIndex: 40
        }}
      />
      {/* Drawer panel */}
      <aside
        data-testid="bookmark-drawer"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "320px",
          backgroundColor: theme.surface,
          borderLeft: `1px solid ${theme.border}`,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto"
        }}
      >
        {/* Header */}
        <div
          data-testid="bookmark-drawer-header"
          style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: spacing.sm,
          padding: spacing.md,
          borderBottom: `1px solid ${theme.borderMuted}`
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: theme.textPrimary, lineHeight: 1.3 }}>
              {bookmark.title}
            </h2>
            {/* Metadata row: favicon + domain + date */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: theme.textMuted, marginTop: "6px" }}>
              <img
                alt=""
                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent((() => { try { return new URL(bookmark.url).hostname } catch { return "" } })())}&sz=16`}
                style={{ width: "14px", height: "14px", opacity: 0.75, borderRadius: "2px" }}
              />
              <span>{(() => { try { return new URL(bookmark.url).hostname.replace(/^www\./, "") } catch { return "" } })()}</span>
              <span>•</span>
              <span>{new Date(bookmark.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <a
              data-testid="drawer-open-link"
              href={bookmark.url}
              rel="noreferrer"
              style={{ padding: "5px 10px", border: `1px solid ${theme.border}`, borderRadius: "8px", fontSize: "0.75rem", fontWeight: 500, color: theme.textSecondary, textDecoration: "none", backgroundColor: "transparent" }}
              target="_blank"
            >
              ↗️ Open
            </a>
            <button
              aria-label="Close details"
              data-testid="drawer-close-button"
              onClick={() => void handleClose()}
              style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "1.125rem", padding: "2px", borderRadius: radius.small, flexShrink: 0 }}
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: spacing.md, display: "grid", gap: spacing.md }}>
          {/* URL */}
          <div data-testid="drawer-url-section">
            <p style={{ margin: "0 0 4px", fontSize: "0.75rem", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>URL</p>
            <a
              data-testid="drawer-url-link"
              href={bookmark.url}
              rel="noreferrer"
              style={{ fontSize: "0.875rem", color: theme.accent, textDecoration: "none", wordBreak: "break-all" }}
              target="_blank"
            >
              {bookmark.url}
            </a>
          </div>

          {/* Status & provider */}
          <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap", alignItems: "center" }}>
            <span
              data-testid="drawer-status-badge"
              style={{
                fontSize: "0.75rem",
                padding: "4px 10px",
                borderRadius: radius.pill,
                backgroundColor: theme.surfaceElevated,
                color: theme.textMuted,
                display: "inline-flex",
                alignItems: "center",
                alignSelf: "flex-start",
                whiteSpace: "nowrap"
              }}
            >
              {bookmark.status}
            </span>
            {bookmark.provider ? (
              <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: radius.pill, backgroundColor: theme.accentSoft, color: theme.accent, display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
                {bookmark.provider} / {bookmark.model}
              </span>
            ) : null}
          </div>

          {/* Summary */}
          {bookmark.summary ? (
            <div
              data-testid="drawer-summary-card"
              style={{
              background: theme.isDark ? theme.surfaceElevated : "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)",
              border: `1px solid ${theme.isDark ? theme.border : "#e0d9f7"}`,
              borderRadius: "16px",
              padding: "20px"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "10px", borderBottom: `1px solid ${theme.isDark ? theme.borderMuted : "#ede8fa"}` }}>
                <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: theme.isDark ? theme.textMuted : "#312e81", textTransform: "uppercase", letterSpacing: "0.05em" }}>✨ AI Summary</p>
                {showAnalyzeButton ? (
                  <button
                    data-testid="drawer-regenerate-button"
                    onClick={() => void onAnalyze(bookmark.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: theme.isDark ? theme.accent : "#6366f1", fontWeight: 500, padding: "0" }}
                    type="button"
                  >
                    Re-generate
                  </button>
                ) : null}
              </div>
              <p style={{ margin: 0, fontSize: "0.9375rem", color: theme.isDark ? theme.textSecondary : "#374151", lineHeight: 1.7 }}>{bookmark.summary}</p>
            </div>
          ) : null}

          {/* Tags section — always shown */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: allTagCount > 0 || isEditingTags ? "8px" : 0 }}>
              <p style={{ margin: 0, fontSize: "0.6875rem", fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Smart Tags</p>
              <button
                aria-label={isEditingTags ? "Done editing tags" : "Edit tags"}
                data-testid="tags-edit-button"
                onClick={() => setIsEditingTags(!isEditingTags)}
                style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "2px 4px", borderRadius: "5px" }}
                type="button"
              >
                {isEditingTags ? "Done" : "✎"}
              </button>
            </div>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              alignItems: "center",
              padding: "8px",
              border: `1px solid ${theme.border}`,
              borderRadius: "12px",
              backgroundColor: theme.isDark ? theme.surfaceSubtle : "rgba(249,250,251,0.8)",
              boxShadow: theme.isDark ? "inset 0 1px 3px rgba(0,0,0,0.22)" : "inset 0 1px 3px rgba(15,23,42,0.05)",
              minHeight: "44px"
            }}>
              {localAiTags.map((tag) => (
                <span key={`ai-${tag}`} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8125rem", padding: "5px 10px", borderRadius: "8px", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, boxShadow: theme.isDark ? "0 1px 2px rgba(0,0,0,0.28)" : "0 1px 2px rgba(15,23,42,0.06)", color: theme.textPrimary, fontWeight: 500 }}>
                  <span style={{ color: theme.accent }}>#</span>
                  {tag}
                  {isEditingTags ? (
                    <button
                      aria-label={`Remove tag ${tag}`}
                      data-testid="tag-remove-button"
                      onClick={() => setLocalAiTags(localAiTags.filter((t) => t !== tag))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "0 0 0 2px", lineHeight: 1 }}
                      type="button"
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              {localUserTags.map((tag) => (
                <span key={`user-${tag}`} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8125rem", padding: "5px 10px", borderRadius: "8px", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, boxShadow: theme.isDark ? "0 1px 2px rgba(0,0,0,0.28)" : "0 1px 2px rgba(15,23,42,0.06)", color: theme.textPrimary, fontWeight: 500 }}>
                  <span style={{ color: theme.accent }}>#</span>
                  {tag}
                  {isEditingTags ? (
                    <button
                      aria-label={`Remove tag ${tag}`}
                      data-testid="tag-remove-button"
                      onClick={() => setLocalUserTags(localUserTags.filter((t) => t !== tag))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "0 0 0 2px", lineHeight: 1 }}
                      type="button"
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              {isEditingTags ? (
                <input
                  data-testid="tag-input"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="+ Add custom tag..."
                  style={{ fontSize: "0.8125rem", background: "transparent", outline: "none", border: "none", padding: "4px 6px", minWidth: "120px", color: theme.textPrimary, flex: 1 }}
                  type="text"
                  value={tagInput}
                />
              ) : null}
            </div>
          </div>

          {/* Error message */}
          {bookmark.status === "error" && bookmark.errorMessage ? (
            <p style={{ margin: 0, fontSize: "0.8125rem", color: theme.textDanger }}>{bookmark.errorMessage}</p>
          ) : null}

          {/* Dates */}
          <div data-testid="drawer-date-block" style={{ fontSize: "0.75rem", color: theme.textMuted, display: "grid", gap: "2px" }}>
            <p style={{ margin: 0 }}>Saved {new Date(bookmark.createdAt).toLocaleDateString()}</p>
            <p style={{ margin: 0 }}>Updated {new Date(bookmark.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: spacing.md, borderTop: `1px solid ${theme.borderMuted}`, display: "flex", gap: spacing.sm }}>
          {showAnalyzeButton ? (
            <button
              data-testid="drawer-analyze-button"
              onClick={() => void onAnalyze(bookmark.id)}
              style={{ flex: 1, padding: `${spacing.sm} ${spacing.md}`, border: "none", borderRadius: radius.medium, backgroundColor: theme.accent, color: "#fff", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
              type="button"
            >
              Analyze
            </button>
          ) : null}
          {showClearButton ? (
            <button
              data-testid="drawer-clear-button"
              onClick={() => void onClearAnalysis(bookmark.id)}
              style={{ flex: 1, padding: `${spacing.sm} ${spacing.md}`, border: `1px solid ${theme.border}`, borderRadius: radius.medium, backgroundColor: "transparent", color: theme.textSecondary, fontWeight: 500, fontSize: "0.875rem", cursor: "pointer" }}
              type="button"
            >
              Clear analysis
            </button>
          ) : null}
        </div>
      </aside>
    </>
  )
}
