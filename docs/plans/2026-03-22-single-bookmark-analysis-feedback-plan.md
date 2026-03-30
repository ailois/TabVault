# Single Bookmark Analysis Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add immediate inline loading feedback when a user clicks Analyze on a single bookmark, eliminating the "looks frozen" gap in sidepanel, popup, and options.

**Architecture:** Each container page (sidepanel, popup, options) tracks a local `Set<string>` of bookmark IDs/URLs currently being analyzed. On click, the target is added to the set before the async call starts, causing an immediate re-render with `status: "analyzing"` merged into the displayed bookmark record. The set entry is removed in `finally` after reload. The `BookmarkCard` component is updated with a clearer inline spinner+text for the `analyzing` state.

**Tech Stack:** React 18, TypeScript, Vitest, jsdom. Test runner: `npx vitest run <test-file>`.

---

### Task 1: Update BookmarkCard analyzing indicator (component layer)

**Files:**
- Modify: `src/components/bookmark-list.tsx`
- Test: `tests/ui/bookmark-card.test.tsx`

**Step 1: Write the failing test**

Add this test inside the existing `describe("BookmarkCard", ...)` block in `tests/ui/bookmark-card.test.tsx`, after the existing "shows Analyzing... badge when status is analyzing" test:

```typescript
it("shows a spinner element next to the analyzing badge when status is analyzing", async () => {
  await renderList([createBookmark({ status: "analyzing" })])

  const badge = getCard()?.querySelector("[data-testid='bookmark-status-badge']")
  const spinner = getCard()?.querySelector("[data-testid='bookmark-analyzing-spinner']")

  expect(badge?.textContent).toContain("Analyzing")
  expect(spinner).not.toBeNull()
})

it("shows analyzing indicator in compact card when status is analyzing", async () => {
  await renderCompactList([createBookmark({ status: "analyzing" })])

  const spinner = getCard()?.querySelector("[data-testid='bookmark-analyzing-spinner']")
  expect(spinner).not.toBeNull()
})
```

You also need a `renderCompactList` helper below the existing `renderList` function:

```typescript
async function renderCompactList(
  bookmarks: BookmarkRecord[],
  onDelete: (id: string) => Promise<void> = vi.fn(async () => undefined),
  onAnalyze: (id: string) => Promise<void> = vi.fn(async () => undefined),
  onClearAnalysis: (id: string) => Promise<void> = vi.fn(async () => undefined)
): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(
      <BookmarkList
        bookmarks={bookmarks}
        compact={true}
        onAnalyze={onAnalyze}
        onClearAnalysis={onClearAnalysis}
        onDelete={onDelete}
      />
    )
  })
}
```

**Step 2: Run to verify it fails**

```
npx vitest run tests/ui/bookmark-card.test.tsx
```

Expected: FAIL — spinner element not found.

**Step 3: Update the analyzing indicator in BookmarkCard (full card)**

In `src/components/bookmark-list.tsx`, find the full card's analyzing block (around line 218):

```typescript
{bookmark.status === "analyzing" ? (
  <div
    data-testid="bookmark-status-badge"
    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.6875rem", color: "#d97706", fontWeight: 500 }}
  >
    <span style={{ width: "8px", height: "8px", backgroundColor: "#fbbf24", borderRadius: "50%", display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }} />
    Analyzing with LLM...
  </div>
) : null}
```

Replace with:

```typescript
{bookmark.status === "analyzing" ? (
  <div
    data-testid="bookmark-status-badge"
    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.6875rem", color: "#d97706", fontWeight: 500 }}
  >
    <span
      data-testid="bookmark-analyzing-spinner"
      style={{
        width: "10px",
        height: "10px",
        border: "2px solid #fde68a",
        borderTopColor: "#d97706",
        borderRadius: "50%",
        display: "inline-block",
        animation: "tabvault-spin 0.7s linear infinite"
      }}
    />
    Analyzing...
  </div>
) : null}
```

**Step 4: Update the analyzing indicator in compact card**

In the same file, find the compact card's status dot area (around line 108):

```typescript
{bookmark.status === "analyzing" ? <span style={dotAmberStyle} title="Analyzing" /> : null}
```

Replace with:

```typescript
{bookmark.status === "analyzing" ? (
  <span
    data-testid="bookmark-analyzing-spinner"
    title="Analyzing"
    style={{
      width: "8px",
      height: "8px",
      border: "2px solid #fde68a",
      borderTopColor: "#d97706",
      borderRadius: "50%",
      display: "inline-block",
      animation: "tabvault-spin 0.7s linear infinite"
    }}
  />
) : null}
```

**Step 5: Add the CSS keyframe for the spinner**

The spinner animation must be declared globally. In `src/ui/design-tokens.ts` (or wherever `buildGlobalStyles` is defined), check if `tabvault-spin` already exists. If not, open `src/ui/design-tokens.ts` and add it to the `buildGlobalStyles` return string:

```typescript
@keyframes tabvault-spin {
  to { transform: rotate(360deg); }
}
```

Find the function `buildGlobalStyles` and append the keyframe inside the returned template string, alongside any existing `@keyframes pulse`.

**Step 6: Run to verify it passes**

```
npx vitest run tests/ui/bookmark-card.test.tsx
```

Expected: all tests PASS.

**Step 7: Commit**

```bash
git add src/components/bookmark-list.tsx src/ui/design-tokens.ts tests/ui/bookmark-card.test.tsx
git commit -m "feat(ui): replace analyzing dot with inline spinner in BookmarkCard"
```

---

### Task 2: Optimistic analyzing state in Popup

**Files:**
- Modify: `src/popup.tsx`
- Test: `tests/ui/popup-state.test.tsx`

**Step 1: Write the failing test**

Add this test inside `describe("Popup state", ...)` in `tests/ui/popup-state.test.tsx`. Place it after the existing bookmark-related tests. It uses a never-resolving `analyzeBookmark` to freeze the async call mid-flight:

```typescript
it("shows analyzing spinner on a bookmark card immediately after clicking Analyze", async () => {
  let resolveAnalyze!: () => void
  const analyzeBookmark = vi.fn(
    () => new Promise<BookmarkRecord>((resolve) => { resolveAnalyze = () => resolve(createBookmark({ status: "done" })) })
  )

  const services = createServices({
    bookmarkRepository: createBookmarkRepository({
      list: vi.fn(async () => [createBookmark({ id: "bm-test", status: "saved" })])
    }),
    settingsRepository: createSettingsRepository({
      getProviders: vi.fn(async () => [
        { provider: "openai" as const, apiKey: "sk-test", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", enabled: true }
      ])
    }),
    analyzeBookmark
  })

  await renderPopup(services)

  const analyzeBtn = container?.querySelector<HTMLButtonElement>("[data-testid='bookmark-analyze-button']")
  expect(analyzeBtn).not.toBeNull()

  await act(async () => {
    analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })

  // Before the analysis promise settles, spinner must be visible
  const spinner = container?.querySelector("[data-testid='bookmark-analyzing-spinner']")
  expect(spinner).not.toBeNull()

  // Cleanup: resolve to avoid dangling promises
  await act(async () => { resolveAnalyze() })
})
```

**Step 2: Run to verify it fails**

```
npx vitest run tests/ui/popup-state.test.tsx
```

Expected: FAIL — spinner element not found immediately after click.

**Step 3: Add local optimistic analyzing state to Popup**

In `src/popup.tsx`, add a new state variable after the existing `useState` declarations (e.g. after the `selectedBookmark` state, around line 77):

```typescript
const [localAnalyzingIds, setLocalAnalyzingIds] = useState<Set<string>>(new Set())
```

**Step 4: Merge optimistic state into rendered bookmark list**

In `src/popup.tsx`, find where `filteredBookmarks` is computed (the `useMemo` that calls `searchBookmarks`). Add a new derived value after it:

```typescript
const displayedBookmarks = useMemo(
  () => filteredBookmarks.map((bm) =>
    localAnalyzingIds.has(bm.id) && bm.status !== "analyzing"
      ? { ...bm, status: "analyzing" as const }
      : bm
  ),
  [filteredBookmarks, localAnalyzingIds]
)
```

Then in the JSX, change `bookmarks={filteredBookmarks}` (the `<BookmarkList>` that passes bookmarks to the list) to `bookmarks={displayedBookmarks}`.

**Step 5: Update handleAnalyzeBookmark to use the optimistic set**

Replace the existing `handleAnalyzeBookmark` function in `src/popup.tsx` with:

```typescript
async function handleAnalyzeBookmark(id: string): Promise<void> {
  const settings = await popupServices.settingsRepository.getAppSettings()
  const providers = await popupServices.settingsRepository.getProviders()
  const selectedProvider = providers.find(
    (provider) => provider.enabled && provider.provider === settings.defaultProvider
  )

  if (!selectedProvider?.apiKey.trim()) {
    setErrorMessage("Add an API key in Settings to enable analysis.")
    return
  }

  const bookmark = bookmarks.find((b) => b.id === id)
  if (!bookmark) return

  setLocalAnalyzingIds((prev) => new Set([...prev, id]))
  setErrorMessage(null)

  try {
    await popupServices.analyzeBookmark({
      bookmark,
      provider: popupServices.createProvider(selectedProvider),
      bookmarkRepository: popupServices.bookmarkRepository
    })
  } finally {
    setLocalAnalyzingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    await loadBookmarks()
  }
}
```

**Step 6: Run to verify it passes**

```
npx vitest run tests/ui/popup-state.test.tsx
```

Expected: all tests PASS.

**Step 7: Commit**

```bash
git add src/popup.tsx tests/ui/popup-state.test.tsx
git commit -m "feat(popup): show immediate analyzing spinner on single-bookmark Analyze click"
```

---

### Task 3: Optimistic analyzing state in SidePanel

**Files:**
- Modify: `src/sidepanel.tsx`
- Test: `tests/ui/sidepanel.test.tsx`

**Step 1: Write the failing test**

Add this test inside `describe("SidePanel", ...)` in `tests/ui/sidepanel.test.tsx`:

```typescript
it("shows analyzing spinner on a bookmark card immediately after clicking Analyze", async () => {
  let resolveAnalyze!: () => void
  const analyzeBookmark = vi.fn(
    () => new Promise<BookmarkRecord>((resolve) => { resolveAnalyze = () => resolve(createBookmark({ id: "bm-sp", status: "done" })) })
  )

  const services = createServices({
    bookmarkRepository: createBookmarkRepository({
      list: vi.fn(async () => [createBookmark({ id: "bm-sp", status: "saved" })])
    }),
    settingsRepository: createSettingsRepository({
      getProviders: vi.fn(async () => [
        { provider: "openai" as const, apiKey: "sk-test", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", enabled: true }
      ])
    }),
    analyzeBookmark
  })

  await renderSidePanel(services)

  const analyzeBtn = container?.querySelector<HTMLButtonElement>("[data-testid='bookmark-analyze-button']")
  expect(analyzeBtn).not.toBeNull()

  await act(async () => {
    analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })

  const spinner = container?.querySelector("[data-testid='bookmark-analyzing-spinner']")
  expect(spinner).not.toBeNull()

  await act(async () => { resolveAnalyze() })
})
```

You also need the `createBookmark` and `createBookmarkRepository` / `createSettingsRepository` helpers inside `sidepanel.test.tsx`. Check if they already exist; if not, add them near the bottom of the file (after the `describe` block):

```typescript
function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "Example page",
    url: "https://example.com/article",
    aiTags: [],
    userTags: [],
    status: "saved",
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
    ...overrides
  }
}

function createBookmarkRepository(overrides: Partial<BookmarkRepository> = {}): BookmarkRepository {
  return {
    save: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    clearAnalysis: vi.fn(async () => undefined),
    clearAllAnalysis: vi.fn(async () => undefined),
    clearErrorAnalysis: vi.fn(async () => undefined),
    ...overrides
  }
}

function createSettingsRepository(overrides: Partial<SettingsRepository> = {}): SettingsRepository {
  return {
    getAppSettings: vi.fn(async () => ({
      defaultProvider: "openai" as const,
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto" as const,
      autoRetryOnError: false
    })),
    saveAppSettings: vi.fn(async () => undefined),
    getProviders: vi.fn(async () => []),
    saveProviders: vi.fn(async () => undefined),
    ...overrides
  }
}

function createServices(overrides: Partial<any> = {}): any {
  return {
    bookmarkRepository: createBookmarkRepository(),
    settingsRepository: createSettingsRepository(),
    analyzeBookmark: vi.fn(async ({ bookmark }: any) => ({ ...bookmark, status: "done" })),
    createProvider: vi.fn(() => ({})),
    themeRepository: { getTheme: vi.fn(async () => undefined), setTheme: vi.fn(async () => {}) },
    ...overrides
  }
}
```

**Step 2: Run to verify it fails**

```
npx vitest run tests/ui/sidepanel.test.tsx
```

Expected: FAIL — spinner element not found immediately after click.

**Step 3: Add local optimistic analyzing state to SidePanel**

In `src/sidepanel.tsx`, add a new state after existing `useState` declarations (near line 67):

```typescript
const [localAnalyzingIds, setLocalAnalyzingIds] = useState<Set<string>>(new Set())
```

**Step 4: Merge optimistic state into filtered bookmark list**

After the existing `filteredBookmarks` useMemo in `src/sidepanel.tsx`, add:

```typescript
const displayedBookmarks = useMemo(
  () => filteredBookmarks.map((bm) =>
    localAnalyzingIds.has(bm.id) && bm.status !== "analyzing"
      ? { ...bm, status: "analyzing" as const }
      : bm
  ),
  [filteredBookmarks, localAnalyzingIds]
)
```

In the JSX, update both `<BookmarkList>` usages (search results list and tree) to use `displayedBookmarks` instead of `filteredBookmarks` for the list.

Also, the `<BookmarkTree>` component displays bookmarks by URL via `metadataMap`. Add a merged metadata map:

```typescript
const displayedMetadataMap = useMemo(() => {
  const map: Record<string, BookmarkRecord> = { ...metadataMap }
  for (const id of localAnalyzingIds) {
    const bm = bookmarks.find((b) => b.id === id)
    if (bm && map[bm.url] && map[bm.url].status !== "analyzing") {
      map[bm.url] = { ...map[bm.url], status: "analyzing" }
    }
  }
  return map
}, [metadataMap, localAnalyzingIds, bookmarks])
```

Pass `displayedMetadataMap` to `<BookmarkTree metadataMap={...}>` instead of `metadataMap`.

**Step 5: Update handleAnalyzeBookmark in SidePanel**

Replace the existing `handleAnalyzeBookmark` (line 195) with:

```typescript
async function handleAnalyzeBookmark(id: string): Promise<void> {
  const settings = await sidePanelServices.settingsRepository.getAppSettings()
  const providers = await sidePanelServices.settingsRepository.getProviders()
  const selectedProvider = providers.find(
    (provider) => provider.enabled && provider.provider === settings.defaultProvider
  )

  if (!selectedProvider?.apiKey.trim()) {
    setErrorMessage("Add an API key in Settings to enable analysis.")
    return
  }

  const bookmark = bookmarks.find((b) => b.id === id)
  if (!bookmark) return

  setLocalAnalyzingIds((prev) => new Set([...prev, id]))
  setErrorMessage(null)

  try {
    await sidePanelServices.analyzeBookmark({
      bookmark,
      provider: sidePanelServices.createProvider(selectedProvider),
      bookmarkRepository: sidePanelServices.bookmarkRepository
    })
  } finally {
    setLocalAnalyzingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    await loadBookmarks()
  }
}
```

**Step 6: Run to verify it passes**

```
npx vitest run tests/ui/sidepanel.test.tsx
```

Expected: all tests PASS.

**Step 7: Commit**

```bash
git add src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat(sidepanel): show immediate analyzing spinner on single-bookmark Analyze click"
```

---

### Task 4: Optimistic analyzing state in Options (BookmarksTab)

**Files:**
- Modify: `src/options.tsx` (only `BookmarksTab` function and `handleAnalyze`)
- Test: `tests/ui/options-bookmarks-dashboard.test.tsx`

**Step 1: Write the failing test**

Add this test in `tests/ui/options-bookmarks-dashboard.test.tsx` inside `describe("Options bookmarks dashboard", ...)`. The options page uses URL-based identification, so we trigger analyze from the `BookmarkDetailPanel` via the `Analyze` button in the details column.

```typescript
it("shows analyzing status badge in the bookmark list immediately after clicking Analyze in the detail panel", async () => {
  let resolveAnalyze!: () => void
  const analyzeBookmark = vi.fn(
    () => new Promise<BookmarkRecord>((resolve) => {
      resolveAnalyze = () => resolve(makeBookmarkRecord({ status: "done" }))
    })
  )

  ;(globalThis.chrome as any).bookmarks.getTree = vi.fn(async () => chromeBookmarkTree)
  localStorage.setItem("tabvault_folder_0", "true")
  localStorage.setItem("tabvault_folder_1", "true")

  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  const record = makeBookmarkRecord({ status: "saved", summary: undefined, aiTags: [], userTags: [] })
  const repo = makeBookmarkRepository([record])

  await act(async () => {
    root!.render(
      <Options
        services={{
          settingsRepository: makeSettingsRepository(),
          bookmarkRepository: repo,
          analyzeBookmark,
          testConnection: async () => {}
        }}
      />
    )
  })

  const bookmarksTabBtn = Array.from(container!.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Bookmarks"
  )
  await act(async () => { bookmarksTabBtn?.click() })
  await act(async () => { await new Promise((r) => setTimeout(r, 10)) })

  // Select the bookmark in the middle column
  const bookmarkBtn = container?.querySelector<HTMLElement>('[data-testid="bookmark-result-button"]')
  await act(async () => { bookmarkBtn?.click() })

  // Click Analyze in the detail panel
  const analyzeBtn = container?.querySelector<HTMLButtonElement>('[data-testid="detail-analyze-button"]')
  expect(analyzeBtn).not.toBeNull()

  await act(async () => {
    analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })

  // Status badge in middle column should immediately show "analyzing"
  const statusBadge = container?.querySelector('[data-testid="bookmark-result-status"]')
  expect(statusBadge?.textContent).toBe("analyzing")

  await act(async () => { resolveAnalyze() })
})
```

Note: this test references `data-testid="detail-analyze-button"` and `data-testid="bookmark-result-status"`. Check if these already exist in the options page. If not, they will be added in step 3.

**Step 2: Run to verify it fails**

```
npx vitest run tests/ui/options-bookmarks-dashboard.test.tsx
```

Expected: FAIL.

**Step 3: Add optimistic URL set to BookmarksTab**

In `src/options.tsx` inside `function BookmarksTab`, add a new state near the other `useState` declarations (around line 1077):

```typescript
const [localAnalyzingUrls, setLocalAnalyzingUrls] = React.useState<Set<string>>(new Set())
```

Add a merged metadata map that overlays the local analyzing state:

```typescript
const displayedMetadataMap = React.useMemo<Record<string, BookmarkRecord>>(() => {
  const map: Record<string, BookmarkRecord> = { ...metadataMap }
  for (const url of localAnalyzingUrls) {
    if (map[url] && map[url].status !== "analyzing") {
      map[url] = { ...map[url], status: "analyzing" }
    }
  }
  return map
}, [metadataMap, localAnalyzingUrls])
```

Pass `displayedMetadataMap` instead of `metadataMap` to `<BookmarkTree>` and `<BookmarkDetailPanel>`.

Also, in the middle column bookmark button list (around line 1420), update the status lookup:

```typescript
const status = displayedMetadataMap[item.url]?.status
```

Add `data-testid="bookmark-result-status"` to the status span (around line 1448):

```typescript
<span
  data-testid="bookmark-result-status"
  style={{ ... }}
>
  {status}
</span>
```

**Step 4: Update handleAnalyze in BookmarksTab**

Replace the existing `handleAnalyze` (line 1153) with:

```typescript
async function handleAnalyze(url: string) {
  const settings = await services.settingsRepository.getAppSettings()
  const providers = await services.settingsRepository.getProviders()
  const selectedProvider = providers.find(
    (p) => p.enabled && p.provider === settings.defaultProvider
  )
  if (!selectedProvider?.apiKey.trim()) {
    setErrorMessage("Add an API key in Settings to enable analysis.")
    return
  }
  const record = metadataMap[url]
  if (!record) {
    setErrorMessage("This bookmark has not been saved to TabVault yet.")
    return
  }

  setLocalAnalyzingUrls((prev) => new Set([...prev, url]))
  setErrorMessage(null)

  try {
    await services.analyzeBookmark({
      bookmark: record,
      provider: services.createProvider(selectedProvider),
      bookmarkRepository: services.bookmarkRepository
    })
  } finally {
    setLocalAnalyzingUrls((prev) => {
      const next = new Set(prev)
      next.delete(url)
      return next
    })
    await loadData()
  }
}
```

Note: `services.analyzeBookmark` and `services.createProvider` need to be injected through `OptionsServices`. Check the existing `OptionsServices` type definition and add if missing:

```typescript
analyzeBookmark?: typeof defaultAnalyzeBookmark
createProvider?: (config: ProviderConfig) => AiProvider
```

And in `BookmarksTab`, resolve them with defaults:

```typescript
const analyzeBookmark = services.analyzeBookmark ?? defaultAnalyzeBookmark
const createProvider = services.createProvider ?? defaultCreateProvider
```

**Step 5: Add `data-testid="detail-analyze-button"` to BookmarkDetailPanel**

Search for the Analyze button inside `BookmarkDetailPanel` component in `src/options.tsx`. Add the testid:

```typescript
<button
  data-testid="detail-analyze-button"
  onClick={() => void onAnalyze(url)}
  ...
>
  Analyze
</button>
```

**Step 6: Run to verify it passes**

```
npx vitest run tests/ui/options-bookmarks-dashboard.test.tsx
```

Expected: all tests PASS.

**Step 7: Run full test suite**

```
npx vitest run
```

Expected: all tests PASS.

**Step 8: Commit**

```bash
git add src/options.tsx tests/ui/options-bookmarks-dashboard.test.tsx
git commit -m "feat(options): show immediate analyzing status on single-bookmark Analyze click"
```

---

### Task 5: Verify all tests pass and review

**Step 1: Run all tests**

```
npx vitest run
```

Expected: all tests PASS with no errors or warnings.

**Step 2: Typecheck**

```
npm run typecheck
```

Expected: no type errors.

**Step 3: Final commit if any cleanup needed**

```bash
git add -p
git commit -m "chore: cleanup single-bookmark analysis feedback"
```
