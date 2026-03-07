# TabVault MVP Design

**Date:** 2026-03-07
**Status:** Approved for planning

## Goal
Turn TabVault from a README-only concept into a runnable local-first browser extension MVP that can save a page, store it locally, and generate AI summary + tags using a user-provided API key.

## Product Scope

### In Scope for MVP
- Save current page
- Capture `title`, `url`, and basic page text
- Store bookmarks locally
- Configure one or more AI providers with user-managed API keys
- Generate summary and tags for a saved bookmark
- List and search saved bookmarks

### Out of Scope for MVP
- Backend services
- Account hosting or API key custody
- Folder system
- Similar-bookmark dedupe
- Batch reprocessing
- Export flows
- Multi-provider optimization UX beyond basic selection

## Core Product Principles
- **Local-first by default**: config stays in browser storage; bookmark content and AI results stay local.
- **User-owned credentials**: users enter and manage their own API keys.
- **Progressive enhancement**: saving a bookmark must work even if AI analysis fails.
- **Smallest useful loop first**: page save → local persistence → optional AI summary/tagging.

## Recommended Technical Stack
- **Framework:** Plasmo
- **Language:** TypeScript
- **UI:** React
- **Config storage:** `chrome.storage`
- **Bookmark storage:** IndexedDB
- **Testing:** Vitest for library logic, lightweight component tests later

## Recommended Project Shape
```text
TabVault/
├── package.json
├── tsconfig.json
├── src/
│   ├── popup.tsx
│   ├── options.tsx
│   ├── background.ts
│   ├── content.ts
│   ├── components/
│   ├── features/
│   │   ├── bookmarks/
│   │   ├── settings/
│   │   └── ai/
│   ├── lib/
│   │   ├── storage/
│   │   ├── providers/
│   │   ├── extraction/
│   │   └── config/
│   ├── types/
│   └── utils/
└── tests/
```

## Architecture

### 1. Extension Surface
- `src/popup.tsx`: quick actions, save current page, recent status
- `src/options.tsx`: provider/API key/model settings
- `src/background.ts`: orchestration for long-lived extension tasks and messaging
- `src/content.ts`: page extraction helpers for current tab

### 2. Domain Layers
- **UI layer**: popup/options React screens
- **Application layer**: save bookmark flow, analyze bookmark flow
- **Infrastructure layer**: IndexedDB, browser storage, provider HTTP clients

### 3. Storage Split
- `chrome.storage`: provider configs, default model/provider, user preferences
- IndexedDB: bookmark records, extracted content, summary, tags, processing state

This split matches the product shape: lightweight settings in browser-managed storage, larger bookmark datasets in structured local DB.

## Core Data Model

### Bookmark
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
```

### Provider Settings
```ts
export type ProviderType = "openai" | "claude" | "gemini"

export type ProviderConfig = {
  provider: ProviderType
  apiKey: string
  baseUrl?: string
  model: string
  enabled: boolean
}
```

### App Settings
```ts
export type AppSettings = {
  defaultProvider: ProviderType
  autoAnalyzeOnSave: boolean
}
```

## Provider Strategy

### Recommended rollout
1. Define one shared `AiProvider` interface
2. Implement **OpenAI-compatible first**
3. Add Claude and Gemini later behind the same interface

Reason: the product promises multi-provider support, but MVP risk is reduced by proving one provider end-to-end first.

## Main User Flows

### Flow A: Save current page
1. User opens popup
2. Clicks “Save current page”
3. Extension gets active tab metadata
4. Content script extracts basic text
5. Bookmark saved to IndexedDB with `status: "saved"`

### Flow B: Analyze bookmark
1. User clicks “Analyze” or auto-analyze is enabled
2. App loads provider config from `chrome.storage`
3. App sends page text to provider adapter
4. Summary + tags written back to IndexedDB
5. Bookmark status becomes `done` or `error`

### Flow C: Review bookmarks
1. User opens popup or dedicated list view
2. App loads recent bookmarks from IndexedDB
3. User searches by title/url/tag/content summary

## Error Handling Rules
- Saving bookmark must not depend on AI success.
- Missing API key should block analysis with a clear UI message.
- Extraction failure should still allow saving `title + url` fallback.
- Provider-specific errors should be normalized into user-readable messages.

## UI Guidance
- Keep popup focused on quick actions and recent items.
- Move larger bookmark browsing/search into a fuller view as the project grows.
- Do not overload popup with dense management UI too early.

## MVP Milestones

### Milestone 1: Bootstrap
- Plasmo project runs locally
- Popup/options/background/content entry files exist
- Type system and basic folder structure are in place

### Milestone 2: Local Bookmark Loop
- Save current page
- Persist locally
- View saved bookmarks
- Search bookmarks

### Milestone 3: AI Enhancement
- Configure one provider
- Generate summary
- Generate tags
- Surface processing/error states

## Risks to Avoid
- Building three providers at once
- Putting all data into `chrome.storage`
- Coupling provider logic directly to React components
- Designing advanced folder/dedupe/export features before the save/analyze loop works
- Introducing backend dependence that conflicts with local-first scope

## Recommended First Implementation Target
Ship the smallest useful vertical slice:

1. Plasmo scaffold boots
2. Popup can save current page
3. Bookmark appears in local list
4. Options page stores one OpenAI-compatible config
5. Analyze button writes summary + tags back to the same bookmark

That is the first real version of TabVault.
