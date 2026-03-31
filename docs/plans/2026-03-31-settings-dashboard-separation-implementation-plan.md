# Settings / Dashboard Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `src/options.tsx` into a pure settings page aligned with `design/settings.html`, remove the settings `Bookmarks` tab entirely, and migrate its bookmark workspace behavior into the standalone dashboard while restyling the dashboard toward `design/dashboard.html`.

**Architecture:** Keep settings state, provider save logic, license logic, and theme infrastructure in `src/options.tsx`, but delete all bookmark-workspace ownership from that file. Extract the bookmark browsing/search/folder helpers into a dashboard-focused module, then expand `DashboardShell` to own folder tree loading, result derivation, active selection, and single-bookmark actions across the left navigation, center reading pane, and right AI sidebar.

**Tech Stack:** React, TypeScript, Plasmo, Chrome extension APIs, Vitest, jsdom

---

## Implementation guardrails

- Run implementation in a dedicated worktree via `@using-git-worktrees` before touching source files.
- Use `@test-driven-development` before each implementation slice.
- Use `@verification-before-completion` before claiming the work is done.
- Do **not** edit generated output under `.plasmo/**` or build artifacts.
- Do **not** add a replacement Bookmarks placeholder inside settings; remove the settings bookmark surface cleanly.
- Keep existing repository contracts intact:
  - `SettingsRepository`
  - `BookmarkRepository`
  - `IndexedDbBookmarkRepository`
- Reuse the existing theme token system; do not introduce a parallel styling system.
- Prefer moving bookmark workspace logic out of `src/options.tsx` over rewriting it.

## Current code to understand first

- `src/options.tsx:47` defines `type OptionsTab = "settings" | "bookmarks"`
- `src/options.tsx:459` conditionally renders the settings vs bookmarks page
- `src/options.tsx:655` starts `SettingsTabContent(...)`
- `src/options.tsx:1156` starts `BookmarksTab(...)`
- `src/options.tsx:1640` starts `BookmarkDetailPanel(...)`
- `src/features/dashboard/dashboard-shell.tsx:18` owns the current three-column dashboard shell
- `src/features/dashboard/dashboard-navigation.tsx:14` renders the left rail
- `src/features/dashboard/dashboard-reading-pane.tsx:11` renders the center reading view
- `src/features/dashboard/dashboard-ai-sidebar.tsx:17` renders the right sidebar
- `src/components/bookmark-tree.tsx:25` already contains reusable folder-tree behavior

## Stable test targets to preserve or add

- Keep: `data-testid="options-dashboard-shell"`
- Keep: `data-testid="options-sidebar"`
- Keep: `data-testid="options-main-content"`
- Keep: `data-testid="settings-workspace"`
- Keep: `data-testid="settings-save-actions"`
- Remove from settings usage: `data-testid="options-nav-bookmarks"`, `data-testid="bookmarks-workspace"`
- Add dashboard-focused selectors as needed:
  - `data-testid="dashboard-shell"`
  - `data-testid="dashboard-navigation"`
  - `data-testid="dashboard-folder-tree"`
  - `data-testid="dashboard-search-input"`
  - `data-testid="dashboard-results-column"`
  - `data-testid="dashboard-result-button"`
  - `data-testid="dashboard-reading-pane"`
  - `data-testid="dashboard-ai-sidebar"`

---

### Task 1: Remove bookmarks navigation from settings

**Files:**
- Modify: `src/options.tsx:45-53`
- Modify: `src/options.tsx:180-235`
- Modify: `src/options.tsx:411-528`
- Test: `tests/ui/options.test.tsx`

**Step 1: Write the failing test**

Add a new settings-only navigation test in `tests/ui/options.test.tsx`:

```tsx
it("renders settings as the only primary options destination", async () => {
  await renderOptions()

  expect(container?.querySelector('[data-testid="options-nav-settings"]')?.getAttribute("aria-pressed")).toBe("true")
  expect(container?.querySelector('[data-testid="options-nav-bookmarks"]')).toBeNull()
  expect(container?.textContent).not.toContain("Bookmarks")
  expect(container?.querySelector('[data-testid="settings-page-shell"]')).toBeTruthy()
})
```

Update any older assertions in the same file that still require the `Bookmarks` item to exist.

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/ui/options.test.tsx -t "renders settings as the only primary options destination"
```

Expected: FAIL because the options sidebar still renders `Settings` and `Bookmarks`.

**Step 3: Write minimal implementation**

In `src/options.tsx`, collapse the top-level state from two views to one:

```tsx
type OptionsTab = "settings"

const [activeTab] = React.useState<OptionsTab>("settings")
```

Then replace the sidebar nav map:

```tsx
<nav style={{ display: "grid", gap: spacing.xs }}>
  <button
    aria-pressed={true}
    data-testid="options-nav-settings"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      padding: `${spacing.sm} ${spacing.md}`,
      border: `1px solid ${theme.borderFocus}`,
      borderRadius: "12px",
      backgroundColor: theme.accentSoft,
      color: theme.textPrimary,
      fontSize: "0.875rem",
      fontWeight: 600,
      cursor: "default"
    }}
    type="button"
  >
    <span>Settings</span>
    <span aria-hidden="true" style={{ color: theme.accent, fontSize: "0.75rem" }}>●</span>
  </button>
</nav>
```

And replace the main area conditional render with a direct settings render:

```tsx
<div data-testid="options-main-content" style={{ ... }}>
  <div data-testid="settings-page-shell" style={{ width: "100%", minWidth: 0, display: "grid", gap: spacing.lg }}>
    {/* existing header, license block, SettingsTabContent */}
  </div>
</div>
```

Delete the branch that renders `<BookmarksTab services={optionsServices} />`.

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/ui/options.test.tsx
```

Expected: PASS for updated settings-shell assertions.

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options.test.tsx
git commit -m "refactor: remove bookmarks navigation from settings"
```

---

### Task 2: Restyle settings page to match `design/settings.html`

**Files:**
- Modify: `src/options.tsx:462-1019`
- Test: `tests/ui/options.test.tsx`
- Test: `tests/ui/options-architecture-sections.test.tsx`

**Step 1: Write the failing test**

Add a test that locks the new settings framing and architecture sections:

```tsx
it("renders settings with architecture-style header and section grouping", async () => {
  await renderOptions()

  expect(container?.textContent).toContain("Architecture Settings")
  expect(container?.textContent).toContain("Provider & Protocol")
  expect(container?.textContent).toContain("Retrieval Architecture")
  expect(container?.textContent).toContain("Experience & Theme")
  expect(container?.textContent).toContain("Trial & License")
  expect(container?.querySelector('[data-testid="settings-save-actions"]')).toBeTruthy()
})
```

Update `tests/ui/options-architecture-sections.test.tsx` to assert this same settings-only grouping.

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/ui/options.test.tsx tests/ui/options-architecture-sections.test.tsx
```

Expected: FAIL because the current header still reads `Settings` and uses the older shell wording.

**Step 3: Write minimal implementation**

In `src/options.tsx`, update the settings page header block to mirror `design/settings.html` language and structure:

```tsx
<header data-testid="settings-page-header" style={{ display: "grid", gap: spacing.sm }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: spacing.md }}>
    <div style={{ display: "grid", gap: "6px" }}>
      <h1 style={{ margin: 0, fontSize: "1.875rem", fontWeight: 800, color: theme.textPrimary }}>
        Architecture Settings
      </h1>
      <p data-testid="settings-page-description" style={{ margin: 0, color: theme.textMuted, fontSize: "0.875rem", lineHeight: 1.6 }}>
        Configure provider protocols, retrieval architecture, experience behavior, and licensing.
      </p>
    </div>
  </div>
</header>
```

Keep the current cards and save area logic, but update card wrappers, spacing, and titles so the sections visually read like the design reference.

Important: keep the section headings already used by tests:
- `Provider & Protocol`
- `Retrieval Architecture`
- `Experience & Theme`
- `Trial & License`

**Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/ui/options.test.tsx tests/ui/options-architecture-sections.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options.test.tsx tests/ui/options-architecture-sections.test.tsx
git commit -m "feat: align settings page with architecture design"
```

---

### Task 3: Remove the in-file bookmarks workspace from `src/options.tsx`

**Files:**
- Modify: `src/options.tsx:49-153`
- Modify: `src/options.tsx:1156-1820`
- Test: `tests/ui/options-bookmarks-dashboard.test.tsx`
- Test: `tests/ui/options-bookmarks-tag-editing.test.tsx`

**Step 1: Write the failing tests**

Replace the old settings-bookmarks expectations with explicit absence tests:

```tsx
it("does not render a bookmarks workspace inside settings", async () => {
  await renderOptions()

  expect(container?.querySelector('[data-testid="bookmarks-workspace"]')).toBeNull()
  expect(container?.textContent).not.toContain("YOUR FOLDERS")
  expect(container?.textContent).not.toContain("DETAILS")
})
```

In `tests/ui/options-bookmarks-tag-editing.test.tsx`, replace the old integration path with a regression guard:

```tsx
it("does not expose bookmark detail editing inside options", async () => {
  await renderOptions(makeSettingsRepository())

  expect(container?.querySelector('[data-testid="detail-tags-edit-button"]')).toBeNull()
  expect(container?.querySelector('[data-testid="detail-analyze-button"]')).toBeNull()
})
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx
```

Expected: FAIL because `BookmarksTab` and `BookmarkDetailPanel` still exist in `src/options.tsx`.

**Step 3: Write minimal implementation**

Delete bookmark-workspace-specific code from `src/options.tsx` after confirming nothing settings-related uses it anymore:

Delete these helpers from `src/options.tsx` and move them later in Task 4:
- `collectBookmarksWithFolderContext(...)`
- `findDefaultFolderId(...)`
- `findFolderTitle(...)`
- `matchesFilterMode(...)`
- `matchesSearch(...)`

Delete these components/functions from `src/options.tsx`:
- `BookmarksTab(...)`
- `BookmarkDetailPanel(...)`
- any bookmark list/details-only subcomponents no longer referenced
- bookmark-only resize helpers that are no longer used by settings

After removal, `src/options.tsx` should only compile around settings responsibilities.

**Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx tests/ui/options.test.tsx
```

Expected: PASS with the updated settings-only assertions.

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx tests/ui/options.test.tsx
git commit -m "refactor: remove bookmark workspace from options page"
```

---

### Task 4: Extract bookmark workspace helpers into a dashboard module

**Files:**
- Create: `src/features/dashboard/bookmark-workspace.ts`
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Test: `tests/ui/dashboard-data.test.tsx`

**Step 1: Write the failing test**

Add a small focused data-flow test that will depend on folder/search derivation functions being available to the dashboard:

```tsx
it("shows the selected bookmark content after dashboard-level result derivation", async () => {
  await renderDashboard([
    createBookmark({ id: "1", title: "React Docs", url: "https://react.dev", extractedText: "React content" })
  ])

  const button = Array.from(container?.querySelectorAll("button") ?? []).find((el) => el.textContent?.includes("React Docs"))
  await act(async () => {
    ;(button as HTMLButtonElement | undefined)?.click()
  })

  expect(container?.textContent).toContain("React content")
})
```

**Step 2: Run test to verify it fails when helper extraction is incomplete**

Run:
```bash
npx vitest run tests/ui/dashboard-data.test.tsx
```

Expected: either current PASS or no meaningful coverage. If it already passes, add one more assertion later in Task 5 that depends on the extracted helper behavior. The point is to create the helper module before expanding dashboard behavior.

**Step 3: Write minimal implementation**

Create `src/features/dashboard/bookmark-workspace.ts` with the moved types and helpers:

```ts
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
```

Update `dashboard-shell.tsx` imports to use this new module when you wire in richer state later.

**Step 4: Run tests to verify it passes**

Run:
```bash
npx vitest run tests/ui/dashboard-data.test.tsx tests/ui/dashboard-shell.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/dashboard/bookmark-workspace.ts src/features/dashboard/dashboard-shell.tsx tests/ui/dashboard-data.test.tsx
git commit -m "refactor: extract dashboard bookmark workspace helpers"
```

---

### Task 5: Expand `DashboardShell` to load folder tree and render folder-scoped results

**Files:**
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Modify: `src/features/dashboard/dashboard-navigation.tsx`
- Modify: `src/components/bookmark-tree.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`
- Test: `tests/ui/dashboard-repository-load.test.tsx`

**Step 1: Write the failing tests**

Add one dashboard-shell test for folder navigation and one repository-load test for tree-backed rendering:

```tsx
it("renders a dashboard folder tree and updates results when a folder is selected", async () => {
  await renderDashboardWithTree()

  expect(container?.querySelector('[data-testid="dashboard-folder-tree"]')).not.toBeNull()
  expect(container?.textContent).toContain("React Docs")
  expect(container?.textContent).toContain("Vue Docs")

  const otherBookmarks = Array.from(container?.querySelectorAll('[role="button"]') ?? []).find((el) => el.textContent?.includes("Other Bookmarks"))
  await act(async () => {
    ;(otherBookmarks as HTMLElement | undefined)?.click()
  })

  expect(container?.textContent).toContain("Svelte Docs")
  expect(container?.textContent).not.toContain("React Docs")
})
```

```tsx
it("loads bookmarks and browser folders into the dashboard workspace", async () => {
  await renderDashboard(listBookmarks)

  expect(container?.querySelector('[data-testid="dashboard-navigation"]')).not.toBeNull()
  expect(container?.querySelector('[data-testid="dashboard-folder-tree"]')).not.toBeNull()
})
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-repository-load.test.tsx
```

Expected: FAIL because `DashboardNavigation` still renders a flat bookmark button list and `DashboardShell` does not load `chrome.bookmarks.getTree()`.

**Step 3: Write minimal implementation**

Update `DashboardShell` props and state so it can own both bookmark metadata and folder tree:

```tsx
type DashboardShellProps = {
  initialBookmarks?: BookmarkRecord[]
  initialTree?: chrome.bookmarks.BookmarkTreeNode[]
  listBookmarks?: () => Promise<BookmarkRecord[]>
  getBookmarkTree?: () => Promise<chrome.bookmarks.BookmarkTreeNode[]>
  updateBookmark?: (bookmark: BookmarkRecord) => Promise<void>
}
```

Add state:

```tsx
const [chromeTree, setChromeTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>(initialTree ?? [])
const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
const [searchQuery, setSearchQuery] = useState("")
```

Load both data sources:

```tsx
useEffect(() => {
  if (initialBookmarks && initialTree) return

  const loadBookmarks = listBookmarks ?? (() => bookmarkRepository.list())
  const loadTree = getBookmarkTree ?? (() => chrome.bookmarks.getTree())

  void Promise.all([loadBookmarks(), loadTree()]).then(([records, tree]) => {
    setBookmarks(records)
    setChromeTree(tree)
  })
}, [bookmarkRepository, getBookmarkTree, initialBookmarks, initialTree, listBookmarks])
```

Derive results using the helper module, then pass folder-tree props to `DashboardNavigation`.

Update `DashboardNavigation` to render:
- branding
- `data-testid="dashboard-folder-tree"`
- a `BookmarkTree` with `showBookmarks={false}` and `variant="options"`
- the visible result list for the selected folder beneath it or in a dedicated middle column controlled by `DashboardShell`

If keeping the middle results column in `DashboardShell` is cleaner, keep `DashboardNavigation` folder-only and render a new results pane inline in `DashboardShell`.

**Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-repository-load.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-shell.tsx src/features/dashboard/dashboard-navigation.tsx src/components/bookmark-tree.tsx tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-repository-load.test.tsx
git commit -m "feat: add folder-driven bookmark workspace to dashboard"
```

---

### Task 6: Add dashboard search and result-list behavior from the old bookmarks tab

**Files:**
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Create: `src/features/dashboard/dashboard-results-list.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**

Add a test modeled after the old settings bookmark search behavior:

```tsx
it("switches the dashboard results column to search mode when typing", async () => {
  await renderDashboardWithTree()

  const searchInput = container?.querySelector<HTMLInputElement>('[data-testid="dashboard-search-input"]')
  const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

  await act(async () => {
    setValue?.call(searchInput, "svelte")
    searchInput?.dispatchEvent(new Event("input", { bubbles: true }))
  })

  expect(container?.textContent).toContain("Svelte Docs")
  expect(container?.textContent).not.toContain("React Docs")
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/ui/dashboard-shell.test.tsx -t "switches the dashboard results column to search mode when typing"
```

Expected: FAIL because there is no dashboard search input or search-derived result set.

**Step 3: Write minimal implementation**

Create `src/features/dashboard/dashboard-results-list.tsx`:

```tsx
import React from "react"
import type { BookmarkListItem } from "./bookmark-workspace"
import type { BookmarkRecord } from "../../types/bookmark"
import { spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"

type DashboardResultsListProps = {
  bookmarks: BookmarkListItem[]
  metadataMap: Record<string, BookmarkRecord>
  activeUrl: string | null
  onSelectUrl: (url: string) => void
}

export function DashboardResultsList({ bookmarks, metadataMap, activeUrl, onSelectUrl }: DashboardResultsListProps) {
  const theme = useThemeContext()

  return (
    <section data-testid="dashboard-results-column" style={{ width: "320px", minWidth: "320px", borderRight: `1px solid ${theme.border}`, backgroundColor: theme.surface, padding: spacing.md, overflowY: "auto" }}>
      {bookmarks.map((bookmark) => {
        const record = metadataMap[bookmark.url]
        const selected = activeUrl === bookmark.url
        return (
          <button
            key={bookmark.id}
            data-testid="dashboard-result-button"
            onClick={() => onSelectUrl(bookmark.url)}
            style={{
              width: "100%",
              textAlign: "left",
              marginBottom: spacing.xs,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: "14px",
              border: `1px solid ${selected ? theme.borderFocus : theme.border}`,
              backgroundColor: selected ? theme.accentSoft : theme.surfaceSubtle,
              color: theme.textPrimary,
              cursor: "pointer"
            }}
            type="button"
          >
            <div style={{ fontWeight: 600 }}>{bookmark.title}</div>
            <div style={{ fontSize: "0.75rem", color: theme.textMuted }}>{bookmark.url}</div>
            <div style={{ fontSize: "0.75rem", color: theme.textMuted }}>{record?.summary ?? "No summary yet"}</div>
          </button>
        )
      })}
    </section>
  )
}
```

Then wire `DashboardShell` to:
- render a top search box with `data-testid="dashboard-search-input"`
- derive `visibleBookmarks` using `matchesSearch(...)`
- render `DashboardResultsList`
- set `activeBookmark` based on the clicked URL

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-shell.tsx src/features/dashboard/dashboard-results-list.tsx tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx
git commit -m "feat: add dashboard bookmark search and results list"
```

---

### Task 7: Move bookmark detail actions into the dashboard right sidebar

**Files:**
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx`
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Test: `tests/ui/dashboard-editing.test.tsx`
- Test: `tests/ui/dashboard-persistence.test.tsx`
- Test: `tests/ui/dashboard-ask-box.test.tsx`

**Step 1: Write the failing test**

Add a dashboard integration test that locks the migrated single-bookmark actions into the right sidebar:

```tsx
it("shows summary, tags, and ask controls for the active bookmark in the dashboard sidebar", async () => {
  await renderDashboard([
    createBookmark({ id: "1", title: "React Docs", summary: "React summary", aiTags: ["react"], userTags: ["docs"] })
  ])

  await selectBookmark("React Docs")

  expect(container?.querySelector('[data-testid="dashboard-ai-sidebar"]')).not.toBeNull()
  expect(container?.textContent).toContain("React summary")
  expect(container?.textContent).toContain("react")
  expect(container?.querySelector('[data-testid="dashboard-ask-input"]')).not.toBeNull()
})
```

If missing, add a new test for analyze/retry button presence after selecting a bookmark.

**Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-persistence.test.tsx tests/ui/dashboard-ask-box.test.tsx
```

Expected: FAIL if the richer migrated behavior is not yet wired from `DashboardShell` state into `DashboardAiSidebar`.

**Step 3: Write minimal implementation**

Keep the existing cards, but expand the dashboard sidebar contract:

```tsx
type DashboardAiSidebarProps = {
  bookmark: BookmarkRecord | null
  onAnalyze?: () => Promise<void>
  onSaveSummary?: (summary: string) => Promise<void>
  onSaveTags?: (aiTags: string[], userTags: string[]) => Promise<void>
  width?: number
}
```

Render the extra action area above the cards:

```tsx
{bookmark ? (
  <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap" }}>
    <button data-testid="dashboard-analyze-button" onClick={() => void onAnalyze?.()} type="button">
      Analyze
    </button>
  </div>
) : null}
```

In `DashboardShell`, keep `handleSaveSummary(...)` and `handleSaveTags(...)`, and add a minimal `handleAnalyze()` hook point even if the first pass only supports already-loaded bookmark metadata.

Do not add unrelated global maintenance actions here.

**Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-persistence.test.tsx tests/ui/dashboard-ask-box.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-ai-sidebar.tsx src/features/dashboard/dashboard-shell.tsx tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-persistence.test.tsx tests/ui/dashboard-ask-box.test.tsx
git commit -m "feat: move bookmark detail actions into dashboard sidebar"
```

---

### Task 8: Restyle dashboard toward `design/dashboard.html`

**Files:**
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Modify: `src/features/dashboard/dashboard-navigation.tsx`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx`
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx`
- Modify: `src/features/dashboard/dashboard-results-list.tsx`
- Test: `tests/ui/dashboard-shell.test.tsx`

**Step 1: Write the failing test**

Add a layout-oriented smoke test that checks the dashboard now exposes the design-inspired composition:

```tsx
it("renders a design-aligned dashboard with search, results, reading pane, and AI sidebar", async () => {
  await renderDashboard([createBookmark({ id: "1", title: "React Docs", extractedText: "React content" })])

  expect(container?.querySelector('[data-testid="dashboard-search-input"]')).not.toBeNull()
  expect(container?.querySelector('[data-testid="dashboard-results-column"]')).not.toBeNull()
  expect(container?.querySelector('[data-testid="dashboard-reading-pane"]')).not.toBeNull()
  expect(container?.querySelector('[data-testid="dashboard-ai-sidebar"]')).not.toBeNull()
})
```

Update any brittle assertions that still assume the old flat left-rail bookmark list.

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/ui/dashboard-shell.test.tsx
```

Expected: FAIL until the search + results + reading + AI composition is complete.

**Step 3: Write minimal implementation**

Update the shell and component styling to reflect the design reference:

- `DashboardShell`
  - add a top search/header strip
  - use a workspace composition closer to left navigation + results + reading + right AI cards
- `DashboardNavigation`
  - use branding, muted section labels, and softer active states
- `DashboardReadingPane`
  - match card/header/fade treatment from `design/dashboard.html`
- `DashboardAiSidebar`
  - use stacked cards for summary, tags, and ask box with the same surface rhythm

Use theme-token-driven styles like:

```tsx
backgroundColor: theme.page
border: `1px solid ${theme.border}`
borderRadius: radius.xl
boxShadow: theme.isDark ? "0 10px 28px rgba(0,0,0,0.24)" : "0 8px 24px rgba(15,23,42,0.06)"
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx tests/ui/dashboard-repository-load.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-shell.tsx src/features/dashboard/dashboard-navigation.tsx src/features/dashboard/dashboard-reading-pane.tsx src/features/dashboard/dashboard-ai-sidebar.tsx src/features/dashboard/dashboard-results-list.tsx tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx tests/ui/dashboard-repository-load.test.tsx
git commit -m "feat: align dashboard workspace with design reference"
```

---

### Task 9: Run full verification and remove stale settings-bookmarks assumptions

**Files:**
- Modify as needed: `tests/ui/options-load-state.test.tsx`
- Modify as needed: `tests/ui/options-save-state.test.tsx`
- Modify as needed: any dashboard test that still assumes the old layout

**Step 1: Write the final regression test if missing**

If not already covered, add one final settings regression test:

```tsx
it("keeps provider save behavior intact after bookmarks removal", async () => {
  await renderOptions(settingsRepository)
  await clickSave()
  await flushPromises()

  expect(saveProviders).toHaveBeenCalled()
})
```

**Step 2: Run the targeted UI suite**

Run:
```bash
npx vitest run tests/ui/options.test.tsx tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx tests/ui/options-architecture-sections.test.tsx tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx tests/ui/dashboard-repository-load.test.tsx tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-persistence.test.tsx tests/ui/dashboard-ask-box.test.tsx
```

Expected: PASS.

**Step 3: Run the broader extension-facing suite**

Run:
```bash
npx vitest run tests/ui tests/bookmarks tests/storage
```

Expected: PASS. If failures appear, fix only real regressions caused by moving bookmark responsibilities out of settings.

**Step 4: Verify no stale settings-bookmarks strings remain**

Run:
```bash
git grep -n "options-nav-bookmarks\|bookmarks-workspace\|Bookmarks tab"
```

Expected: no remaining production references to removed settings-bookmarks concepts.

**Step 5: Commit**

```bash
git add src tests
git commit -m "test: verify settings-dashboard separation"
```

---

## Final review checklist

- `src/options.tsx` is settings-only
- settings UI is visually aligned with `design/settings.html`
- settings no longer renders bookmark browsing or detail surfaces
- bookmark workspace helpers live in dashboard-focused code
- `DashboardShell` owns folder tree + result derivation + active bookmark state
- dashboard includes search, result list, reading pane, and AI sidebar
- dashboard is visually aligned with `design/dashboard.html`
- maintenance actions remain in settings
- options tests no longer assume bookmarks live in settings
- dashboard tests now cover the migrated bookmark workflows

## Suggested verification commands

```bash
npx vitest run tests/ui/options.test.tsx tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx tests/ui/options-architecture-sections.test.tsx tests/ui/dashboard-shell.test.tsx tests/ui/dashboard-data.test.tsx tests/ui/dashboard-repository-load.test.tsx tests/ui/dashboard-editing.test.tsx tests/ui/dashboard-persistence.test.tsx tests/ui/dashboard-ask-box.test.tsx
```

```bash
npx vitest run tests/ui tests/bookmarks tests/storage
```

```bash
git status --short
```
