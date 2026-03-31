import type { BookmarkRecord } from "../../types/bookmark"

export type BookmarkFilterMode = "all" | "analyzed" | "unanalyzed"

export type BookmarkListItem = {
  id: string
  title: string
  url: string
  folderId: string | null
  folderTitle: string
}

export function collectBookmarksWithFolderContext(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  currentFolder: chrome.bookmarks.BookmarkTreeNode | null = null
): BookmarkListItem[] {
  const result: BookmarkListItem[] = []

  for (const node of nodes) {
    if (node.url) {
      result.push({
        id: node.id,
        title: node.title,
        url: node.url,
        folderId: currentFolder?.id ?? null,
        folderTitle: currentFolder?.title || "Root"
      })
      continue
    }

    const nextFolder = node.title ? node : currentFolder
    result.push(...collectBookmarksWithFolderContext(node.children ?? [], nextFolder))
  }

  return result
}

export function findDefaultFolderId(nodes: chrome.bookmarks.BookmarkTreeNode[]): string | null {
  for (const node of nodes) {
    if (node.url) continue
    if (node.title) return node.id

    const nested = findDefaultFolderId(node.children ?? [])
    if (nested) return nested
  }

  return null
}

export function findFolderTitle(nodes: chrome.bookmarks.BookmarkTreeNode[], folderId: string): string | null {
  for (const node of nodes) {
    if (node.url) continue
    if (node.id === folderId) return node.title || "Root"

    const nested = findFolderTitle(node.children ?? [], folderId)
    if (nested) return nested
  }

  return null
}

export function matchesFilterMode(
  url: string,
  filterMode: BookmarkFilterMode,
  metadataMap: Record<string, BookmarkRecord>
): boolean {
  if (filterMode === "analyzed") return metadataMap[url]?.status === "done"
  if (filterMode === "unanalyzed") return metadataMap[url]?.status !== "done"
  return true
}

export function matchesSearch(
  item: BookmarkListItem,
  query: string,
  metadataMap: Record<string, BookmarkRecord>
): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const record = metadataMap[item.url]
  const fields = [
    item.title,
    item.url,
    item.folderTitle,
    record?.title ?? "",
    record?.summary ?? "",
    ...(record?.aiTags ?? []),
    ...(record?.userTags ?? [])
  ]

  return fields.some((field) => field.toLowerCase().includes(normalizedQuery))
}
