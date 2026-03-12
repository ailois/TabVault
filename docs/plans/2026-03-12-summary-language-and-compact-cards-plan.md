# Summary Language & Sidepanel Compact Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a user-selectable summary language setting that instructs AI providers to generate summaries in the chosen language, and make the sidepanel bookmark list compact so more items are visible at once.

**Architecture:** Language setting lives in `AppSettings` with a `summaryLanguage` field; it flows from options page → settings repo → `analyzeBookmark` → each provider's `buildPrompt`. Compact card mode is a `compact` boolean prop added to `BookmarkList`/`BookmarkCard`; the sidepanel passes `compact={true}`, popup stays unchanged.

**Tech Stack:** TypeScript, React, Vitest + jsdom, Chrome storage.

---

### Task 1: Add `summaryLanguage` to types and defaults

**Files:**
- Modify: `src/types/settings.ts`
- Modify: `src/features/settings/default-settings.ts`

**Step 1: Update `AppSettings` type**

Replace the contents of `src/types/settings.ts` with:

```typescript
export type ProviderType = "openai" | "claude" | "gemini"

export type ProviderConfig = {
  provider: ProviderType
  apiKey: string
  baseUrl?: string
  model: string
  enabled: boolean
}

export type SummaryLanguage = "auto" | "zh" | "en" | "ja" | "ko" | "fr" | "de" | "es"

export type AppSettings = {
  defaultProvider: ProviderType
  autoAnalyzeOnSave: boolean
  summaryLanguage: SummaryLanguage
}
```

**Step 2: Update default settings**

Replace the contents of `src/features/settings/default-settings.ts` with:

```typescript
import type { AppSettings } from "../../types/settings"

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultProvider: "openai",
  autoAnalyzeOnSave: false,
  summaryLanguage: "auto"
}
```

**Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors (existing code that spreads `AppSettings` will silently get the new field)

**Step 4: Commit**

```bash
git add src/types/settings.ts src/features/settings/default-settings.ts
git commit -m "feat: add summaryLanguage field to AppSettings"
```

---

### Task 2: Add language instruction to provider prompts

**Files:**
- Modify: `src/lib/providers/provider.ts`
- Modify: `src/lib/providers/openai-compatible-provider.ts`
- Modify: `src/lib/providers/claude-provider.ts`
- Modify: `src/lib/providers/gemini-provider.ts`
- Test: `tests/ai/analyze-bookmark.test.ts` (no change needed — provider.analyze is mocked)

**Step 1: Add `summaryLanguage` to `AnalyzeInput`**

Replace `src/lib/providers/provider.ts` with:

```typescript
import type { SummaryLanguage } from "../../types/settings"

export type AnalyzeInput = {
  title: string
  url: string
  content: string
  summaryLanguage?: SummaryLanguage
}

export type AnalyzeResult = {
  summary: string
  tags: string[]
}

export interface AiProvider {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>
}
```

**Step 2: Add shared language instruction helper**

Create `src/lib/providers/language-instruction.ts`:

```typescript
import type { SummaryLanguage } from "../../types/settings"

const LANGUAGE_NAMES: Record<Exclude<SummaryLanguage, "auto">, string> = {
  zh: "Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish"
}

export function buildLanguageInstruction(language: SummaryLanguage | undefined): string {
  if (!language || language === "auto") return ""
  return ` Please respond in ${LANGUAGE_NAMES[language]}.`
}
```

**Step 3: Update `buildPrompt` in OpenAI-compatible provider**

In `src/lib/providers/openai-compatible-provider.ts`, add the import at the top:

```typescript
import { buildLanguageInstruction } from "./language-instruction"
```

Then update `buildPrompt`:

```typescript
function buildPrompt(input: AnalyzeInput): string {
  return (
    'Analyze this bookmark and return strict JSON with shape {"summary":"string","tags":["string"]}.' +
    buildLanguageInstruction(input.summaryLanguage) + "\n" +
    `Bookmark title: ${input.title}\n` +
    `Bookmark URL: ${input.url}\n` +
    `Bookmark content: ${input.content}`
  )
}
```

**Step 4: Update `buildPrompt` in Claude provider**

Same pattern in `src/lib/providers/claude-provider.ts`:

```typescript
import { buildLanguageInstruction } from "./language-instruction"
```

```typescript
function buildPrompt(input: AnalyzeInput): string {
  return (
    'Analyze this bookmark and return strict JSON with shape {"summary":"string","tags":["string"]}.' +
    buildLanguageInstruction(input.summaryLanguage) + "\n" +
    `Bookmark title: ${input.title}\n` +
    `Bookmark URL: ${input.url}\n` +
    `Bookmark content: ${input.content}`
  )
}
```

**Step 5: Update `buildPrompt` in Gemini provider**

Same pattern in `src/lib/providers/gemini-provider.ts`:

```typescript
import { buildLanguageInstruction } from "./language-instruction"
```

```typescript
function buildPrompt(input: AnalyzeInput): string {
  return (
    'Analyze this bookmark and return strict JSON with shape {"summary":"string","tags":["string"]}.' +
    buildLanguageInstruction(input.summaryLanguage) + "\n" +
    `Bookmark title: ${input.title}\n` +
    `Bookmark URL: ${input.url}\n` +
    `Bookmark content: ${input.content}`
  )
}
```

**Step 6: Write test for language instruction helper**

Create `tests/lib/providers/language-instruction.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { buildLanguageInstruction } from "../../../src/lib/providers/language-instruction"

describe("buildLanguageInstruction", () => {
  it("returns empty string for auto", () => {
    expect(buildLanguageInstruction("auto")).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(buildLanguageInstruction(undefined)).toBe("")
  })

  it("returns Chinese instruction for zh", () => {
    expect(buildLanguageInstruction("zh")).toBe(" Please respond in Chinese.")
  })

  it("returns English instruction for en", () => {
    expect(buildLanguageInstruction("en")).toBe(" Please respond in English.")
  })

  it("returns Japanese instruction for ja", () => {
    expect(buildLanguageInstruction("ja")).toBe(" Please respond in Japanese.")
  })
})
```

**Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/lib/providers/language-instruction.test.ts`
Expected: 5 tests PASS

**Step 8: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 9: Commit**

```bash
git add src/lib/providers/provider.ts src/lib/providers/language-instruction.ts src/lib/providers/openai-compatible-provider.ts src/lib/providers/claude-provider.ts src/lib/providers/gemini-provider.ts tests/lib/providers/language-instruction.test.ts
git commit -m "feat: add language instruction to AI provider prompts"
```

---

### Task 3: Pass `summaryLanguage` from `analyzeBookmark` to provider

**Files:**
- Modify: `src/features/ai/analyze-bookmark.ts`
- Modify: `tests/ai/analyze-bookmark.test.ts`

**Step 1: Write failing test — summaryLanguage is forwarded to provider**

Add this test to `tests/ai/analyze-bookmark.test.ts` inside the `describe("analyzeBookmark", ...)` block:

```typescript
  it("forwards summaryLanguage to the provider analyze call", async () => {
    const { analyzeBookmark } = await import("../../src/features/ai/analyze-bookmark")
    const bookmarkRepository = createBookmarkRepository()
    const provider = {
      analyze: vi.fn(async () => ({ summary: "Short summary", tags: ["example"] }))
    }
    const bookmark = createBookmark()

    await analyzeBookmark({
      bookmark,
      provider,
      bookmarkRepository,
      summaryLanguage: "zh"
    })

    expect(provider.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ summaryLanguage: "zh" })
    )
  })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/analyze-bookmark.test.ts`
Expected: FAIL — `summaryLanguage` not passed to `provider.analyze`

**Step 3: Update `analyzeBookmark` to accept and forward `summaryLanguage`**

In `src/features/ai/analyze-bookmark.ts`, update the function signature and the `analyze` call:

```typescript
import type { SummaryLanguage } from "../../types/settings"
import type { AiProvider } from "../../lib/providers/provider"
import type { BookmarkRepository } from "../../lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../../types/bookmark"

export async function analyzeBookmark(input: {
  bookmark: BookmarkRecord
  provider: AiProvider
  bookmarkRepository: BookmarkRepository
  contentOverride?: string
  summaryLanguage?: SummaryLanguage
}): Promise<BookmarkRecord> {
  const content = input.contentOverride ? input.contentOverride : normalizeContent(input.bookmark)
  const analyzingBookmark: BookmarkRecord = {
    ...input.bookmark,
    status: "analyzing",
    errorMessage: undefined,
    updatedAt: new Date().toISOString()
  }

  await input.bookmarkRepository.update(analyzingBookmark)

  try {
    const analysis = await input.provider.analyze({
      title: analyzingBookmark.title,
      url: analyzingBookmark.url,
      content,
      summaryLanguage: input.summaryLanguage
    })
    const analyzedBookmark: BookmarkRecord = {
      ...analyzingBookmark,
      summary: analysis.summary,
      tags: analysis.tags,
      status: "done",
      updatedAt: new Date().toISOString()
    }

    await input.bookmarkRepository.update(analyzedBookmark)

    return analyzedBookmark
  } catch (error) {
    const failedBookmark: BookmarkRecord = {
      ...analyzingBookmark,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Analysis failed",
      updatedAt: new Date().toISOString()
    }

    await input.bookmarkRepository.update(failedBookmark)

    throw error
  }
}

function normalizeContent(bookmark: BookmarkRecord): string {
  const extractedText = normalizeOptionalValue(bookmark.extractedText)

  if (extractedText) {
    return extractedText
  }

  const selectedText = normalizeOptionalValue(bookmark.selectedText)

  if (selectedText) {
    return selectedText
  }

  return bookmark.title.trim()
}

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim()

  return normalized ? normalized : undefined
}
```

**Step 4: Update `background.ts` to pass `summaryLanguage`**

In `src/background.ts`, update the `analyzeBookmark` call inside `processAnalysisQueue`:

```typescript
// After loading settings:
const settings = await settingsRepo.getAppSettings()

// Pass summaryLanguage:
await analyzeBookmark({
  bookmark,
  provider,
  bookmarkRepository: repo,
  contentOverride: textContent,
  summaryLanguage: settings.summaryLanguage
})
```

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/features/ai/analyze-bookmark.ts src/background.ts tests/ai/analyze-bookmark.test.ts
git commit -m "feat: forward summaryLanguage from settings to AI provider"
```

---

### Task 4: Add language dropdown to Options page

**Files:**
- Modify: `src/options.tsx`
- Test: manual (options page UI — no new automated test needed beyond typecheck)

**Step 1: Add the language dropdown to the App Settings section**

In `src/options.tsx`, inside the `<div style={appFieldStackStyle}>` that already contains the "Default provider" dropdown, add a second field group after the existing `defaultProvider` block and before the `autoAnalyzeOnSave` checkbox:

```tsx
            <div style={appFieldStackStyle}>
              <label htmlFor="summary-language" style={fieldLabelStyle}>
                Summary language
              </label>
              <select
                id="summary-language"
                onChange={(event) =>
                  setAppSettings((currentSettings) => ({
                    ...currentSettings,
                    summaryLanguage: event.target.value as typeof currentSettings.summaryLanguage
                  }))
                }
                style={selectStyle}
                value={appSettings.summaryLanguage ?? "auto"}>
                <option value="auto">Auto (follow content)</option>
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/options.tsx
git commit -m "feat: add summary language dropdown to Options page"
```

---

### Task 5: Add compact mode to BookmarkCard and BookmarkList

**Files:**
- Modify: `src/components/bookmark-list.tsx`
- Modify: `src/sidepanel.tsx`
- Modify: `tests/ui/sidepanel.test.tsx`

**Step 1: Write failing test — sidepanel renders compact cards**

Add this test to `tests/ui/sidepanel.test.tsx` inside the `describe("SidePanel", ...)` block:

```typescript
  it("renders bookmark list in compact mode with no summary or tags visible", async () => {
    const b1 = createBookmark({
      id: "1",
      title: "My Article",
      status: "done",
      summary: "A long summary text",
      tags: ["research"]
    })
    const services = createServices({
      bookmarkRepository: createBookmarkRepository({
        list: vi.fn(async () => [b1])
      })
    })

    await renderSidePanel(services)

    // Summary should NOT appear in compact mode
    expect(container?.textContent).not.toContain("A long summary text")
    // Tags should NOT appear in compact mode
    expect(container?.textContent).not.toContain("research")
    // Title should appear
    expect(container?.textContent).toContain("My Article")
  })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/sidepanel.test.tsx`
Expected: FAIL — sidepanel currently renders summary and tags

**Step 3: Add `compact` prop to `BookmarkList` and `BookmarkCard`**

In `src/components/bookmark-list.tsx`:

Update `BookmarkListProps` to include `compact`:

```typescript
type BookmarkListProps = {
  bookmarks: BookmarkRecord[]
  onDelete: (id: string) => Promise<void>
  onAnalyze: (id: string) => Promise<void>
  compact?: boolean
}
```

Update `BookmarkList` to pass `compact` down:

```typescript
export function BookmarkList({ bookmarks, onDelete, onAnalyze, compact = false }: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return (
      <section aria-label="Bookmark results">
        <p>No bookmarks found.</p>
      </section>
    )
  }

  return (
    <ul aria-label="Bookmark results" style={listStyle}>
      {bookmarks.map((bookmark) => (
        <li key={bookmark.id}>
          <BookmarkCard bookmark={bookmark} onDelete={onDelete} onAnalyze={onAnalyze} compact={compact} />
        </li>
      ))}
    </ul>
  )
}
```

Update `BookmarkCardProps` to include `compact`:

```typescript
type BookmarkCardProps = {
  bookmark: BookmarkRecord
  onDelete: (id: string) => Promise<void>
  onAnalyze: (id: string) => Promise<void>
  compact?: boolean
}
```

Update `BookmarkCard` to use compact layout when `compact={true}`:

```typescript
function BookmarkCard({ bookmark, onDelete, onAnalyze, compact = false }: BookmarkCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const showAnalyzeButton = bookmark.status === "saved" || bookmark.status === "error"

  async function handleDelete(): Promise<void> {
    if (!window.confirm("Delete this bookmark?")) {
      return
    }
    await onDelete(bookmark.id)
  }

  if (compact) {
    return (
      <article
        data-bookmark-card="true"
        style={{ ...compactCardStyle, backgroundColor: hovered ? colors.surfaceHover : colors.surface }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={compactMainRowStyle}>
          <div style={compactStatusDotContainerStyle}>
            {bookmark.status === "analyzing" && <span style={dotAmberStyle} title="Analyzing" />}
            {bookmark.status === "error" && <span style={dotRedStyle} title="Error" />}
            {bookmark.status === "done" && <span style={dotGreenStyle} title="Done" />}
          </div>
          <a
            href={bookmark.url}
            rel="noreferrer"
            style={compactTitleLinkStyle}
            target="_blank"
            title={bookmark.title}
          >
            {bookmark.title}
          </a>
          <span style={compactMetaStyle}>{getBookmarkHost(bookmark.url)}</span>
          <div style={{ ...compactActionsStyle, opacity: hovered ? 1 : 0 }}>
            {showAnalyzeButton && (
              <button
                aria-label={`Analyze ${bookmark.title}`}
                data-testid="bookmark-analyze-button"
                onClick={() => void onAnalyze(bookmark.id)}
                style={compactActionButtonStyle}
                type="button"
              >
                Analyze
              </button>
            )}
            <button
              aria-label={`Delete ${bookmark.title}`}
              data-testid="bookmark-delete-button"
              onClick={() => void handleDelete()}
              style={compactActionButtonStyle}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      </article>
    )
  }

  // --- Full (non-compact) card below — unchanged ---
  return (
    <article
      data-bookmark-card="true"
      style={{ ...cardStyle, backgroundColor: hovered ? colors.surfaceHover : colors.surface }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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

      <h3 style={titleStyle}>
        <a href={bookmark.url} rel="noreferrer" style={titleLinkStyle} target="_blank">
          {bookmark.title}
        </a>
      </h3>

      <p data-testid="bookmark-metadata" style={metadataStyle}>
        {formatMetadata(bookmark)}
      </p>

      {bookmark.summary ? (
        <>
          <p
            data-testid="bookmark-summary"
            style={expanded ? summaryExpandedStyle : summaryCollapsedStyle}
          >
            {bookmark.summary}
          </p>
          <button
            data-testid="bookmark-summary-toggle"
            onClick={() => setExpanded((prev) => !prev)}
            style={toggleButtonStyle}
            type="button"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </>
      ) : null}

      {bookmark.tags.length > 0 ? (
        <ul aria-label={`${bookmark.title} tags`} style={tagListStyle}>
          {bookmark.tags.map((tag) => (
            <li data-testid="bookmark-tag" key={tag} style={tagStyle}>
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {bookmark.status === "error" && bookmark.errorMessage ? (
        <p data-testid="bookmark-error-message" style={errorMessageStyle}>
          {bookmark.errorMessage}
        </p>
      ) : null}
    </article>
  )
}
```

**Step 4: Add compact styles to `bookmark-list.tsx`**

Add these style objects at the bottom of `src/components/bookmark-list.tsx` (after the existing styles):

```typescript
const compactCardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  borderBottom: `1px solid ${colors.borderMuted}`,
  padding: `6px ${spacing.sm}`,
  display: "flex",
  alignItems: "center"
}

const compactMainRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  width: "100%",
  overflow: "hidden"
}

const compactStatusDotContainerStyle: React.CSSProperties = {
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

const compactTitleLinkStyle: React.CSSProperties = {
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

const compactMetaStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "0.75rem",
  flexShrink: 0,
  whiteSpace: "nowrap"
}

const compactActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "2px",
  flexShrink: 0,
  transition: "opacity 0.15s ease"
}

const compactActionButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colors.textMuted,
  fontSize: "0.75rem",
  padding: "2px 4px",
  borderRadius: radius.small
}
```

**Step 5: Pass `compact={true}` from sidepanel**

In `src/sidepanel.tsx`, find the `<BookmarkList>` render call and add `compact`:

```tsx
<BookmarkList
  bookmarks={filteredBookmarks}
  compact={true}
  onDelete={handleDeleteBookmark}
  onAnalyze={handleAnalyzeBookmark}
/>
```

**Step 6: Run sidepanel tests**

Run: `npx vitest run tests/ui/sidepanel.test.tsx`
Expected: All tests PASS

**Step 7: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 8: Commit**

```bash
git add src/components/bookmark-list.tsx src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat: add compact bookmark card mode for sidepanel"
```
