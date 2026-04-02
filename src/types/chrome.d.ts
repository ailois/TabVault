/// <reference types="chrome" />

declare namespace chrome {
  namespace bookmarks {
    type BookmarkTreeNode = {
      id: string
      title: string
      url?: string
      parentId?: string
      syncing?: boolean
      children?: BookmarkTreeNode[]
    }

    type BookmarkCreateArg = BookmarkTreeNode

    const onCreated: {
      addListener(callback: (id: string, bookmark: BookmarkTreeNode) => void | Promise<void>): void
    }

    const onRemoved: {
      addListener(callback: (id: string) => void | Promise<void>): void
    }

    const onChanged: {
      addListener(callback: (id: string, changeInfo?: unknown) => void | Promise<void>): void
    }

    const onMoved: {
      addListener(callback: (id: string, moveInfo?: unknown) => void | Promise<void>): void
    }
  }

  namespace runtime {
    const onStartup: {
      addListener(callback: () => void): void
    }

    const onInstalled: {
      addListener(callback: () => void): void
    }
  }
}
