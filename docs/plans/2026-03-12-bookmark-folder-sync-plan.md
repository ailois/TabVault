# Bookmark Folder Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement real-time synchronization with Chrome bookmarks and a recursive folder tree UI in the Sidepanel.

**Architecture:** Mirror Mode (Hybrid Data Source). Chrome API provides the structure, IndexedDB stores the AI metadata. A background script listens to Chrome bookmark events and triggers UI updates. The UI renders a recursive tree view or a flat search list depending on the search state.

**Tech Stack:** React, TypeScript, Chrome Extensions API (`chrome.bookmarks`), Plasmo.

---

### Task 1: Extend BookmarkRecord type for Chrome ID compatibility

**Files:**
- Modify: `src/types/bookmark.ts`

**Step 1: Write the failing test**

We don't strictly need a test for a type update, but we should make sure the type definition supports a `chromeId` or that `id` is understood to be the Chrome ID. We will add `chromeId?: string` and `parentId?: string` to `BookmarkRecord`.

```typescript
// No specific unit test for type interface changes.
```

**Step 2: Write minimal implementation**

Modify `src/types/bookmark.ts` to include `chromeId` and `parentId`.
Wait, if `id` is the Chrome ID, we just need `parentId` to build the tree.
Let's add `parentId?: string` to `BookmarkRecord`.

```typescript
export type BookmarkRecord = {
  id: string
  parentId?: string // Added for Chrome bookmark folder hierarchy
  url: string
  title: string
  extractedText?: string
  selectedText?: string
  summary?: string
  tags: string[]
  status: "saved" | "analyzing" | "done" | "error"
  errorMessage?: string
  createdAt: string
  updatedAt: string
}
```

**Step 3: Commit**

```bash
git add src/types/bookmark.ts
git commit -m "feat: add parentId to BookmarkRecord for tree structure"
```

### Task 2: Implement Chrome Bookmark Event Listeners in Background Script

**Files:**
- Modify: `src/background.ts`

**Step 1: Write the failing test**

*(We will test this manually or via mocked integration later, but let's define the listeners).*

**Step 2: Write minimal implementation**

Add listeners for `chrome.bookmarks.onCreated`, `chrome.bookmarks.onRemoved`, `chrome.bookmarks.onChanged`, and `chrome.bookmarks.onMoved` in `src/background.ts`.

When an event fires, send a `BOOKMARKS_CHANGED` message to the frontend.
For `onCreated`, if it's a URL (not a folder), we should save a basic entry to IndexedDB with status="saved" and then trigger analysis if "Auto-analyze on save" is true. (Wait, let's just trigger a sync message first to keep it simple and handle auto-analyze if we want).
Actually, the design says: "If "Auto-analyze on save" is enabled, the `onCreated` listener in `background.ts` will automatically trigger the analysis queue for the new bookmark." and "When `onRemoved` is triggered, the corresponding entry in IndexedDB is deleted".

```typescript
// Add near the end of src/background.ts
if (globalThis.chrome?.bookmarks) {
  chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
    if (bookmark.url) {
      const newRecord = {
        id: bookmark.id,
        parentId: bookmark.parentId,
        url: bookmark.url,
        title: bookmark.title,
        tags: [],
        status: "saved" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await repo.save(newRecord);

      const settings = await settingsRepo.getAppSettings();
      if (settings.autoAnalyzeOnSave) {
        processAnalysisQueue().catch(console.error);
      }
    }
    chrome.runtime.sendMessage({ type: "BOOKMARKS_CHANGED" }).catch(() => {});
  });

  chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
    try {
      await repo.delete(id);
    } catch (e) {
      // Ignore if not found
    }
    chrome.runtime.sendMessage({ type: "BOOKMARKS_CHANGED" }).catch(() => {});
  });

  chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
    chrome.runtime.sendMessage({ type: "BOOKMARKS_CHANGED" }).catch(() => {});
  });

  chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
    chrome.runtime.sendMessage({ type: "BOOKMARKS_CHANGED" }).catch(() => {});
  });
}
```

**Step 3: Commit**

```bash
git add src/background.ts
git commit -m "feat: sync chrome bookmarks events to indexeddb and notify ui"
```

### Task 3: Create Recursive BookmarkTree and FolderNode Components

**Files:**
- Create: `src/components/bookmark-tree.tsx`

**Step 1: Write the failing test**

Since we want to build the tree, we need a component that takes `chrome.bookmarks.BookmarkTreeNode[]` and `BookmarkRecord[]` (for metadata).

**Step 2: Write minimal implementation**

Create `src/components/bookmark-tree.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import type { BookmarkRecord } from "../types/bookmark";
import { colors, radius, spacing } from "../ui/design-tokens";

type BookmarkTreeProps = {
  treeNodes: chrome.bookmarks.BookmarkTreeNode[];
  metadataMap: Record<string, BookmarkRecord>;
  onAnalyze: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function BookmarkTree({ treeNodes, metadataMap, onAnalyze, onDelete }: BookmarkTreeProps) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {treeNodes.map(node => (
        <BookmarkTreeNodeItem
          key={node.id}
          node={node}
          metadataMap={metadataMap}
          onAnalyze={onAnalyze}
          onDelete={onDelete}
          depth={0}
        />
      ))}
    </ul>
  );
}

function BookmarkTreeNodeItem({
  node,
  metadataMap,
  onAnalyze,
  onDelete,
  depth
}: {
  node: chrome.bookmarks.BookmarkTreeNode,
  metadataMap: Record<string, BookmarkRecord>,
  onAnalyze: (id: string) => Promise<void>,
  onDelete: (id: string) => Promise<void>,
  depth: number
}) {
  const [expanded, setExpanded] = useState(() => {
    const saved = localStorage.getItem(`tabvault_folder_${node.id}`);
    return saved ? saved === "true" : false;
  });

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem(`tabvault_folder_${node.id}`, String(next));
  };

  const isFolder = !node.url;
  const paddingLeft = depth * 16 + 8;

  if (isFolder) {
    return (
      <li style={{ margin: 0, padding: 0 }}>
        <div
          onClick={toggle}
          style={{
            padding: `6px 8px 6px ${paddingLeft}px`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            color: colors.textPrimary,
            fontSize: "0.875rem",
            fontWeight: 500,
            borderBottom: `1px solid ${colors.borderMuted}`
          }}
        >
          <span style={{ marginRight: "8px", width: "16px", textAlign: "center" }}>
            {expanded ? "▾" : "▸"}
          </span>
          📁 {node.title || "Unnamed Folder"}
        </div>
        {expanded && node.children && node.children.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {node.children.map(child => (
              <BookmarkTreeNodeItem
                key={child.id}
                node={child}
                metadataMap={metadataMap}
                onAnalyze={onAnalyze}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  // It's a bookmark
  const meta = metadataMap[node.id];
  const status = meta?.status;
  const showAnalyzeButton = status === "saved" || status === "error";

  return (
    <li style={{ margin: 0, padding: 0 }}>
      <div style={{
        padding: `6px 8px 6px ${paddingLeft + 24}px`,
        display: "flex",
        alignItems: "center",
        borderBottom: `1px solid ${colors.borderMuted}`,
        gap: spacing.xs
      }}>
        <div style={{ flexShrink: 0, width: "8px", display: "flex", alignItems: "center" }}>
          {status === "analyzing" && <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#f59e0b" }} title="Analyzing" />}
          {status === "error" && <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: colors.textDanger }} title="Error" />}
          {status === "done" && <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e" }} title="Done" />}
        </div>
        <a
          href={node.url}
          rel="noreferrer"
          target="_blank"
          title={node.title}
          style={{
            color: colors.textPrimary,
            textDecoration: "none",
            fontSize: "0.875rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1
          }}
        >
          {node.title}
        </a>
        <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
          {showAnalyzeButton && (
            <button
              onClick={() => onAnalyze(node.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: "0.75rem", padding: "2px 4px", borderRadius: radius.small }}
              type="button"
            >
              Analyze
            </button>
          )}
          <button
            onClick={() => {
              if (window.confirm("Delete this bookmark from Chrome?")) {
                chrome.bookmarks.remove(node.id).then(() => onDelete(node.id)).catch(console.error);
              }
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: "0.75rem", padding: "2px 4px", borderRadius: radius.small }}
            type="button"
          >
            ×
          </button>
        </div>
      </div>
    </li>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/bookmark-tree.tsx
git commit -m "feat: add recursive bookmark tree component"
```

### Task 4: Update Sidepanel to Use Tree View and Chrome Bookmarks API

**Files:**
- Modify: `src/sidepanel.tsx`
- Modify: `tests/ui/sidepanel.test.tsx` (fix tests)

**Step 1: Write minimal implementation**

Modify `src/sidepanel.tsx` to fetch the Chrome bookmark tree along with IndexedDB metadata. Switch between `BookmarkTree` (when no search query) and `BookmarkList` (when search query exists).

```tsx
// Inside Sidepanel component:
const [bookmarkTree, setBookmarkTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);

// In loadBookmarks:
async function loadBookmarks(): Promise<void> {
  setIsLoadingBookmarks(true)
  try {
    const savedBookmarks = await sidePanelServices.bookmarkRepository.list()
    setBookmarks(savedBookmarks)
    if (globalThis.chrome?.bookmarks) {
      const tree = await chrome.bookmarks.getTree();
      // Usually root has one child (id "0") containing Bookmarks Bar, Other Bookmarks, Mobile Bookmarks
      setBookmarkTree(tree[0]?.children || tree);
    }
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : "Failed to load bookmarks")
  } finally {
    setIsLoadingBookmarks(false)
  }
}

// In useEffect for message listener, add:
if (message.type === "BOOKMARKS_CHANGED") {
  void loadBookmarks();
}

// In render section, replace <BookmarkList /> with:
{searchQuery ? (
  <BookmarkList
    bookmarks={filteredBookmarks}
    compact={true}
    onDelete={handleDeleteBookmark}
    onAnalyze={handleAnalyzeBookmark}
  />
) : (
  <BookmarkTree
    treeNodes={bookmarkTree}
    metadataMap={bookmarks.reduce((acc, b) => ({ ...acc, [b.id]: b }), {})}
    onAnalyze={handleAnalyzeBookmark}
    onDelete={handleDeleteBookmark}
  />
)}
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/sidepanel.test.tsx`
Expected: FAIL because `chrome.bookmarks.getTree` is not defined in the mock global scope.

**Step 3: Fix tests**

In `tests/ui/sidepanel.test.tsx`, mock `chrome.bookmarks`:

```typescript
// Inside the test setup:
globalThis.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() }
  },
  bookmarks: {
    getTree: vi.fn(async () => [{ id: "0", children: [] }]),
    onCreated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
    onChanged: { addListener: vi.fn() },
    onMoved: { addListener: vi.fn() }
  }
} as any
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/sidepanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat: integrate bookmark tree into sidepanel and support live sync"
```

### Task 5: Clean up Old Import Logic (Optional but recommended)

**Files:**
- Modify: `src/sidepanel.tsx`
- Remove: "Import Chrome Bookmarks" button.

Since we are automatically syncing, the manual import button is redundant and confusing. We should hide it or remove it from the Sidepanel footer.
Wait, if users have a lot of bookmarks, they might need an initial sync button to save everything to IndexedDB?
Actually, the Mirror Mode architecture means the tree renders directly from `chrome.bookmarks`. Metadata is populated lazily or when "Analyze All" is clicked. We don't necessarily need to "import" everything into IndexedDB anymore unless they are analyzed!
For this plan, just removing the Import button from the UI is sufficient to clean up the UX.

**Step 1: Write minimal implementation**

In `src/sidepanel.tsx`:
Remove the `footer` section that contains the "Import Bookmarks" button.
Also, remove `isImporting`, `handleImport`, and `IMPORT_COMPLETE` listener if desired, though leaving the listener is fine for background task completeness.

**Step 2: Commit**

```bash
git add src/sidepanel.tsx
git commit -m "refactor: remove manual import button as sidepanel uses live sync"
```

---

Plan complete.
