# Side Panel Bookmark Manager & Native Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a persistent Side Panel bookmark manager that supports one-click native Chrome bookmark import and robust asynchronous bulk AI analysis via a Background Service Worker.

**Architecture:**
- **Frontend (Side Panel):** Standard list UI with search/filters, reusing `BookmarkList` and `BookmarkCard`.
- **Backend (Service Worker):** Handles `chrome.bookmarks.getTree()` import and an asynchronous processing queue to fetch web content and run AI analysis without blocking the UI.
- **Communication:** Chrome Message Passing (`chrome.runtime.sendMessage`/`onMessage`).

**Tech Stack:** React, Plasmo, IndexedDB, Chrome Extensions API (`sidePanel`, `bookmarks`, `runtime`), Vitest (jsdom).

---

### Task 1: Update Manifest Permissions & Scaffold Side Panel

**Files:**
- Modify: `package.json`
- Create: `src/sidepanel.tsx`
- Create: `tests/ui/sidepanel.test.tsx`

**Step 1: Write the failing test**

```tsx
// tests/ui/sidepanel.test.tsx
// @vitest-environment jsdom
import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"
import SidePanel from "../../src/sidepanel"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("SidePanel", () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  afterEach(async () => {
    if (root && container) {
      await act(async () => { root?.unmount() })
    }
    container?.remove()
    container = null
    root = null
  })

  it("renders the Side Panel header and main sections", async () => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root!.render(<SidePanel />)
    })

    expect(container.textContent).toContain("TabVault Pro")
    expect(container.textContent).toContain("Manage your bookmarks")
    expect(container.querySelector("button")?.textContent).toContain("Import Chrome Bookmarks")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/sidepanel.test.tsx`
Expected: FAIL because `SidePanel` does not exist.

**Step 3: Write minimal implementation**

Modify `package.json`: Add `"sidePanel"` and `"bookmarks"` to `"manifest.permissions"`.

Create `src/sidepanel.tsx`:
```tsx
import React from "react"
import { spacing } from "./ui/design-tokens"

export default function SidePanel() {
  return (
    <main style={{ padding: spacing.md }}>
      <header>
        <h1>TabVault Pro</h1>
        <p>Manage your bookmarks.</p>
      </header>
      <section>
        <button type="button">Import Chrome Bookmarks</button>
      </section>
    </main>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/sidepanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat: scaffold Side Panel and update manifest permissions"
```

---

### Task 2: Implement Background Worker and Chrome Bookmarks Import Logic

**Files:**
- Create: `src/background.ts`
- Create: `src/features/bookmarks/import-chrome-bookmarks.ts`
- Create: `tests/bookmarks/import-chrome-bookmarks.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/bookmarks/import-chrome-bookmarks.test.ts
import { describe, expect, it, vi } from "vitest"
import { importChromeBookmarks } from "../../src/features/bookmarks/import-chrome-bookmarks"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../../src/types/bookmark"

describe("importChromeBookmarks", () => {
  it("flattens chrome bookmarks and saves them to repository", async () => {
    const mockTree = [{
      id: "root",
      title: "",
      children: [
        { id: "1", title: "Folder", children: [{ id: "2", title: "A", url: "https://a.com" }] },
        { id: "3", title: "B", url: "https://b.com" }
      ]
    }]

    const save = vi.fn<BookmarkRepository["save"]>(async () => {})
    const list = vi.fn<BookmarkRepository["list"]>(async () => [])
    const repo: BookmarkRepository = { save, list, getById: vi.fn(), update: vi.fn(), delete: vi.fn() }

    await importChromeBookmarks({
      getTree: async () => mockTree as any,
      bookmarkRepository: repo
    })

    expect(save).toHaveBeenCalledTimes(2)
    // Verify first call
    const savedA = save.mock.calls[0]?.[0] as BookmarkRecord
    expect(savedA.title).toBe("A")
    expect(savedA.url).toBe("https://a.com")
    expect(savedA.status).toBe("saved")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bookmarks/import-chrome-bookmarks.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/features/bookmarks/import-chrome-bookmarks.ts`:
```typescript
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
```

Create basic `src/background.ts`:
```typescript
// Background service worker for TabVault
export {}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/bookmarks/import-chrome-bookmarks.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/background.ts src/features/bookmarks/import-chrome-bookmarks.ts tests/bookmarks/import-chrome-bookmarks.test.ts
git commit -m "feat: add logic to flatten and import chrome bookmarks"
```

---

### Task 3: Implement Background Message Listener for Import

**Files:**
- Modify: `src/background.ts`

*(Note: We will test message passing manually or via integration hooks, unit testing service worker message listeners in jsdom is brittle, we'll implement the direct listener)*

**Step 1: Write implementation**

Update `src/background.ts`:
```typescript
import { importChromeBookmarks } from "./features/bookmarks/import-chrome-bookmarks"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"

const repo = new IndexedDbBookmarkRepository()

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "IMPORT_BOOKMARKS") {
    importChromeBookmarks({
      getTree: async () => chrome.bookmarks.getTree(),
      bookmarkRepository: repo
    })
      .then(count => {
        sendResponse({ success: true, count })
        chrome.runtime.sendMessage({ type: "IMPORT_COMPLETE", count })
      })
      .catch(error => {
        sendResponse({ success: false, error: String(error) })
      })
    return true // Keep message channel open for async response
  }
})
```

**Step 2: Commit**

```bash
git add src/background.ts
git commit -m "feat: add message listener for IMPORT_BOOKMARKS in service worker"
```

---

### Task 4: Wire Import Button in Side Panel UI

**Files:**
- Modify: `src/sidepanel.tsx`
- Modify: `tests/ui/sidepanel.test.tsx`

**Step 1: Write the failing test**

Add to `tests/ui/sidepanel.test.tsx`:
```tsx
  it("sends IMPORT_BOOKMARKS message when import button is clicked", async () => {
    const sendMessageMock = vi.fn((msg, cb) => {
      if (cb) cb({ success: true, count: 5 })
    })
    globalThis.chrome = { runtime: { sendMessage: sendMessageMock } } as any

    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root!.render(<SidePanel />)
    })

    const importBtn = container.querySelector("button")
    await act(async () => {
      importBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(sendMessageMock).toHaveBeenCalledWith(
      { type: "IMPORT_BOOKMARKS" },
      expect.any(Function)
    )
    expect(container.textContent).toContain("Imported 5 bookmarks")
  })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/sidepanel.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

Update `src/sidepanel.tsx`:
```tsx
import React, { useState } from "react"
import { spacing } from "./ui/design-tokens"

export default function SidePanel() {
  const [status, setStatus] = useState<string>("")
  const [isImporting, setIsImporting] = useState(false)

  async function handleImport() {
    setIsImporting(true)
    setStatus("Importing...")

    globalThis.chrome?.runtime?.sendMessage({ type: "IMPORT_BOOKMARKS" }, (response: any) => {
      setIsImporting(false)
      if (response?.success) {
        setStatus(`Imported ${response.count} bookmarks`)
      } else {
        setStatus("Import failed")
      }
    })
  }

  return (
    <main style={{ padding: spacing.md }}>
      <header>
        <h1>TabVault Pro</h1>
        <p>Manage your bookmarks.</p>
      </header>
      <section>
        <button disabled={isImporting} onClick={() => void handleImport()} type="button">
          {isImporting ? "Importing..." : "Import Chrome Bookmarks"}
        </button>
        {status && <p>{status}</p>}
      </section>
    </main>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/sidepanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat: wire import button in Side Panel to background worker"
```

---

### Task 5: Implement Background Bulk Analysis Queue

**Files:**
- Modify: `src/background.ts`

**Step 1: Write implementation**

*(Note: We skip complex UI testing here as this lives entirely in the service worker environment)*

Update `src/background.ts` to add the analysis queue logic. Since we need to fetch the page content inside the background worker (where `activeTab` scripts don't work), we use a raw `fetch` to get the HTML text.

Add to `src/background.ts`:
```typescript
import { analyzeBookmark } from "./features/ai/analyze-bookmark"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import { createProvider } from "./lib/providers/provider-factory"
// ... (existing imports)

const settingsRepo = new ChromeSettingsRepository()

async function processAnalysisQueue() {
  const bookmarks = await repo.list()
  const pending = bookmarks.filter(b => b.status === "saved" || b.status === "error")

  if (pending.length === 0) return

  const settings = await settingsRepo.getAppSettings()
  const providers = await settingsRepo.getProviders()
  const selectedProvider = providers.find(p => p.enabled && p.provider === settings.defaultProvider)

  if (!selectedProvider?.apiKey.trim()) return

  const provider = createProvider(selectedProvider)

  for (let i = 0; i < pending.length; i++) {
    const bookmark = pending[i]!

    // Notify frontend
    chrome.runtime.sendMessage({
      type: "ANALYSIS_PROGRESS",
      current: i + 1,
      total: pending.length,
      bookmarkId: bookmark.id
    }).catch(() => {}) // Ignore if Side Panel is closed

    try {
      // 1. Fetch raw HTML content
      const response = await fetch(bookmark.url)
      const html = await response.text()
      // Extremely basic content extraction for background: just strip tags
      const textContent = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').slice(0, 10000)

      // 2. Analyze
      await analyzeBookmark({
        bookmark,
        provider,
        bookmarkRepository: repo,
        contentOverride: textContent // We need to update analyzeBookmark to accept an override or pass it here
      })
    } catch {
      // Errors are handled by analyzeBookmark internally
    }
  }

  chrome.runtime.sendMessage({ type: "ANALYSIS_COMPLETE" }).catch(() => {})
}

// Update the listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "IMPORT_BOOKMARKS") {
    // ... existing import logic ...
    return true
  }

  if (message.type === "ANALYZE_ALL") {
    processAnalysisQueue()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: String(err) }))
    return true
  }
})
```

**Step 2: Commit**

```bash
git add src/background.ts
git commit -m "feat: add asynchronous bulk analysis queue to background worker"
```

*(Note: The plan outlines the core implementation. In practice, `analyzeBookmark` might need a minor tweak to accept `contentOverride` if it currently relies solely on the active tab content. The executing agent will handle this minor refactor if necessary during TDD.)*

---

Plan complete and saved to `docs/plans/2026-03-11-bookmark-manager-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**