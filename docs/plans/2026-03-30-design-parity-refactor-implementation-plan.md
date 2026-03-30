# Design-Parity Refactor Implementation Plan

**Goal:** Refactor TabVault so the shipped product structure, UI, and interaction model align with the `design/` prototypes while preserving the current working capability layer.

**Architecture:** Keep the existing storage, extraction, provider, analysis, theme, and hybrid-retrieval modules. Refactor page composition and shared UI primitives so the product is organized around four surfaces: Popup, Side Panel, Dashboard, and Settings.

**Tech Stack:** Plasmo, React, TypeScript, Chrome Extension APIs, IndexedDB, `chrome.storage.sync`, existing provider and retrieval modules.

---

## Architecture Decisions

### 1. Dashboard entry path
- Use a dedicated dashboard page at `src/tabs/dashboard.tsx`.
- Open it with `chrome.tabs.create({ url: chrome.runtime.getURL("tabs/dashboard.html") })`.
- Do not overload `src/options.tsx` with dashboard responsibility.

### 2. Settings responsibility
- Keep `src/options.tsx` as the Settings page.
- Refactor its layout and sections to match `design/settings.html`, but do not merge it with the dashboard.

### 3. Shared navigation helper
- Add a small shared navigation helper, for example `src/lib/utils/navigation.ts`, to centralize:
  - open dashboard tab
  - open side panel for current tab
  - open settings page if still needed
- Do not leave raw navigation API calls duplicated across popup and sidepanel.

### 4. Bookmark metadata update helper
- Add a shared helper for summary/tag updates, for example `src/lib/storage/update-bookmark-metadata.ts` or `src/features/dashboard/update-bookmark-metadata.ts`.
- This helper must:
  - accept a full `BookmarkRecord`
  - update `summary`, `aiTags`, and `userTags`
  - always write a fresh `updatedAt`
- Reuse this helper from dashboard and any existing surfaces that currently duplicate this logic.

---

## Dashboard MVP Scope

The first dashboard release must include only the following:

- Left navigation column with bookmark items grouped by a simple real dimension such as recency or domain.
- Top search bar shell. It may be visual-only in this refactor.
- Center reading pane with bookmark title, URL, `createdAt`, and `extractedText`.
- Right AI sidebar with:
  - editable summary card
  - editable tags card
  - lightweight Ask Ghostreader box for the active bookmark
- Bookmark selection that switches the active reading item.
- Theme toggle consistent with other surfaces.

**Explicitly out of scope for MVP:**
- spaces backend
- semantic search inside dashboard
- multi-turn chat history
- recommendation system
- knowledge graph
- export workflows

---

## Testing Strategy

- Keep using the repo's existing test layout under `tests/`.
- Prefer new tests under `tests/ui/` unless a narrower existing test area is a better fit.
- Do not assume a shared `test-utils` helper exists. Follow nearby test patterns already used in:
  - `tests/ui/popup-state.test.tsx`
  - `tests/ui/sidepanel.test.tsx`
  - `tests/ui/options.test.tsx`
  - `tests/ui/options-bookmarks-tag-editing.test.tsx`
- For each task, run the smallest relevant Vitest command first, then `npm run typecheck`.
- Final verification must run the full test suite with `npx vitest run`.

---

## Task 1: Align shared design tokens

**Files**
- Modify: `src/ui/design-tokens.ts`
- Verify compatibility in: `src/ui/use-global-styles.ts`
- Verify compatibility in: `src/ui/theme-context.tsx`
- Verify compatibility in: `src/ui/use-theme.ts`
- Create: `tests/ui/design-tokens.test.ts`

**Implementation notes**
- Update `lightTokens` and `darkTokens` to match the color variables used in:
  - `design/popup.html`
  - `design/sidepanel.html`
  - `design/dashboard.html`
  - `design/settings.html`
- Add `accentHover` to `ThemeTokens`.
- Preserve the existing token surface unless there is a strong reason to rename fields.
- Keep `radius.medium` at `8px` and `radius.large` at `12px`.
- Add `radius.xl` at `16px` if needed for larger dashboard cards.

**Validation**
- Create `tests/ui/design-tokens.test.ts` with basic assertions that `lightTokens` and `darkTokens` contain the required fields including `accentHover`. Then run:
- Run: `npx vitest run tests/ui/design-tokens.test.ts`
- Run: `npm run typecheck`

---

## Task 2: Add shared layout primitives

**Files**
- Create: `src/components/shared/app-shell.tsx`
- Create: `src/components/shared/section-card.tsx`
- Create: `src/components/shared/search-input.tsx`
- Create: `src/components/shared/icon-button.tsx`
- Optional minor alignment: `src/components/error-banner.tsx`
- Test: add new tests under `tests/ui/`

**Implementation notes**
- Keep these primitives narrow and practical.
- `SectionCard` should support the props it claims to support. If `className` is in the props type, it must be wired through.
- Prefer style consistency with existing inline-style patterns already used in the repo.
- Avoid introducing a full design system.

**Validation**
- Add a focused primitive test, for example `tests/ui/section-card.test.tsx`.
- Run the new targeted test.
- Run: `npm run typecheck`

---

## Task 3: Add shared navigation helper

**Files**
- Create: `src/lib/utils/navigation.ts`
- Modify callers in later tasks:
  - `src/popup.tsx`
  - `src/sidepanel.tsx`

**Implementation notes**
- Add small wrappers such as:
  - `openDashboardTab()`
  - `openCurrentTabSidePanel()`
  - `openSettingsPage()` if still needed
- Use `chrome.tabs.create` with `chrome.runtime.getURL("tabs/dashboard.html")` for dashboard.
- Keep browser API access in one place where possible.

**Validation**
- Add focused unit tests in `tests/lib/utils/` if practical.
- Run: `npm run typecheck`

---

## Task 4: Refactor popup into a quick-entry surface

> **Prereq: Task 3** — `src/lib/utils/navigation.ts` must exist before this task.

**Files**
- Modify: `src/popup.tsx`
- Reuse: `src/features/bookmarks/save-current-page.ts`
- Reuse: `src/features/ai/analyze-bookmark.ts`
- Reuse: `src/components/shared/*`
- Reuse: `src/lib/utils/navigation.ts`
- Test: add popup UI coverage under `tests/ui/`

**Remove from popup**
- primary bookmark management list UI
- bookmark drawer detail workflow
- search and filter controls
- bulk actions such as analyze all or clear all
- list-management-only state and handlers

**Keep in popup**
- current page save flow
- optional auto-analysis flow
- save status and error messaging
- theme toggle
- entry actions to open side panel and dashboard

**Implementation notes**
- Show a current-page card with the active tab title and save status.
- Add `data-testid` hooks for the new surface:
  - `popup-primary-action`
  - `popup-open-sidepanel`
  - `popup-open-dashboard`
- Use the new navigation helper instead of direct browser API calls.

**Validation**
- Add `tests/ui/popup-quick-entry.test.tsx`.
- Keep existing `tests/ui/popup-state.test.tsx` passing.
- Run:
  - `npx vitest run tests/ui/popup-quick-entry.test.tsx tests/ui/popup-state.test.tsx`
  - `npm run typecheck`

---

## Task 5: Reframe sidepanel as Ghostreader

> **Prereq: Task 3** — `src/lib/utils/navigation.ts` must exist before this task.

**Files**
- Modify: `src/sidepanel.tsx`
- Modify: `src/components/hybrid-context-bar.tsx`
- Modify: `src/components/hybrid-query-stream.tsx`
- Modify or reduce: `src/components/bookmark-list.tsx`
- Modify or reduce: `src/components/bookmark-tree.tsx`
- Reuse: `src/features/hybrid-retrieval/*`
- Reuse: `src/lib/utils/navigation.ts`
- Test: extend sidepanel UI coverage under `tests/ui/`

**Implementation notes**
- Make the assistant flow visually primary.
- Keep current-page-aware retrieval behavior intact.
- If bookmark tree or bookmark list remains, demote it to a secondary region instead of making it the first focal area.
- Add a stable hook for the primary prompt input, for example `data-testid="ghostreader-input"`.
- Do not require `bookmark-tree` to disappear entirely if a secondary version still serves a real use case.

**Validation**
- Add `tests/ui/sidepanel-ghostreader.test.tsx`.
- Keep existing `tests/ui/sidepanel.test.tsx` passing.
- Run:
  - `npx vitest run tests/ui/sidepanel-ghostreader.test.tsx tests/ui/sidepanel.test.tsx`
  - `npm run typecheck`

---

## Task 6: Add dashboard page shell

**Files**
- Create: `src/tabs/dashboard.tsx`
- Create: `src/features/dashboard/dashboard-shell.tsx`
- Create: `src/features/dashboard/dashboard-navigation.tsx`
- Create: `src/features/dashboard/dashboard-reading-pane.tsx`
- Create: `src/features/dashboard/dashboard-ai-sidebar.tsx`
- Test: add dashboard shell coverage under `tests/ui/`

**Implementation notes**
- `src/tabs/dashboard.tsx` is the only dashboard entry file for this plan.
- Plasmo automatically generates a `tabs/dashboard.html` page for any `.tsx` file under `src/tabs/`. The entry file must manually bootstrap React:
  ```tsx
  import React from "react"
  import ReactDOM from "react-dom/client"
  import { DashboardApp } from "../features/dashboard/dashboard-shell"

  ReactDOM.createRoot(document.getElementById("root")!).render(<DashboardApp />)
  ```
  This is different from `popup.tsx` and `sidepanel.tsx`, which Plasmo bootstraps automatically.
- Use the same theme stack as the rest of the extension:
  - `useTheme`
  - `ThemeProvider`
  - `useGlobalStyles`
- Build the dashboard as a 3-column layout:
  - left nav
  - center reading pane
  - right AI sidebar

**Validation**
- Add `tests/ui/dashboard-shell.test.tsx`.
- Run:
  - `npx vitest run tests/ui/dashboard-shell.test.tsx`
  - `npm run typecheck`

---

## Task 7: Connect dashboard to real bookmark data

**Files**
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Modify: `src/features/dashboard/dashboard-navigation.tsx`
- Modify: `src/features/dashboard/dashboard-reading-pane.tsx`
- Reuse: `src/lib/storage/indexeddb-bookmark-repository.ts`
- Reuse: `src/types/bookmark.ts`
- Test: extend dashboard UI coverage under `tests/ui/`

**Implementation notes**
- Load bookmarks from the existing repository.
- Use real `BookmarkRecord` fields:
  - `createdAt`
  - `extractedText`
  - `summary`
  - `aiTags`
  - `userTags`
- Do not use nonexistent fields like `savedAt` or `content`.
- Default grouping can be simple recency ordering from `list()`.
- If no bookmark is selected, show a clear empty reading state.

**Validation**
- Add or extend a dashboard navigation/read-pane test under `tests/ui/`.
- Run:
  - `npx vitest run tests/ui/dashboard-shell.test.tsx`
  - `npm run typecheck`

---

## Task 8: Add shared bookmark metadata update helper

**Files**
- Create: `src/lib/storage/update-bookmark-metadata.ts` or `src/features/dashboard/update-bookmark-metadata.ts`
- Modify current callers as practical:
  - `src/options.tsx`
  - `src/popup.tsx`
  - `src/sidepanel.tsx`
  - dashboard files added in later tasks

**Implementation notes**
- Centralize summary and tag updates.
- Always produce a full `BookmarkRecord` and set a fresh `updatedAt`.
- Keep this helper minimal and reuse the existing repository interface.

**Validation**
- Add a focused unit test under `tests/storage/` or `tests/unit/`.
- Run:
  - targeted Vitest command for the helper
  - `npm run typecheck`

---

## Task 9: Add editable summary and tags to dashboard

**Files**
- Create: `src/features/dashboard/editable-summary-card.tsx`
- Create: `src/features/dashboard/editable-tags-card.tsx`
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx`
- Reuse: shared metadata update helper
- Test: add dashboard editing coverage under `tests/ui/`

**Implementation notes**
- Summary card supports read, edit, save, and cancel.
- Tags card supports read, edit, add, and remove.
- Use accessible labels in tests, for example:
  - `Edit summary`
  - `Save summary`
  - `Cancel summary edit`
- Avoid using localized button text as the main test selector.
- Save actions must update the bookmark via the shared metadata helper so `updatedAt` stays correct.

**Validation**
- Add `tests/ui/dashboard-editing.test.tsx`.
- Run:
  - `npx vitest run tests/ui/dashboard-editing.test.tsx`
  - `npm run typecheck`

---

## Task 10: Add Ask Ghostreader in dashboard

**Files**
- Create: `src/features/dashboard/dashboard-ask-box.tsx`
- Modify: `src/features/dashboard/dashboard-ai-sidebar.tsx`
- Reuse: `src/features/hybrid-retrieval/*` where practical
- Test: extend dashboard UI coverage under `tests/ui/`

**Implementation notes**
- Keep this scoped to the active bookmark.
- Do not build a second full chat system.
- A simple first pass is acceptable:
  - input
  - submit action
  - loading state
  - compact answer block
- Use stable selectors such as:
  - `dashboard-ask-input`
  - `dashboard-ask-submit`

**Validation**
- Extend `tests/ui/dashboard-editing.test.tsx` or add `tests/ui/dashboard-ask-box.test.tsx`.
- Run:
  - targeted dashboard ask test
  - `npm run typecheck`

---

## Task 11: Refactor options into architecture-centered settings

**Files**
- Modify: `src/options.tsx`
- Modify: `src/components/provider-settings-form.tsx`
- Create: `src/features/settings/provider-settings-section.tsx`
- Create: `src/features/settings/retrieval-settings-section.tsx`
- Create: `src/features/settings/experience-settings-section.tsx`
- Reuse:
  - `src/features/settings/default-settings.ts`
  - `src/features/settings/provider-form-state.ts`
  - `src/features/settings/settings-validation.ts`
- Test: existing options UI tests

**Implementation notes**
- Keep `src/options.tsx` as Settings only.
- Reorganize the page into system sections:
  - provider and protocol
  - retrieval architecture
  - experience and theme
  - trial and license
- Preserve existing persistence and validation behavior.
- Clearly label any future-facing controls as not yet wired.

**Validation**
- Keep these passing:
  - `tests/ui/options.test.tsx`
  - `tests/ui/options-load-state.test.tsx`
  - `tests/ui/options-save-state.test.tsx`
  - `tests/ui/options-bookmarks-dashboard.test.tsx`
  - `tests/ui/options-bookmarks-tag-editing.test.tsx`
- Run:
  - `npx vitest run tests/ui/options.test.tsx tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx tests/ui/options-bookmarks-dashboard.test.tsx tests/ui/options-bookmarks-tag-editing.test.tsx`
  - `npm run typecheck`

---

## Task 12: Remove superseded UI paths

**Files**
- Modify: `src/popup.tsx`
- Modify: `src/sidepanel.tsx`
- Modify: `src/options.tsx`
- Modify: superseded files under `src/components/*` as needed

**Implementation notes**
- Remove clearly obsolete paths instead of leaving parallel MVP UI behind.
- Focus on dead or duplicated flows created by the refactor.
- Do not remove code paths still covered by active tests unless the new path fully replaces them.

**Validation**
- Run:
  - the focused popup, sidepanel, dashboard, and options test commands used above
  - `npm run typecheck`

---

## Task 13: Cross-surface cohesion pass

**Files**
- No required code changes unless issues are found

**Checklist**
- Popup, sidepanel, dashboard, and settings share:
  - theme behavior
  - card treatment
  - border language
  - button treatment
  - empty and error state tone
- Real behavior still works:
  - save current page
  - analyze current page
  - open dashboard tab
  - open side panel
  - sidepanel current-page query
  - settings load and save
  - dashboard summary and tag editing

**Validation**
- Run:
  - `npm run typecheck`
  - `npx vitest run`

---

## Final Verification

### Required commands
```bash
npm run typecheck
npx vitest run
```

### Manual smoke checklist
- popup opens as a current-page-first quick entry surface
- popup save flow still works
- popup can open side panel
- popup can open dashboard tab
- sidepanel feels query-first and assistant-led
- dashboard opens in a new tab
- dashboard can switch active bookmarks
- dashboard shows `createdAt` and `extractedText`
- dashboard can edit summary and tags
- settings load and save without regressions
- theme stays consistent across all surfaces

### Done definition
- No unresolved type errors
- Full Vitest suite passes
- No duplicated raw navigation logic remains
- No new bookmark metadata update path skips `updatedAt`
- Popup, Side Panel, Dashboard, and Settings each match their intended role from the design document
