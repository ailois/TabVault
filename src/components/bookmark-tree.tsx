import React, { useState } from "react"

import type { BookmarkRecord } from "../types/bookmark"
import type { DisplayLanguage } from "../types/settings"
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"
import { LocalIcon } from "./local-icon"

type BookmarkTreeVariant = "options" | "sidepanel"

type BookmarkTreeProps = {
  treeNodes: chrome.bookmarks.BookmarkTreeNode[]
  metadataMap: Record<string, BookmarkRecord>
  language?: DisplayLanguage
  visibleUrls?: Set<string>
  selectedUrl?: string | null
  selectedFolderId?: string | null
  showBookmarks?: boolean
  variant?: BookmarkTreeVariant
  onAnalyze: (url: string) => Promise<void>
  onDelete: (nodeId: string, url: string) => Promise<void>
  onClearAnalysis: (url: string) => Promise<void>
  onSelect?: (url: string) => void
  onSelectFolder?: (folderId: string) => void
}

const BOOKMARK_TREE_COPY: Record<DisplayLanguage, {
  empty: string
  untitledFolder: string
  confirmDelete: string
  analyzing: string
  error: string
  done: string
  analyze: string
  clear: string
  analyzeAria: (title: string) => string
  clearAria: (title: string) => string
  deleteAria: (title: string) => string
}> = {
  en: {
    empty: "No bookmarks found.",
    untitledFolder: "Untitled Folder",
    confirmDelete: "Delete this bookmark from Chrome?",
    analyzing: "Analyzing",
    error: "Error",
    done: "Done",
    analyze: "Analyze",
    clear: "Clear",
    analyzeAria: (title) => `Analyze ${title}`,
    clearAria: (title) => `Clear analysis for ${title}`,
    deleteAria: (title) => `Delete ${title}`
  },
  zh: {
    empty: "\u6ca1\u6709\u627e\u5230\u4e66\u7b7e\u3002",
    untitledFolder: "\u672a\u547d\u540d\u6587\u4ef6\u5939",
    confirmDelete: "\u8981\u4ece Chrome \u4e2d\u5220\u9664\u8fd9\u4e2a\u4e66\u7b7e\u5417\uff1f",
    analyzing: "\u5206\u6790\u4e2d",
    error: "\u9519\u8bef",
    done: "\u5df2\u5b8c\u6210",
    analyze: "\u5206\u6790",
    clear: "\u6e05\u9664",
    analyzeAria: (title) => `\u5206\u6790 ${title}`,
    clearAria: (title) => `\u6e05\u9664 ${title} \u7684\u5206\u6790\u7ed3\u679c`,
    deleteAria: (title) => `\u5220\u9664 ${title}`
  }
}

export function BookmarkTree({
  treeNodes,
  metadataMap,
  language = "en",
  visibleUrls,
  selectedUrl = null,
  selectedFolderId = null,
  showBookmarks = true,
  variant = "sidepanel",
  onAnalyze,
  onDelete,
  onClearAnalysis,
  onSelect,
  onSelectFolder
}: BookmarkTreeProps) {
  const theme = useThemeContext()
  const copy = BOOKMARK_TREE_COPY[language]

  if (treeNodes.length === 0) {
    return <p style={{ color: theme.textMuted, fontSize: "0.875rem", padding: spacing.md }}>{copy.empty}</p>
  }

  return (
    <div style={{ margin: 0, padding: variant === "options" ? spacing.xs : `0 ${spacing.sm} ${spacing.sm}` }}>
      {treeNodes.map((node) => (
        <BookmarkTreeNodeItem
          key={node.id}
          depth={0}
          language={language}
          metadataMap={metadataMap}
          node={node}
          onAnalyze={onAnalyze}
          onClearAnalysis={onClearAnalysis}
          onDelete={onDelete}
          onSelect={onSelect}
          onSelectFolder={onSelectFolder}
          selectedFolderId={selectedFolderId}
          selectedUrl={selectedUrl}
          showBookmarks={showBookmarks}
          variant={variant}
          visibleUrls={visibleUrls}
        />
      ))}
    </div>
  )
}

type BookmarkTreeNodeItemProps = {
  node: chrome.bookmarks.BookmarkTreeNode
  depth: number
  metadataMap: Record<string, BookmarkRecord>
  language: DisplayLanguage
  visibleUrls?: Set<string>
  selectedUrl?: string | null
  selectedFolderId?: string | null
  showBookmarks: boolean
  variant: BookmarkTreeVariant
  onAnalyze: (url: string) => Promise<void>
  onDelete: (nodeId: string, url: string) => Promise<void>
  onClearAnalysis: (url: string) => Promise<void>
  onSelect?: (url: string) => void
  onSelectFolder?: (folderId: string) => void
}

function getStorageKey(nodeId: string): string {
  return `tabvault_folder_${nodeId}`
}

function readExpandedState(nodeId: string): boolean {
  try {
    const stored = localStorage.getItem(getStorageKey(nodeId))
    return stored === "true"
  } catch {
    return false
  }
}

function writeExpandedState(nodeId: string, expanded: boolean): void {
  try {
    localStorage.setItem(getStorageKey(nodeId), String(expanded))
  } catch {
    // localStorage may be unavailable; silently ignore
  }
}

function folderHasVisibleDescendant(
  node: chrome.bookmarks.BookmarkTreeNode,
  visibleUrls: Set<string>
): boolean {
  if (node.url) return visibleUrls.has(node.url)
  return (node.children ?? []).some((child) => folderHasVisibleDescendant(child, visibleUrls))
}

function subtreeContainsUrl(node: chrome.bookmarks.BookmarkTreeNode, selectedUrl: string): boolean {
  if (node.url) return node.url === selectedUrl
  return (node.children ?? []).some((child) => subtreeContainsUrl(child, selectedUrl))
}

function getBookmarkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function BookmarkTreeNodeItem({
  node,
  depth,
  metadataMap,
  language,
  visibleUrls,
  selectedUrl,
  selectedFolderId,
  showBookmarks,
  variant,
  onAnalyze,
  onDelete,
  onClearAnalysis,
  onSelect,
  onSelectFolder
}: BookmarkTreeNodeItemProps) {
  const theme = useThemeContext()
  const copy = BOOKMARK_TREE_COPY[language]
  const isFolder = !node.url
  const isTransparentRoot = isFolder && variant === "options" && !showBookmarks && !node.title && !node.url
  const [expanded, setExpanded] = useState(() => (isTransparentRoot ? true : readExpandedState(node.id)))
  const [hovered, setHovered] = useState(false)
  const rowInset = depth === 0 ? 0 : depth * (variant === "options" ? 14 : 12)

  if (isFolder) {
    const children = node.children ?? []
    const navigableChildren = showBookmarks ? children : children.filter((child) => !child.url)
    const visibleChildren = visibleUrls
      ? navigableChildren.filter((child) => folderHasVisibleDescendant(child, visibleUrls))
      : navigableChildren
    const hasChildren = visibleChildren.length > 0
    const isActiveBranch = Boolean(selectedUrl && subtreeContainsUrl(node, selectedUrl))
    const isFolderSelected = selectedFolderId === node.id
    const isHighlighted = showBookmarks ? isActiveBranch : isFolderSelected

    function handleToggle(): void {
      setExpanded((prev) => {
        const next = !prev
        writeExpandedState(node.id, next)
        return next
      })
    }

    function handleFolderClick(): void {
      onSelectFolder?.(node.id)
      if (hasChildren) {
        handleToggle()
      }
    }

    if (isTransparentRoot) {
      return (
        <div>
          {visibleChildren.map((child) => (
            <BookmarkTreeNodeItem
              key={child.id}
              depth={depth}
              language={language}
              metadataMap={metadataMap}
              node={child}
              onAnalyze={onAnalyze}
              onClearAnalysis={onClearAnalysis}
              onDelete={onDelete}
              onSelect={onSelect}
              onSelectFolder={onSelectFolder}
              selectedFolderId={selectedFolderId}
              selectedUrl={selectedUrl}
              showBookmarks={showBookmarks}
              variant={variant}
              visibleUrls={visibleUrls}
            />
          ))}
        </div>
      )
    }

    const handleClick = showBookmarks ? handleToggle : handleFolderClick

    return (
      <div>
        <button
          aria-expanded={hasChildren ? expanded : undefined}
          aria-pressed={showBookmarks ? undefined : isFolderSelected}
          data-testid={`bookmark-tree-folder-${node.id}`}
          onClick={handleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.xs,
            margin: variant === "options" ? "4px 0" : "2px 0",
            marginLeft: `${rowInset}px`,
            padding: variant === "options" ? "7px 10px" : "8px 10px",
            border: `1px solid ${isHighlighted ? theme.borderFocus : "transparent"}`,
            borderRadius: variant === "options" ? "12px" : radius.medium,
            cursor: "pointer",
            userSelect: "none",
            width: "100%",
            textAlign: "left",
            borderWidth: "1px",
            borderStyle: "solid",
            transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
            backgroundColor: isHighlighted
              ? theme.accentSoft
              : hovered
                ? theme.surfaceHover
                : "transparent",
            boxShadow: isHighlighted && variant === "sidepanel" ? "0 1px 2px rgba(99,102,241,0.12)" : "none"
          }}
          type="button"
        >
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: "12px",
              fontSize: "0.75rem",
              color: isHighlighted
                ? variant === "sidepanel"
                  ? theme.accent
                  : theme.textPrimary
                : theme.textMuted,
              textAlign: "center"
            }}
          >
            {hasChildren ? (expanded ? "v" : ">") : ""}
          </span>
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: isHighlighted ? 600 : 500,
              color: isHighlighted
                ? variant === "sidepanel"
                  ? theme.accent
                  : theme.textPrimary
                : theme.textSecondary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {node.title || copy.untitledFolder}
          </span>
        </button>
        {expanded
          ? visibleChildren.map((child) => (
              <BookmarkTreeNodeItem
                key={child.id}
                depth={depth + 1}
                language={language}
                metadataMap={metadataMap}
                node={child}
                onAnalyze={onAnalyze}
                onClearAnalysis={onClearAnalysis}
                onDelete={onDelete}
                onSelect={onSelect}
                onSelectFolder={onSelectFolder}
                selectedFolderId={selectedFolderId}
                selectedUrl={selectedUrl}
                showBookmarks={showBookmarks}
                variant={variant}
                visibleUrls={visibleUrls}
              />
            ))
          : null}
      </div>
    )
  }

  if (!showBookmarks) return null
  if (visibleUrls && node.url && !visibleUrls.has(node.url)) return null

  const metadata = node.url ? metadataMap[node.url] : undefined
  const status = metadata?.status
  const isSelected = node.url === selectedUrl
  const showAnalyzeButton = status === "saved" || status === "error"
  const showClearButton = status === "done" || status === "error" || status === "analyzing"
  const showHost = variant === "options"

  async function handleDelete(): Promise<void> {
    if (!window.confirm(copy.confirmDelete)) {
      return
    }

    await onDelete(node.id, node.url ?? "")
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: showHost ? "flex-start" : "center",
        gap: spacing.xs,
        margin: variant === "options" ? "6px 0" : "2px 0",
        marginLeft: `${rowInset}px`,
        padding: showHost ? "12px 12px 12px 14px" : "7px 10px",
        border: `1px solid ${
          isSelected
            ? theme.borderFocus
            : hovered
              ? theme.border
              : "transparent"
        }`,
        borderRadius: showHost ? "14px" : radius.medium,
        transition: "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
        backgroundColor: isSelected
          ? theme.accentSoft
          : hovered
            ? theme.surfaceHover
            : "transparent",
        boxShadow: isSelected || hovered
          ? showHost
            ? "0 1px 2px rgba(15,23,42,0.06)"
            : isSelected
              ? "0 1px 2px rgba(99,102,241,0.08)"
              : "none"
          : "none",
        overflow: "hidden"
      }}
    >
      {isSelected && showHost ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "4px",
            backgroundColor: theme.accent
          }}
        />
      ) : null}
      <div style={{ flexShrink: 0, width: "10px", display: "flex", alignItems: showHost ? "flex-start" : "center", paddingTop: showHost ? "4px" : 0 }}>
        {status === "analyzing" ? <span data-testid="bookmark-analyzing-spinner" style={dotAmberStyle} title={copy.analyzing} /> : null}
        {status === "error" ? <span style={{ ...dotBaseStyle, backgroundColor: theme.textDanger }} title={copy.error} /> : null}
        {status === "done" ? <span style={dotGreenStyle} title={copy.done} /> : null}
      </div>
      <div style={{ flexShrink: 0, paddingTop: showHost ? "1px" : 0 }}>
        <LocalIcon url={node.url ?? ""} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingLeft: showHost && isSelected ? "2px" : 0 }}>
        <a
          href={node.url}
          onClick={(e) => {
            if (onSelect && node.url) {
              e.preventDefault()
              onSelect(node.url)
            }
          }}
          rel="noreferrer"
          style={{
            display: "block",
            color: isSelected && showHost
              ? theme.textPrimary
              : theme.textPrimary,
            textDecoration: "none",
            fontSize: showHost ? "0.875rem" : "0.8125rem",
            fontWeight: isSelected && showHost ? 700 : 500,
            lineHeight: showHost ? 1.25 : 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: showHost ? "normal" : "nowrap",
            minWidth: 0
          }}
          target="_blank"
          title={node.title}
        >
          {node.title || node.url}
        </a>
        {showHost ? (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "0.6875rem",
              color: isSelected ? theme.accent : theme.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {getBookmarkHost(node.url ?? "")}
          </p>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          gap: "2px",
          flexShrink: 0,
          alignSelf: showHost ? "flex-start" : "center",
          opacity: hovered || isSelected ? 1 : 0,
          transition: "opacity 0.15s ease"
        }}
      >
        {showAnalyzeButton ? (
          <button
            aria-label={copy.analyzeAria(node.title || node.url || copy.untitledFolder)}
            data-testid="bookmark-analyze-button"
            onClick={() => void onAnalyze(node.url!)}
            style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "2px 4px", borderRadius: radius.small }}
            type="button"
          >
            {copy.analyze}
          </button>
        ) : null}
        {showClearButton ? (
          <button
            aria-label={copy.clearAria(node.title || node.url || copy.untitledFolder)}
            onClick={() => void onClearAnalysis(node.url!)}
            style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "2px 4px", borderRadius: radius.small }}
            type="button"
          >
            {copy.clear}
          </button>
        ) : null}
        <button
          aria-label={copy.deleteAria(node.title || node.url || copy.untitledFolder)}
          title={copy.deleteAria(node.title || node.url || copy.untitledFolder)}
          onClick={() => void handleDelete()}
          style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "0.75rem", padding: "2px 4px", borderRadius: radius.small }}
          type="button"
        >
          <span aria-hidden="true">X</span>
        </button>
      </div>
    </div>
  )
}

const dotBaseStyle: React.CSSProperties = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "50%"
}

const dotAmberStyle: React.CSSProperties = {
  ...dotBaseStyle,
  backgroundColor: "#f59e0b"
}

const dotGreenStyle: React.CSSProperties = {
  ...dotBaseStyle,
  backgroundColor: "#22c55e"
}
