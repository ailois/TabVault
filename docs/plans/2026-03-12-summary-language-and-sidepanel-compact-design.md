# Summary Language & Sidepanel Compact Cards Design

**Date:** 2026-03-12
**Status:** Approved

## Goals

1. Let users choose the language AI summaries are generated in (currently the AI picks the language based on the page content, which is unpredictable).
2. Make the sidepanel bookmark list more compact so users can see more bookmarks at once.

---

## Part 1: Summary Language Setting

### Data

Add `summaryLanguage` field to `AppSettings` in `src/types/settings.ts`:

```typescript
export type SummaryLanguage = "auto" | "zh" | "en" | "ja" | "ko" | "fr" | "de" | "es"

export type AppSettings = {
  defaultProvider: ProviderType
  autoAnalyzeOnSave: boolean
  summaryLanguage: SummaryLanguage  // NEW
}
```

Default value: `"auto"` (AI decides based on content — existing behavior).

### Settings UI

Add a dropdown to the Options page alongside the existing `defaultProvider` and `autoAnalyzeOnSave` fields:

| Value | Display label |
|-------|--------------|
| `auto` | Auto (follow content) |
| `zh` | 中文 |
| `en` | English |
| `ja` | 日本語 |
| `ko` | 한국어 |
| `fr` | Français |
| `de` | Deutsch |
| `es` | Español |

### Prompt Change

Each provider's `buildPrompt` function appends a language instruction when `summaryLanguage !== "auto"`:

```
Analyze this bookmark and return strict JSON with shape {"summary":"string","tags":["string"]}. Please respond in Chinese.
Bookmark title: ...
```

The language name mapping (code → natural language name):
- `zh` → `Chinese`
- `en` → `English`
- `ja` → `Japanese`
- `ko` → `Korean`
- `fr` → `French`
- `de` → `German`
- `es` → `Spanish`

### Flow

1. Options page reads `summaryLanguage` from settings, shows dropdown.
2. User selects a language, saves.
3. When `analyzeBookmark` is called, it loads settings and passes `summaryLanguage` to the provider's `analyze()` method.
4. `analyze()` includes the language instruction in the prompt when not `"auto"`.

### Files to change

- `src/types/settings.ts` — add `SummaryLanguage` type and field
- `src/lib/config/chrome-settings-repository.ts` — ensure `summaryLanguage` is handled in defaults
- `src/lib/providers/provider.ts` — add `summaryLanguage` to `AnalyzeInput`
- `src/lib/providers/openai-compatible-provider.ts` — update `buildPrompt`
- `src/lib/providers/claude-provider.ts` — update `buildPrompt`
- `src/lib/providers/gemini-provider.ts` — update `buildPrompt`
- `src/features/ai/analyze-bookmark.ts` — pass `summaryLanguage` from settings into provider
- `src/options.tsx` — add language dropdown to settings form

---

## Part 2: Sidepanel Compact Bookmark Cards

### Approach

Add a `compact` boolean prop to `BookmarkCard` (and `BookmarkList`). The sidepanel passes `compact={true}`; the popup passes nothing (defaults to `false`). Same component, two visual modes — no code duplication.

### Compact card layout

Target height: ~44–48px per row.

```
[status dot] [title (truncated, 1 line)]   [domain · date]   [hover: Analyze | ×]
```

- **Status indicator**: small colored dot (●) instead of a text badge
  - `analyzing` → amber dot
  - `error` → red dot
  - `done` → green dot
  - `saved` → no dot (neutral)
- **Title**: single line, `overflow: hidden`, `text-overflow: ellipsis`
- **Metadata**: domain + date, right-aligned or after title in muted text, smaller font
- **Summary and tags**: hidden in compact mode (not rendered)
- **Action buttons** (Analyze, Delete): hidden by default, appear on hover via CSS `opacity` transition. Icon-only (× and a small ⚡ or "A" label).

### Non-compact (popup) mode

No change — existing full card with summary expand/collapse, tag chips, and always-visible buttons remains.

### Files to change

- `src/components/bookmark-list.tsx` — add `compact` prop to `BookmarkList` and `BookmarkCard`, render compact layout when `compact={true}`
- `src/sidepanel.tsx` — pass `compact={true}` to `BookmarkList`

---

## What does NOT change

- Popup bookmark cards — unchanged
- Analysis logic — unchanged
- Storage schema (BookmarkRecord) — unchanged
- The compact card still supports delete and analyze actions (just hidden until hover)
