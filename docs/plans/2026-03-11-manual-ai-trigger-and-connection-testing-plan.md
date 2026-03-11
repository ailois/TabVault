# Manual AI Trigger and Connection Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add manual AI analysis trigger (per-card and "Analyze all" with progress) and per-provider API key connection testing in the Settings page.

**Architecture:** Four tasks — first add the Analyze button to BookmarkCard/BookmarkList, then wire the single-bookmark analyze handler in Popup, then add Analyze all with serial progress, then add connection testing to ProviderSettingsForm and Options. Each task has its own tests and commit.

**Tech Stack:** React, TypeScript, Vitest, jsdom

---

### Task 1: Add Analyze button to BookmarkCard

**Files:**
- Modify: `src/components/bookmark-list.tsx`
- Modify: `tests/ui/bookmark-card.test.tsx`

**Context:** `BookmarkCard` currently has `onDelete` prop. We need to add `onAnalyze` prop and an Analyze button that is visible only for `status === "saved"` or `status === "error"`, and hidden for `"analyzing"` and `"done"`.

**Step 1: Write failing tests**

Add to `tests/ui/bookmark-card.test.tsx`, inside the `describe("BookmarkCard")` block, before the closing `})`:

```tsx
it("shows Analyze button for saved bookmarks", async () => {
  await renderList([createBookmark({ status: "saved" })])
  expect(getCard()?.querySelector("[data-testid='bookmark-analyze-button']")).not.toBeNull()
})

it("shows Analyze button for error bookmarks", async () => {
  await renderList([createBookmark({ status: "error" })])
  expect(getCard()?.querySelector("[data-testid='bookmark-analyze-button']")).not.toBeNull()
})

it("hides Analyze button for analyzing bookmarks", async () => {
  await renderList([createBookmark({ status: "analyzing" })])
  expect(getCard()?.querySelector("[data-testid='bookmark-analyze-button']")).toBeNull()
})

it("hides Analyze button for done bookmarks", async () => {
  await renderList([createBookmark({ status: "done" })])
  expect(getCard()?.querySelector("[data-testid='bookmark-analyze-button']")).toBeNull()
})

it("calls onAnalyze with bookmark id when Analyze button is clicked", async () => {
  const onAnalyze = vi.fn(async () => undefined)
  await renderList([createBookmark({ id: "bm-1", status: "saved" })], vi.fn(async () => undefined), onAnalyze)

  const analyzeBtn = getCard()?.querySelector<HTMLButtonElement>("[data-testid='bookmark-analyze-button']")

  await act(async () => {
    analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })

  expect(onAnalyze).toHaveBeenCalledWith("bm-1")
})
```

Also update the `renderList` helper to accept `onAnalyze`:

```tsx
async function renderList(
  bookmarks: BookmarkRecord[],
  onDelete: (id: string) => Promise<void> = vi.fn(async () => undefined),
  onAnalyze: (id: string) => Promise<void> = vi.fn(async () => undefined)
): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<BookmarkList bookmarks={bookmarks} onDelete={onDelete} onAnalyze={onAnalyze} />)
  })
}
```

**Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/ui/bookmark-card.test.tsx
```

Expected: FAIL — `onAnalyze` is not a prop of `BookmarkList`, no `bookmark-analyze-button` exists.

**Step 3: Update `src/components/bookmark-list.tsx`**

Add `onAnalyze` to both `BookmarkListProps` and `BookmarkCardProps`:

```tsx
type BookmarkListProps = {
  bookmarks: BookmarkRecord[]
  onDelete: (id: string) => Promise<void>
  onAnalyze: (id: string) => Promise<void>
}

type BookmarkCardProps = {
  bookmark: BookmarkRecord
  onDelete: (id: string) => Promise<void>
  onAnalyze: (id: string) => Promise<void>
}
```

Update `BookmarkList` to pass `onAnalyze` to each card:

```tsx
export function BookmarkList({ bookmarks, onDelete, onAnalyze }: BookmarkListProps) {
  // ...
  return (
    <ul aria-label="Bookmark results" style={listStyle}>
      {bookmarks.map((bookmark) => (
        <li key={bookmark.id}>
          <BookmarkCard bookmark={bookmark} onDelete={onDelete} onAnalyze={onAnalyze} />
        </li>
      ))}
    </ul>
  )
}
```

Update `BookmarkCard` to add Analyze button in the header left area, after the status badge section and before the delete button — visible only for `saved` and `error`:

```tsx
function BookmarkCard({ bookmark, onDelete, onAnalyze }: BookmarkCardProps) {
  const [expanded, setExpanded] = useState(false)

  const showAnalyzeButton = bookmark.status === "saved" || bookmark.status === "error"

  // ...

  return (
    <article data-bookmark-card="true" style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={cardHeaderLeftStyle}>
          {bookmark.status === "analyzing" ? (
            <span data-testid="bookmark-status-badge" style={analyzingBadgeStyle}>
              Analyzing...
            </span>
          ) : bookmark.status === "error" ? (
            <span data-testid="bookmark-status-badge" style={errorBadgeStyle}>
              Error
            </span>
          ) : null}
          {showAnalyzeButton ? (
            <button
              aria-label={`Analyze ${bookmark.title}`}
              data-testid="bookmark-analyze-button"
              onClick={() => void onAnalyze(bookmark.id)}
              style={analyzeButtonStyle}
              type="button"
            >
              Analyze
            </button>
          ) : null}
        </div>
        <button
          aria-label={`Delete ${bookmark.title}`}
          data-testid="bookmark-delete-button"
          onClick={() => void handleDelete()}
          style={deleteButtonStyle}
          type="button"
        >
          ×
        </button>
      </div>
      {/* rest of card unchanged */}
```

Add `analyzeButtonStyle` near the other style constants:

```tsx
const analyzeButtonStyle: React.CSSProperties = {
  background: "none",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.pill,
  cursor: "pointer",
  color: colors.textSecondary,
  fontSize: "0.75rem",
  fontWeight: 500,
  padding: "2px 8px"
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/ui/bookmark-card.test.tsx
```

Expected: PASS — all tests pass.

**Step 5: Run full suite**

```bash
npx vitest run
```

Expected: Some tests in `popup-state.test.tsx` will fail because `BookmarkList` now requires `onAnalyze`. Note the failures — they will be fixed in Task 2.

**Step 6: Commit**

```bash
git add src/components/bookmark-list.tsx tests/ui/bookmark-card.test.tsx
git commit -m "feat: add Analyze button to BookmarkCard for saved and error bookmarks"
```

---

### Task 2: Wire single-bookmark analyze handler in Popup

**Files:**
- Modify: `src/popup.tsx`
- Modify: `tests/ui/popup-state.test.tsx`

**Context:** Popup has `maybeAnalyzeBookmark` (for auto-analyze after save). We need a new `handleAnalyzeBookmark(id)` that can be triggered manually from a card. It reads the default provider from settings, then calls `analyzeBookmark`. Pass it as `onAnalyze` to `BookmarkList`.

**Step 1: Write failing test**

In `tests/ui/popup-state.test.tsx`, add after the delete test:

```tsx
it("analyzes a bookmark when the Analyze button is clicked on a card", async () => {
  const bookmark = createBookmark({ id: "bm-to-analyze", title: "Page to analyze", status: "saved" })
  const analyzeBookmark = vi.fn(async () => bookmark)
  const providerConfig: ProviderConfig = {
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    enabled: true
  }
  const services = createServices({
    bookmarkRepository: createBookmarkRepository({
      list: vi.fn(async () => [bookmark])
    }),
    settingsRepository: createSettingsRepository({
      getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false
      })),
      getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [providerConfig])
    }),
    analyzeBookmark
  })

  await renderPopup(services)

  const analyzeBtn = container?.querySelector<HTMLButtonElement>("[data-testid='bookmark-analyze-button']")

  await act(async () => {
    analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })

  await flush()

  expect(analyzeBookmark).toHaveBeenCalledOnce()
  expect(analyzeBookmark.mock.calls[0]?.[0]?.bookmark.id).toBe("bm-to-analyze")
})

it("shows error banner when Analyze is clicked but no provider is configured", async () => {
  const bookmark = createBookmark({ id: "bm-1", status: "saved" })
  const services = createServices({
    bookmarkRepository: createBookmarkRepository({
      list: vi.fn(async () => [bookmark])
    }),
    settingsRepository: createSettingsRepository({
      getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false
      })),
      getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [])
    })
  })

  await renderPopup(services)

  const analyzeBtn = container?.querySelector<HTMLButtonElement>("[data-testid='bookmark-analyze-button']")

  await act(async () => {
    analyzeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })

  await flush()

  expect(screen().getErrorAlert()?.textContent).toContain("Add an API key in Settings")
})
```

**Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/ui/popup-state.test.tsx
```

Expected: FAIL — `BookmarkList` in Popup doesn't have `onAnalyze` prop.

**Step 3: Update `src/popup.tsx`**

Add `handleAnalyzeBookmark` function after `handleDeleteBookmark`:

```tsx
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

  if (!bookmark) {
    return
  }

  try {
    await popupServices.analyzeBookmark({
      bookmark,
      provider: popupServices.createProvider(selectedProvider),
      bookmarkRepository: popupServices.bookmarkRepository
    })
    await loadBookmarks()
  } catch {
    // Error is written to bookmark record by analyzeBookmark; reload to show updated status
    await loadBookmarks()
  }
}
```

Update the `<BookmarkList>` JSX to pass `onAnalyze`:

```tsx
<BookmarkList
  bookmarks={filteredBookmarks}
  onDelete={handleDeleteBookmark}
  onAnalyze={handleAnalyzeBookmark}
/>
```

**Step 4: Run popup-state tests**

```bash
npx vitest run tests/ui/popup-state.test.tsx
```

Expected: PASS — all 15 tests pass.

**Step 5: Run full suite**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/popup.tsx tests/ui/popup-state.test.tsx
git commit -m "feat: wire handleAnalyzeBookmark in Popup, pass onAnalyze to BookmarkList"
```

---

### Task 3: Add "Analyze all" button with serial progress

**Files:**
- Modify: `src/popup.tsx`
- Modify: `tests/ui/popup-state.test.tsx`

**Context:** A third button in the Actions section. Targets only `saved`/`error` bookmarks. Processes them serially. Shows `"Analyzing N/M..."` in the status message area. Disabled if none pending or if already analyzing.

**Step 1: Write failing tests**

In `tests/ui/popup-state.test.tsx`, add:

```tsx
it("shows Analyze all button in the actions section", async () => {
  await renderPopup(createServices())
  expect(screen().getActionsSection()?.textContent).toContain("Analyze all")
})

it("disables Analyze all when no bookmarks are pending analysis", async () => {
  const services = createServices({
    bookmarkRepository: createBookmarkRepository({
      list: vi.fn(async () => [createBookmark({ status: "done" })])
    })
  })
  await renderPopup(services)

  const analyzeAllBtn = screen().getButton("Analyze all")
  expect(analyzeAllBtn?.hasAttribute("disabled")).toBe(true)
})

it("calls analyzeBookmark for each pending bookmark when Analyze all is clicked", async () => {
  const b1 = createBookmark({ id: "bm-1", status: "saved" })
  const b2 = createBookmark({ id: "bm-2", status: "error" })
  const b3 = createBookmark({ id: "bm-3", status: "done" })
  const analyzeBookmark = vi.fn(async () => b1)
  const providerConfig: ProviderConfig = {
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    enabled: true
  }
  const services = createServices({
    bookmarkRepository: createBookmarkRepository({
      list: vi.fn(async () => [b1, b2, b3])
    }),
    settingsRepository: createSettingsRepository({
      getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false
      })),
      getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [providerConfig])
    }),
    analyzeBookmark
  })

  await renderPopup(services)
  await clickButton("Analyze all")

  expect(analyzeBookmark).toHaveBeenCalledTimes(2)
  expect(analyzeBookmark.mock.calls[0]?.[0]?.bookmark.id).toBe("bm-1")
  expect(analyzeBookmark.mock.calls[1]?.[0]?.bookmark.id).toBe("bm-2")
})
```

**Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/ui/popup-state.test.tsx
```

Expected: FAIL — no "Analyze all" button exists.

**Step 3: Update `src/popup.tsx`**

Add `analyzeProgress` state near the other state declarations:

```tsx
const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null)
```

Add `handleAnalyzeAll` function after `handleAnalyzeBookmark`:

```tsx
async function handleAnalyzeAll(): Promise<void> {
  const pending = bookmarks.filter(
    (b) => b.status === "saved" || b.status === "error"
  )

  if (pending.length === 0) {
    return
  }

  const settings = await popupServices.settingsRepository.getAppSettings()
  const providers = await popupServices.settingsRepository.getProviders()
  const selectedProvider = providers.find(
    (provider) => provider.enabled && provider.provider === settings.defaultProvider
  )

  if (!selectedProvider?.apiKey.trim()) {
    setErrorMessage("Add an API key in Settings to enable analysis.")
    return
  }

  setErrorMessage(null)

  for (let i = 0; i < pending.length; i++) {
    const bookmark = pending[i]!
    setAnalyzeProgress({ current: i + 1, total: pending.length })
    setStatusMessage(`Analyzing ${i + 1}/${pending.length}...`)
    setStatusTone("info")

    try {
      await popupServices.analyzeBookmark({
        bookmark,
        provider: popupServices.createProvider(selectedProvider),
        bookmarkRepository: popupServices.bookmarkRepository
      })
    } catch {
      // Error written to bookmark record; continue with next
    }

    await loadBookmarks()
  }

  setAnalyzeProgress(null)
  setStatusMessage("Ready to save the current page.")
  setStatusTone("info")
}
```

Compute a derived value for whether Analyze all should be disabled:

```tsx
const hasPendingBookmarks = bookmarks.some(
  (b) => b.status === "saved" || b.status === "error"
)
```

Add the Analyze all button inside the Actions `<section>`, after the secondary action button:

```tsx
<button
  data-testid="popup-analyze-all-action"
  disabled={!hasPendingBookmarks || isSaving || analyzeProgress !== null}
  onClick={() => void handleAnalyzeAll()}
  style={secondaryActionButtonStyle}
  type="button"
>
  {analyzeProgress
    ? `Analyzing ${analyzeProgress.current}/${analyzeProgress.total}...`
    : "Analyze all"}
</button>
```

**Step 4: Run popup-state tests**

```bash
npx vitest run tests/ui/popup-state.test.tsx
```

Expected: PASS — all tests pass.

**Step 5: Run full suite**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/popup.tsx tests/ui/popup-state.test.tsx
git commit -m "feat: add Analyze all button with serial progress to Popup"
```

---

### Task 4: Add connection testing to ProviderSettingsForm and Options

**Files:**
- Modify: `src/components/provider-settings-form.tsx`
- Modify: `src/options.tsx`
- Create: `tests/ui/provider-connection-test.test.tsx`

**Context:** Each provider settings form gains a "Test connection" button. The button is only enabled when `enabled === true` and apiKey + model are non-empty (plus baseUrl for openai). Internal `testStatus` state: `"idle" | "testing" | "ok" | string`. On success show green "✓ Connected" for 3 seconds then clear. On failure show the error string. Status resets to `"idle"` when any field changes. The `onTestConnection` callback is passed in from Options, which wires it to `createProvider(config).analyze(...)`.

**Step 1: Write failing tests**

Create `tests/ui/provider-connection-test.test.tsx`:

```tsx
// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import ProviderSettingsForm from "../../src/components/provider-settings-form"
import type { ProviderFormState } from "../../src/features/settings/provider-form-state"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("ProviderSettingsForm connection testing", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => { root?.unmount() })
    }
    container?.remove()
    container = null
    root = null
  })

  it("shows Test connection button when provider is enabled with apiKey and model filled", async () => {
    await render(enabledOpenAi())
    expect(getTestBtn()).not.toBeNull()
  })

  it("disables Test connection button when provider is not enabled", async () => {
    await render({ ...enabledOpenAi(), enabled: false })
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)
  })

  it("disables Test connection button when apiKey is empty", async () => {
    await render({ ...enabledOpenAi(), apiKey: "" })
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)
  })

  it("disables Test connection button when model is empty", async () => {
    await render({ ...enabledOpenAi(), model: "" })
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)
  })

  it("disables Test connection button when baseUrl is empty for openai", async () => {
    await render({ ...enabledOpenAi(), baseUrl: "" })
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)
  })

  it("shows Testing... while the test is in progress", async () => {
    const deferred = createDeferred<"ok">()
    await render(enabledOpenAi(), () => deferred.promise)

    await act(async () => {
      getTestBtn()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(getTestBtn()?.textContent).toBe("Testing...")
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)

    deferred.resolve("ok")
    await act(async () => { await Promise.resolve() })
  })

  it("shows ✓ Connected after a successful test", async () => {
    await render(enabledOpenAi(), async () => "ok")

    await act(async () => {
      getTestBtn()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    await act(async () => { await Promise.resolve() })

    expect(container?.querySelector("[data-testid='connection-test-result']")?.textContent).toBe("✓ Connected")
  })

  it("shows error message after a failed test", async () => {
    await render(enabledOpenAi(), async () => "401 Unauthorized")

    await act(async () => {
      getTestBtn()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    await act(async () => { await Promise.resolve() })

    expect(container?.querySelector("[data-testid='connection-test-result']")?.textContent).toBe("401 Unauthorized")
  })

  it("resets test status when a field changes", async () => {
    let currentValue = enabledOpenAi()
    const { rerender } = await renderWithRerender(currentValue, async () => "ok")

    await act(async () => {
      getTestBtn()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.querySelector("[data-testid='connection-test-result']")?.textContent).toBe("✓ Connected")

    currentValue = { ...currentValue, apiKey: "new-key" }
    await act(async () => {
      rerender(currentValue)
    })

    expect(container?.querySelector("[data-testid='connection-test-result']")).toBeNull()
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function render(
  value: ProviderFormState,
  onTestConnection: (value: ProviderFormState) => Promise<"ok" | string> = vi.fn(async () => "ok")
): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(
      <ProviderSettingsForm
        value={value}
        onChange={() => {}}
        onTestConnection={onTestConnection}
      />
    )
  })
}

async function renderWithRerender(
  initialValue: ProviderFormState,
  onTestConnection: (value: ProviderFormState) => Promise<"ok" | string>
): Promise<{ rerender: (value: ProviderFormState) => void }> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  let currentValue = initialValue

  function TestWrapper({ value }: { value: ProviderFormState }) {
    return (
      <ProviderSettingsForm
        value={value}
        onChange={() => {}}
        onTestConnection={onTestConnection}
      />
    )
  }

  await act(async () => {
    root.render(<TestWrapper value={currentValue} />)
  })

  return {
    rerender: (value: ProviderFormState) => {
      currentValue = value
      root!.render(<TestWrapper value={currentValue} />)
    }
  }
}

function getTestBtn(): HTMLButtonElement | null {
  return container?.querySelector<HTMLButtonElement>("[data-testid='provider-test-button']") ?? null
}

function enabledOpenAi(): ProviderFormState {
  return {
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    enabled: true
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => { resolve = res })
  return { promise, resolve }
}
```

**Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/ui/provider-connection-test.test.tsx
```

Expected: FAIL — `onTestConnection` is not a prop of `ProviderSettingsForm`.

**Step 3: Update `src/components/provider-settings-form.tsx`**

Add `onTestConnection` to props type and add internal `testStatus` state. Also add `useEffect` to reset test status when `value` changes:

```tsx
import React, { useEffect, useState } from "react"

import type { ProviderFormState } from "../features/settings/provider-form-state"
import type { ProviderValidation } from "../features/settings/settings-validation"
import { colors, controls, radius, spacing } from "../ui/design-tokens"

type ProviderSettingsFormProps = {
  value: ProviderFormState
  onChange: (nextValue: ProviderFormState) => void
  fieldErrors?: ProviderValidation
  onTestConnection: (value: ProviderFormState) => Promise<"ok" | string>
}
```

Inside `ProviderSettingsForm` function body, add state and reset effect:

```tsx
const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | string>("idle")

useEffect(() => {
  setTestStatus("idle")
}, [value])
```

Compute whether the test button is enabled:

```tsx
const canTest =
  value.enabled &&
  value.apiKey.trim().length > 0 &&
  value.model.trim().length > 0 &&
  (value.provider !== "openai" || (value.baseUrl ?? "").trim().length > 0)
```

Add a test handler:

```tsx
async function handleTestConnection(): Promise<void> {
  setTestStatus("testing")
  const result = await onTestConnection(value)
  setTestStatus(result)

  if (result === "ok") {
    setTimeout(() => setTestStatus("idle"), 3000)
  }
}
```

Add test row at the bottom of the form JSX (before the closing `</section>`):

```tsx
<div style={testRowStyle}>
  <button
    data-testid="provider-test-button"
    disabled={!canTest || testStatus === "testing"}
    onClick={() => void handleTestConnection()}
    style={testButtonStyle}
    type="button"
  >
    {testStatus === "testing" ? "Testing..." : "Test connection"}
  </button>
  {testStatus !== "idle" && testStatus !== "testing" ? (
    <span
      data-testid="connection-test-result"
      style={testStatus === "ok" ? testSuccessStyle : testErrorStyle}
    >
      {testStatus === "ok" ? "✓ Connected" : testStatus}
    </span>
  ) : null}
</div>
```

Add style constants:

```tsx
const testRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm
}

const testButtonStyle: React.CSSProperties = {
  padding: `${spacing.sm} ${spacing.md}`,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.medium,
  backgroundColor: colors.surface,
  color: colors.textSecondary,
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer"
}

const testSuccessStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: colors.textSuccess
}

const testErrorStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: colors.textDanger
}
```

**Step 4: Run provider-connection-test tests**

```bash
npx vitest run tests/ui/provider-connection-test.test.tsx
```

Expected: PASS — all tests pass.

**Step 5: Run full suite — fix Options and existing tests**

```bash
npx vitest run
```

Expected: Tests in `options.test.tsx` and `options-save-state.test.tsx` will fail because `ProviderSettingsForm` now requires `onTestConnection`. Fix by:

1. Updating `src/options.tsx` to wire `onTestConnection` into each `ProviderSettingsForm`.

In `src/options.tsx`, extend `OptionsServices`:

```tsx
type OptionsServices = {
  settingsRepository: SettingsRepository
  testConnection: (config: ProviderConfig) => Promise<void>
}
```

Add import for `createProvider` and `ProviderConfig`:

```tsx
import { createProvider } from "./lib/providers/provider-factory"
import type { ProviderConfig } from "./types/settings"
```

Add default implementation in `DEFAULT_OPTIONS_SERVICES`:

```tsx
const DEFAULT_OPTIONS_SERVICES: OptionsServices = {
  settingsRepository: new ChromeSettingsRepository(),
  testConnection: async (config: ProviderConfig) => {
    await createProvider(config).analyze({
      title: "test",
      url: "https://test",
      content: "Say OK"
    })
  }
}
```

Add a helper to convert `ProviderFormState` to `ProviderConfig` (add to the `Options` function body):

```tsx
function buildProviderConfig(formState: ProviderFormState): ProviderConfig {
  return {
    provider: formState.provider,
    apiKey: formState.apiKey,
    model: formState.model,
    baseUrl: formState.baseUrl,
    enabled: formState.enabled
  }
}
```

Wire `onTestConnection` into each `ProviderSettingsForm` in the JSX:

```tsx
<ProviderSettingsForm
  onChange={(nextValue) => {
    setProviders((currentProviders) =>
      currentProviders.map((currentProvider, currentIndex) =>
        currentIndex === index ? nextValue : currentProvider
      )
    )
  }}
  fieldErrors={validation.providers[provider.provider]}
  onTestConnection={async (formValue) => {
    try {
      await optionsServices.testConnection(buildProviderConfig(formValue))
      return "ok"
    } catch (error) {
      return error instanceof Error ? error.message : "Connection failed"
    }
  }}
  value={provider}
/>
```

2. Update `tests/ui/options.test.tsx` mock `renderOptions` to pass `onTestConnection`:

In `renderOptions()`, update to:
```tsx
await act(async () => {
  root.render(<Options services={{ settingsRepository, testConnection: async () => {} }} />)
})
```

And update `renderProviderSettingsForm` to pass `onTestConnection`:
```tsx
await act(async () => {
  root.render(
    <ProviderSettingsForm
      fieldErrors={fieldErrors}
      onChange={() => {}}
      onTestConnection={async () => "ok"}
      value={value}
    />
  )
})
```

Do the same for any other test files that render `Options` or `ProviderSettingsForm` directly (check `options-load-state.test.tsx`, `options-save-state.test.tsx`).

**Step 6: Run full suite again**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 7: Commit**

```bash
git add src/components/provider-settings-form.tsx src/options.tsx tests/ui/provider-connection-test.test.tsx tests/ui/options.test.tsx tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx
git commit -m "feat: add connection testing to ProviderSettingsForm and Options"
```
