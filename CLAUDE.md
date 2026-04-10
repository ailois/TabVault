# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo-specific guardrails

- Do not delete the `.git` directory.
- There is currently no lint script in `package.json`; do not invent one in plans or status updates.
- `AGENTS.md` is stale and describes an earlier repo state without source code. Prefer the current codebase, `README.md`, and `docs/`.

## Common commands

### Install
```bash
npm install
```

### Develop the extension
```bash
npm run dev
```

Plasmo builds a development extension. Load `build/chrome-mv3-dev` as an unpacked extension in Chrome/Edge after the first successful build.

### Production build
```bash
npm run build
```

Production output is written to `build/chrome-mv3-prod`.

### Package build
```bash
npm run package
```

### Typecheck
```bash
npm run typecheck
```

### Run tests
```bash
npm exec vitest run
```

### Run a single test file
```bash
npm exec vitest run tests/ui/options.test.tsx
```

### Run a single test by name
```bash
npm exec vitest run tests/ui/options.test.tsx -t "loads saved settings"
```

## Manual verification docs

- `docs/manual-testing.md` — developer manual test flows
- `docs/qa-checklist.md` — lightweight regression checklist before release

## High-level architecture

TabVault is a local-first browser extension built with Plasmo, React, and TypeScript. The core split is between extension surfaces (`popup`, `sidepanel`, `options`, `dashboard`, `background`), local persistence (IndexedDB + `chrome.storage.sync`), and AI/provider integration.

### Extension entrypoints

- `src/popup.tsx` — quick entry for saving the current page, optionally auto-analyzing it, and opening the sidepanel/dashboard/settings.
- `src/sidepanel.tsx` — Ghostreader UI. This is the conversational surface that combines current-page context, bookmark retrieval, answer rendering, and session memory.
- `src/options.tsx` — settings UI for provider configuration, theme/language preferences, and related knowledge/settings controls.
- `src/tabs/dashboard.tsx` — mounts the full bookmark management dashboard.
- `src/background.ts` — background coordinator for runtime messages, Chrome bookmark import, batch analysis, retry logic, trial analysis, and progress events consumed by the UI.
- `src/content.ts` — currently minimal content-script stub.

### Data and persistence

- Bookmark data lives in IndexedDB via `src/lib/storage/db.ts` and `src/lib/storage/indexeddb-bookmark-repository.ts`.
- App settings and provider configs live in `chrome.storage.sync` via `src/lib/config/chrome-settings-repository.ts`.
- Theme state is handled separately through `src/lib/config/theme-repository.ts`.
- The TS path alias `~*` maps to `src/*`.

### AI/provider layer

- `src/lib/providers/provider-factory.ts` is the single entrypoint for provider selection.
- Provider implementations live in `src/lib/providers/`:
  - `openai-compatible-provider.ts`
  - `claude-provider.ts`
  - `gemini-provider.ts`
- `src/features/ai/analyze-bookmark.ts` is the shared bookmark-analysis flow: mark as analyzing, call provider, persist summary/tags, and store error state on failure.
- Current implementation uses real network paths for supported providers rather than mock transports.

### Bookmark workflow

The core product flow is:
1. extract page content,
2. save a bookmark locally,
3. optionally analyze it with the selected provider,
4. surface the result in popup/sidepanel/dashboard.

Relevant modules:
- `src/features/bookmarks/save-current-page.ts`
- `src/lib/extraction/extract-page.ts`
- `src/features/bookmarks/search-bookmarks.ts`
- `src/lib/storage/update-bookmark-metadata.ts`

### Ghostreader and hybrid retrieval

The sidepanel is more than a plain chat box. It uses local bookmark retrieval plus current-page context to answer questions.

- Retrieval/ranking/answer assembly live in `src/features/hybrid-retrieval/`.
- Session state, reference resolution, bookmark-added events, and follow-up memory live in `src/features/ghostreader-session/`.
- `retrieve-hybrid-results.ts` builds a combined candidate set from saved bookmarks plus the current page, then ranks it.
- `ghostreader.ts`, `build-answer-block.ts`, and `build-action-cards.ts` shape the response shown in the sidepanel.

### Dashboard structure

The dashboard is the full-library management surface mounted from `src/tabs/dashboard.tsx` and centered on `src/features/dashboard/dashboard-shell.tsx`.

It combines:
- Chrome bookmark tree context,
- locally stored bookmark metadata/analysis,
- bulk editing,
- reading/detail panes,
- ask/search surfaces,
- runtime refresh based on background events.

If a change affects bookmark visibility, selection, analysis progress, or sync between Chrome bookmarks and local metadata, inspect the dashboard feature modules as a group rather than in isolation.

### Settings, i18n, theme, and trial/licensing

- Settings defaults and validation live in `src/features/settings/`.
- User-facing copy is centralized in `src/lib/i18n/`.
- Theme tokens/context/hooks live in `src/ui/` and `src/lib/config/theme-repository.ts`.
- Trial/licensing logic lives in `src/lib/trial/` and is consumed by popup/options/sidepanel.

## Change-focused guidance

- Provider changes: inspect `src/lib/providers/*`, `src/lib/providers/provider-factory.ts`, and `src/features/ai/analyze-bookmark.ts`; start with `tests/providers/` and relevant `tests/ai/` coverage.
- Ghostreader / sidepanel changes: inspect `src/sidepanel.tsx` together with `src/features/hybrid-retrieval/*` and `src/features/ghostreader-session/*`; start with `tests/hybrid-retrieval/`, `tests/ghostreader-session/`, and the relevant `tests/ui/sidepanel*.test.tsx` files.
- Dashboard changes: inspect `src/features/dashboard/dashboard-shell.tsx` plus the surrounding dashboard feature modules, because selection, filtering, reading pane state, and runtime refresh behavior are coupled; start with `tests/ui/dashboard-*.test.tsx` and related dashboard UI tests.
- Settings changes: inspect `src/options.tsx`, `src/features/settings/*`, `src/lib/config/chrome-settings-repository.ts`, and provider metadata/i18n helpers; start with `tests/settings/`, `tests/config/`, and `tests/ui/options*.test.tsx`.
- Storage model changes: inspect both `src/lib/storage/db.ts` and `src/lib/storage/indexeddb-bookmark-repository.ts`, then verify any consumers that depend on bookmark shape or migration behavior.

## Test layout

Tests are organized by domain under `tests/`, roughly mirroring the source areas:
- `tests/ui/` for React surfaces
- `tests/providers/` for provider adapters
- `tests/hybrid-retrieval/` and `tests/ghostreader-session/` for sidepanel intelligence
- `tests/bookmarks/`, `tests/storage/`, `tests/config/`, `tests/settings/`, `tests/lib/` for lower-level behavior

When changing a feature area, start by running the corresponding test directory or file before running the full suite.
