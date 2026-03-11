import type { BookmarkRepository } from "../../lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../../types/bookmark"

type ChromeBookmarkTreeNode = {
  id: string;
  title: string;
  url?: string;
  children?: ChromeBookmarkTreeNode[];
}

type ImportDependencies = {
  getTree: () => Promise<ChromeBookmarkTreeNode[]>
  bookmarkRepository: BookmarkRepository
}

export async function importChromeBookmarks({ getTree, bookmarkRepository }: ImportDependencies): Promise<number> {
  const tree = await getTree()
  const existing = await bookmarkRepository.list()
  const existingUrls = new Set(existing.map(b => b.url))

  const nodes: ChromeBookmarkTreeNode[] = []
  function traverse(nodesArray: ChromeBookmarkTreeNode[]) {
    for (const node of nodesArray) {
      if (node.url) {
        nodes.push(node)
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  traverse(tree)

  let count = 0
  for (const node of nodes) {
    if (node.url && !existingUrls.has(node.url)) {
      const record: BookmarkRecord = {
        id: crypto.randomUUID(),
        title: node.title,
        url: node.url,
        status: "saved",
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await bookmarkRepository.save(record)
      count++
    }
  }
  return count
}
