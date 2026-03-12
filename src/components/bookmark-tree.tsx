import React, { useState } from "react"

import type { BookmarkRecord } from "~types/bookmark"
import { colors, radius, spacing } from "~ui/design-tokens"

type BookmarkTreeProps = {
  treeNodes: chrome.bookmarks.BookmarkTreeNode[]
  metadataMap: Record<string, BookmarkRecord>
  onAnalyze: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function BookmarkTree({
  treeNodes,
  metadataMap,
  onAnalyze,
  onDelete
}: BookmarkTreeProps) {
  if (treeNodes.length === 0) {
    return <p style={emptyStyle}>No bookmarks found.</p>
  }

  return (
    <div style={treeContainerStyle}>
      {treeNodes.map((node) => (
        <BookmarkTreeNodeItem
          key={node.id}
          node={node}
          depth={0}
          metadataMap={metadataMap}
          onAnalyze={onAnalyze}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

type BookmarkTreeNodeItemProps = {
  node: chrome.bookmarks.BookmarkTreeNode
  depth: number
  metadataMap: Record<string, BookmarkRecord>
  onAnalyze: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
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

function BookmarkTreeNodeItem({
  node,
  depth,
  metadataMap,
  onAnalyze,
  onDelete
}: BookmarkTreeNodeItemProps) {
  const isFolder = !node.url
  const [expanded, setExpanded] = useState(() => readExpandedState(node.id))
  const [hovered, setHovered] = useState(false)

  const paddingLeft = depth * 16

  if (isFolder) {
    const children = node.children ?? []

    function handleToggle(): void {
      setExpanded((prev) => {
        const next = !prev
        writeExpandedState(node.id, next)
        return next
      })
    }

    return (
      <div>
        <div
          role="button"
          tabIndex={0}
          style={{
            ...folderRowStyle,
            paddingLeft: `${paddingLeft}px`,
            backgroundColor: hovered ? colors.surfaceHover : "transparent"
          }}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              handleToggle()
            }
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span style={arrowStyle}>{expanded ? "\u25BE" : "\u25B8"}</span>
          <span style={folderNameStyle}>{node.title || "Untitled Folder"}</span>
        </div>
        {expanded &&
          children.map((child) => (
            <BookmarkTreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              metadataMap={metadataMap}
              onAnalyze={onAnalyze}
              onDelete={onDelete}
            />
          ))}
      </div>
    )
  }

  // Bookmark node (has url)
  const metadata = metadataMap[node.id]
  const status = metadata?.status
  const showAnalyzeButton = status === "saved" || status === "error"

  async function handleDelete(): Promise<void> {
    if (!window.confirm("Delete this bookmark from Chrome?")) {
      return
    }
    await chrome.bookmarks.remove(node.id)
    await onDelete(node.id)
  }

  return (
    <div
      style={{
        ...bookmarkRowStyle,
        paddingLeft: `${paddingLeft}px`,
        backgroundColor: hovered ? colors.surfaceHover : "transparent"
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={statusDotContainerStyle}>
        {status === "analyzing" && <span style={dotAmberStyle} title="Analyzing" />}
        {status === "error" && <span style={dotRedStyle} title="Error" />}
        {status === "done" && <span style={dotGreenStyle} title="Done" />}
      </div>
      <a
        href={node.url}
        rel="noreferrer"
        style={titleLinkStyle}
        target="_blank"
        title={node.title}
      >
        {node.title || node.url}
      </a>
      <div style={{ ...actionsStyle, opacity: hovered ? 1 : 0 }}>
        {showAnalyzeButton && (
          <button
            aria-label={`Analyze ${node.title}`}
            onClick={() => void onAnalyze(node.id)}
            style={actionButtonStyle}
            type="button"
          >
            Analyze
          </button>
        )}
        <button
          aria-label={`Delete ${node.title}`}
          onClick={() => void handleDelete()}
          style={actionButtonStyle}
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// --- Styles ---

const emptyStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "0.875rem",
  padding: spacing.md
}

const treeContainerStyle: React.CSSProperties = {
  margin: 0,
  padding: 0
}

const folderRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  padding: `6px ${spacing.sm}`,
  borderBottom: `1px solid ${colors.borderMuted}`,
  cursor: "pointer",
  userSelect: "none",
  transition: "background-color 0.15s ease"
}

const arrowStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "12px",
  fontSize: "0.75rem",
  color: colors.textMuted,
  textAlign: "center"
}

const folderNameStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: colors.textSecondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
}

const bookmarkRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  padding: `4px ${spacing.sm}`,
  borderBottom: `1px solid ${colors.borderMuted}`,
  transition: "background-color 0.15s ease"
}

const statusDotContainerStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "8px",
  display: "flex",
  alignItems: "center"
}

const dotAmberStyle: React.CSSProperties = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#f59e0b"
}

const dotRedStyle: React.CSSProperties = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: colors.textDanger
}

const dotGreenStyle: React.CSSProperties = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#22c55e"
}

const titleLinkStyle: React.CSSProperties = {
  color: colors.textPrimary,
  textDecoration: "none",
  fontSize: "0.875rem",
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0
}

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "2px",
  flexShrink: 0,
  transition: "opacity 0.15s ease"
}

const actionButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colors.textMuted,
  fontSize: "0.75rem",
  padding: "2px 4px",
  borderRadius: radius.small
}
