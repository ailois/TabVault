# TabVault MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bootstrap TabVault into a runnable Plasmo-based browser extension MVP that can save bookmarks locally and analyze them with one AI provider.

**Architecture:** Use Plasmo file-based extension entrypoints under `src/` for popup, options, background, and content scripts. Keep UI separate from storage and provider logic: `chrome.storage` for settings, IndexedDB for bookmark data, and a provider abstraction so OpenAI-compatible support lands first without blocking Claude/Gemini later.

**Tech Stack:** Plasmo, TypeScript, React, IndexedDB, `chrome.storage`, Vitest

---

### Task 1: Bootstrap the Plasmo project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/popup.tsx`
- Create: `src/options.tsx`
- Create: `src/background.ts`
- Create: `src/content.ts`
- Create: `src/types/index.ts`

**Step 1: Create the project scaffold**

Run:
```bash
pnpm create plasmo
```

Expected: a Plasmo extension scaffold with package scripts and TypeScript support.

**Step 2: Add the standard entry files**

Create these minimal files:

`src/popup.tsx`
```tsx
function Popup() {
  return <main>TabVault</main>
}

export default Popup
```

`src/options.tsx`
```tsx
function Options() {
  return <main>TabVault Settings</main>
}

export default Options
```

`src/background.ts`
```ts
export {}
```

`src/content.ts`
```ts
export {}
```

`src/types/index.ts`
```ts
export type ProviderType = "openai" | "claude" | "gemini"
```

**Step 3: Start the dev server**

Run:
```bash
pnpm dev
```

Expected: Plasmo dev server starts successfully.

**Step 4: Commit**

```bash
git add package.json tsconfig.json src/popup.tsx src/options.tsx src/background.ts src/content.ts src/types/index.ts
git commit -m "feat: bootstrap Plasmo extension scaffold"
```

### Task 2: Define core domain types and storage contracts

**Files:**
- Create: `src/types/bookmark.ts`
- Create: `src/types/settings.ts`
- Create: `src/lib/storage/bookmark-repository.ts`
- Create: `src/lib/config/settings-repository.ts`
- Test: `tests/types/bookmark.test.ts`

**Step 1: Write the failing test**

`tests/types/bookmark.test.ts`
```ts
import { describe, expect, it } from "vitest"
import { createEmptyBookmarkDraft } from "../../src/types/bookmark"

describe("createEmptyBookmarkDraft", () => {
  it("creates a bookmark draft with saved status and empty tags", () => {
    const draft = createEmptyBookmarkDraft({
      title: "Example",
      url: "https://example.com"
    })

    expect(draft.title).toBe("Example")
    expect(draft.url).toBe("https://example.com")
    expect(draft.status).toBe("saved")
    expect(draft.tags).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/types/bookmark.test.ts
```

Expected: FAIL because `createEmptyBookmarkDraft` does not exist yet.

**Step 3: Write minimal implementation**

`src/types/bookmark.ts`
```ts
export type BookmarkRecord = {
  id: string
  url: string
  title: string
  selectedText?: string
  extractedText?: string
  summary?: string
  tags: string[]
  provider?: "openai" | "claude" | "gemini"
  model?: string
  status: "saved" | "analyzing" | "done" | "error"
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export function createEmptyBookmarkDraft(input: {
  title: string
  url: string
}): BookmarkRecord {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    title: input.title,
    url: input.url,
    tags: [],
    status: "saved",
    createdAt: now,
    updatedAt: now
  }
}
```

`src/types/settings.ts`
```ts
export type ProviderType = "openai" | "claude" | "gemini"

export type ProviderConfig = {
  provider: ProviderType
  apiKey: string
  baseUrl?: string
  model: string
  enabled: boolean
}

export type AppSettings = {
  defaultProvider: ProviderType
  autoAnalyzeOnSave: boolean
}
```

`src/lib/storage/bookmark-repository.ts`
```ts
import type { BookmarkRecord } from "../../types/bookmark"

export interface BookmarkRepository {
  save(bookmark: BookmarkRecord): Promise<void>
  list(): Promise<BookmarkRecord[]>
  getById(id: string): Promise<BookmarkRecord | null>
  update(bookmark: BookmarkRecord): Promise<void>
}
```

`src/lib/config/settings-repository.ts`
```ts
import type { AppSettings, ProviderConfig } from "../../types/settings"

export interface SettingsRepository {
  getAppSettings(): Promise<AppSettings>
  saveAppSettings(settings: AppSettings): Promise<void>
  getProviders(): Promise<ProviderConfig[]>
  saveProviders(providers: ProviderConfig[]): Promise<void>
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/types/bookmark.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/bookmark.ts src/types/settings.ts src/lib/storage/bookmark-repository.ts src/lib/config/settings-repository.ts tests/types/bookmark.test.ts
git commit -m "feat: define TabVault core domain contracts"
```

### Task 3: Implement settings persistence with chrome.storage

**Files:**
- Create: `src/lib/config/chrome-settings-repository.ts`
- Create: `src/features/settings/default-settings.ts`
- Modify: `src/options.tsx`
- Test: `tests/config/default-settings.test.ts`

**Step 1: Write the failing test**

`tests/config/default-settings.test.ts`
```ts
import { describe, expect, it } from "vitest"
import { DEFAULT_APP_SETTINGS } from "../../src/features/settings/default-settings"

describe("DEFAULT_APP_SETTINGS", () => {
  it("defaults to openai and disables auto analyze", () => {
    expect(DEFAULT_APP_SETTINGS.defaultProvider).toBe("openai")
    expect(DEFAULT_APP_SETTINGS.autoAnalyzeOnSave).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/config/default-settings.test.ts
```

Expected: FAIL because defaults file does not exist.

**Step 3: Write minimal implementation**

`src/features/settings/default-settings.ts`
```ts
import type { AppSettings } from "../../types/settings"

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultProvider: "openai",
  autoAnalyzeOnSave: false
}
```

`src/lib/config/chrome-settings-repository.ts`
```ts
import { DEFAULT_APP_SETTINGS } from "../../features/settings/default-settings"
import type { AppSettings, ProviderConfig } from "../../types/settings"
import type { SettingsRepository } from "./settings-repository"

const APP_SETTINGS_KEY = "app-settings"
const PROVIDERS_KEY = "provider-configs"

export class ChromeSettingsRepository implements SettingsRepository {
  async getAppSettings(): Promise<AppSettings> {
    const result = await chrome.storage.sync.get(APP_SETTINGS_KEY)
    return result[APP_SETTINGS_KEY] ?? DEFAULT_APP_SETTINGS
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    await chrome.storage.sync.set({ [APP_SETTINGS_KEY]: settings })
  }

  async getProviders(): Promise<ProviderConfig[]> {
    const result = await chrome.storage.sync.get(PROVIDERS_KEY)
    return result[PROVIDERS_KEY] ?? []
  }

  async saveProviders(providers: ProviderConfig[]): Promise<void> {
    await chrome.storage.sync.set({ [PROVIDERS_KEY]: providers })
  }
}
```

Update `src/options.tsx` to render a simple settings placeholder form.

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/config/default-settings.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/config/chrome-settings-repository.ts src/features/settings/default-settings.ts src/options.tsx tests/config/default-settings.test.ts
git commit -m "feat: add browser settings persistence"
```

### Task 4: Implement IndexedDB bookmark storage

**Files:**
- Create: `src/lib/storage/indexeddb-bookmark-repository.ts`
- Create: `src/lib/storage/db.ts`
- Test: `tests/storage/bookmark-repository.test.ts`

**Step 1: Write the failing test**

`tests/storage/bookmark-repository.test.ts`
```ts
import { describe, expect, it } from "vitest"
import { createEmptyBookmarkDraft } from "../../src/types/bookmark"

describe("IndexedDB bookmark repository", () => {
  it("stores and returns saved bookmarks", async () => {
    const repositoryModule = await import("../../src/lib/storage/indexeddb-bookmark-repository")
    const repository = repositoryModule.createInMemoryBookmarkRepositoryForTests()
    const bookmark = createEmptyBookmarkDraft({
      title: "Example",
      url: "https://example.com"
    })

    await repository.save(bookmark)

    await expect(repository.list()).resolves.toHaveLength(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/storage/bookmark-repository.test.ts
```

Expected: FAIL because repository implementation does not exist.

**Step 3: Write minimal implementation**

Create `src/lib/storage/db.ts` with a thin IndexedDB open helper.

Create `src/lib/storage/indexeddb-bookmark-repository.ts` with:
- `IndexedDbBookmarkRepository`
- `createInMemoryBookmarkRepositoryForTests()`
- methods: `save`, `list`, `getById`, `update`

Keep search out of this task.

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/storage/bookmark-repository.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/storage/db.ts src/lib/storage/indexeddb-bookmark-repository.ts tests/storage/bookmark-repository.test.ts
git commit -m "feat: add bookmark persistence layer"
```

### Task 5: Implement page capture and save-current-page flow

**Files:**
- Create: `src/lib/extraction/extract-page.ts`
- Create: `src/features/bookmarks/save-current-page.ts`
- Modify: `src/popup.tsx`
- Test: `tests/bookmarks/save-current-page.test.ts`

**Step 1: Write the failing test**

`tests/bookmarks/save-current-page.test.ts`
```ts
import { describe, expect, it, vi } from "vitest"

describe("saveCurrentPage", () => {
  it("creates and stores a bookmark from the active tab", async () => {
    const saveModule = await import("../../src/features/bookmarks/save-current-page")
    const saveCurrentPage = saveModule.saveCurrentPage

    const bookmarkRepository = {
      save: vi.fn(),
      list: vi.fn(),
      getById: vi.fn(),
      update: vi.fn()
    }

    await saveCurrentPage({
      activeTab: { title: "Test", url: "https://example.com" },
      extractedText: "Body text",
      bookmarkRepository
    })

    expect(bookmarkRepository.save).toHaveBeenCalledTimes(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/bookmarks/save-current-page.test.ts
```

Expected: FAIL because save flow does not exist.

**Step 3: Write minimal implementation**

Implement `saveCurrentPage` so it:
- validates `title` and `url`
- builds bookmark draft
- attaches extracted text
- saves through repository

Update `src/popup.tsx` to render a “Save current page” button and a minimal status message.

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/bookmarks/save-current-page.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/extraction/extract-page.ts src/features/bookmarks/save-current-page.ts src/popup.tsx tests/bookmarks/save-current-page.test.ts
git commit -m "feat: add save current page workflow"
```

### Task 6: Add bookmark list and search

**Files:**
- Create: `src/features/bookmarks/search-bookmarks.ts`
- Create: `src/components/bookmark-list.tsx`
- Modify: `src/popup.tsx`
- Test: `tests/bookmarks/search-bookmarks.test.ts`

**Step 1: Write the failing test**

`tests/bookmarks/search-bookmarks.test.ts`
```ts
import { describe, expect, it } from "vitest"
import { searchBookmarks } from "../../src/features/bookmarks/search-bookmarks"

describe("searchBookmarks", () => {
  it("matches title and tags", () => {
    const results = searchBookmarks([
      { title: "React docs", url: "https://react.dev", tags: ["react"], status: "saved" },
      { title: "Vue docs", url: "https://vuejs.org", tags: ["vue"], status: "saved" }
    ] as any, "react")

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe("React docs")
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/bookmarks/search-bookmarks.test.ts
```

Expected: FAIL because search helper does not exist.

**Step 3: Write minimal implementation**

Implement search over:
- title
- url
- summary
- tags

Render results in `BookmarkList` and wire `src/popup.tsx` to load/reload saved bookmarks.

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/bookmarks/search-bookmarks.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/bookmarks/search-bookmarks.ts src/components/bookmark-list.tsx src/popup.tsx tests/bookmarks/search-bookmarks.test.ts
git commit -m "feat: add bookmark list and search"
```

### Task 7: Add AI provider abstraction and OpenAI-compatible implementation

**Files:**
- Create: `src/lib/providers/provider.ts`
- Create: `src/lib/providers/openai-compatible-provider.ts`
- Create: `src/features/ai/analyze-bookmark.ts`
- Test: `tests/ai/analyze-bookmark.test.ts`

**Step 1: Write the failing test**

`tests/ai/analyze-bookmark.test.ts`
```ts
import { describe, expect, it, vi } from "vitest"

describe("analyzeBookmark", () => {
  it("updates a bookmark with summary and tags", async () => {
    const analyzeModule = await import("../../src/features/ai/analyze-bookmark")
    const bookmark = {
      id: "1",
      title: "Example",
      url: "https://example.com",
      extractedText: "Example content",
      tags: [],
      status: "saved"
    }

    const bookmarkRepository = {
      save: vi.fn(),
      list: vi.fn(),
      getById: vi.fn(),
      update: vi.fn()
    }

    const provider = {
      analyze: vi.fn().mockResolvedValue({
        summary: "Short summary",
        tags: ["example"]
      })
    }

    await analyzeModule.analyzeBookmark({
      bookmark,
      provider,
      bookmarkRepository
    })

    expect(bookmarkRepository.update).toHaveBeenCalledTimes(2)
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/ai/analyze-bookmark.test.ts
```

Expected: FAIL because analysis flow does not exist.

**Step 3: Write minimal implementation**

Create:

`src/lib/providers/provider.ts`
```ts
export type AnalyzeResult = {
  summary: string
  tags: string[]
}

export interface AiProvider {
  analyze(input: { title: string; url: string; content: string }): Promise<AnalyzeResult>
}
```

`src/lib/providers/openai-compatible-provider.ts`
```ts
import type { AiProvider, AnalyzeResult } from "./provider"

export class OpenAiCompatibleProvider implements AiProvider {
  constructor(
    private readonly config: {
      apiKey: string
      baseUrl: string
      model: string
    }
  ) {}

  async analyze(input: { title: string; url: string; content: string }): Promise<AnalyzeResult> {
    void input
    return {
      summary: "TODO",
      tags: []
    }
  }
}
```

Implement `analyzeBookmark` to set `status: "analyzing"`, then update summary/tags/status.

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/ai/analyze-bookmark.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/providers/provider.ts src/lib/providers/openai-compatible-provider.ts src/features/ai/analyze-bookmark.ts tests/ai/analyze-bookmark.test.ts
git commit -m "feat: add AI analysis workflow"
```

### Task 8: Wire popup actions and user-visible error states

**Files:**
- Modify: `src/popup.tsx`
- Create: `src/components/error-banner.tsx`
- Test: `tests/ui/popup-state.test.tsx`

**Step 1: Write the failing test**

`tests/ui/popup-state.test.tsx`
```tsx
import { describe, expect, it } from "vitest"

describe("Popup state handling", () => {
  it("shows a settings hint when API key is missing", () => {
    expect(true).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/ui/popup-state.test.tsx
```

Expected: FAIL.

**Step 3: Write minimal implementation**

Add UI states for:
- save success
- save failure
- missing API key
- analysis failure
- loading/analyzing

Create reusable `ErrorBanner` component.

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/ui/popup-state.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/popup.tsx src/components/error-banner.tsx tests/ui/popup-state.test.tsx
git commit -m "feat: surface popup loading and error states"
```

### Task 9: Run final verification

**Files:**
- Modify: `README.md`

**Step 1: Update README quickstart**

Add:
- install command
- dev command
- how to load extension in browser
- where to configure provider keys

**Step 2: Run all tests**

Run:
```bash
pnpm vitest run
```

Expected: PASS.

**Step 3: Run type check**

Run:
```bash
pnpm tsc --noEmit
```

Expected: PASS.

**Step 4: Run extension build**

Run:
```bash
pnpm build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add TabVault MVP developer quickstart"
```
