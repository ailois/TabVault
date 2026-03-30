# Single Bookmark Analysis Feedback Design

## Overview
This design improves the UX for single-bookmark analysis across TabVault entry points. Today, clicking `Analyze` on an individual bookmark appears unresponsive because the UI waits for the full async analysis flow to finish before reflecting any state change. The new design adds immediate inline loading feedback so the user can see that analysis has started.

## Goals
1. Show immediate visual feedback when a user clicks single-bookmark `Analyze`.
2. Eliminate the "looks frozen" gap before the bookmark reloads with its persisted status.
3. Keep the experience consistent across `sidepanel`, `popup`, and `options`.
4. Reuse the existing `analyzing` UI state instead of introducing a new persisted bookmark status.

## Non-Goals
1. Do not redesign bulk analysis.
2. Do not add a new background message protocol for single-bookmark analysis.
3. Do not add new persistent fields to bookmark records.
4. Do not block the whole page with a modal or full-screen overlay.

## Root Cause
The current single-bookmark handlers in `src/sidepanel.tsx`, `src/popup.tsx`, and `src/options.tsx` await `analyzeBookmark(...)` directly and only refresh the list after the promise settles. Although `analyzeBookmark` updates the bookmark record to `status: "analyzing"`, the UI does not reload immediately after that repository update. As a result, the user sees no visible state change during the longest part of the analysis request and perceives the page as stuck.

## Recommended Approach
Use optimistic UI at the container layer.

Each entry point maintains a local in-memory set of bookmarks currently being analyzed:
- `sidepanel` and `popup`: track by bookmark `id`
- `options`: track by bookmark `url`, matching its existing `metadataMap[url]` flow

When the user clicks `Analyze` for a single bookmark:
1. Validate provider configuration and locate the target bookmark record.
2. Add the target item to the local analyzing set.
3. Clear stale error UI if needed.
4. Re-render the list so that bookmark is displayed as `status: "analyzing"` immediately.
5. Execute the real `analyzeBookmark(...)` call.
6. In `finally`, remove the item from the local analyzing set and reload data.

This keeps the source of truth unchanged while removing the dead-air interval in the UI.

## Architecture

### 1. Presentation Layer
`src/components/bookmark-list.tsx` already has conditional rendering for `bookmark.status === "analyzing"`. The component will be updated to provide a clearer inline loading indicator:
- a small spinner
- loading copy such as `Analyzing...`
- no `Analyze` button while the item is in the analyzing state

Both compact and full card variants will show aligned feedback so the behavior is visually consistent.

### 2. Container Layer
The three single-bookmark analyze handlers will be updated:
- `src/sidepanel.tsx`
- `src/popup.tsx`
- `src/options.tsx`

Each handler will merge persisted bookmark data with the local analyzing set before rendering `BookmarkList` or equivalent card content. If a bookmark is locally marked as analyzing, the rendered record is temporarily overridden to `status: "analyzing"` even before the repository reload completes.

### 3. Persistence Layer
`src/features/ai/analyze-bookmark.ts` remains the persisted source of truth and continues to write:
- `analyzing` before provider execution
- `done` on success
- `error` on failure

No schema or repository interface changes are required.

## Data Flow

### Single Bookmark Analyze
1. User clicks `Analyze`.
2. Container validates provider settings.
3. Container resolves the bookmark record.
4. Container adds the bookmark to the local analyzing set.
5. UI re-renders immediately with inline spinner feedback.
6. Container calls `analyzeBookmark(...)`.
7. `analyzeBookmark(...)` persists `status: "analyzing"`, then `done` or `error`.
8. Container removes the optimistic analyzing marker.
9. Container reloads bookmarks so the final persisted state is shown.

## Error Handling
- Missing API key: preserve current behavior and do not enter loading state.
- Missing bookmark record: return early and do not enter loading state.
- Analysis success: loading feedback disappears after reload, final status becomes `done`.
- Analysis failure: loading feedback disappears after reload, final status becomes `error`.
- Repeated clicks: prevented naturally because `Analyze` is not rendered while the bookmark is locally marked as analyzing.

## UX Details
- Feedback is scoped to the clicked bookmark only.
- Other bookmarks remain interactive.
- No full-card overlay or page-level blocking state is introduced.
- The loading treatment should feel lightweight and immediate, not dramatic.

## Alternatives Considered

### A. Optimistic local analyzing state (recommended)
Best balance of responsiveness, low implementation cost, and minimal architectural change.

### B. Faster persisted-state refresh only
Lower conceptual complexity, but still leaves a noticeable delay before the first visual response.

### C. Route single-item analysis through background progress messages
Most extensible long term, but heavier than needed for the current UX problem.

## Testing Strategy

### Component Tests
Update `tests/ui/bookmark-card.test.tsx` to cover:
- clearer loading indicator for `status: "analyzing"`
- no `Analyze` button while analyzing
- compact card feedback parity

### Container Behavior Tests
Add or extend UI tests for affected entry points to verify:
- clicking single-bookmark `Analyze` immediately shows loading state before the analysis promise resolves
- loading state is removed after completion
- failure path ends in error state after reload

## Implementation Notes
- Keep the solution local and explicit; avoid introducing shared abstractions unless duplication becomes clearly harmful.
- Prefer minimal state additions such as `Set<string>` per container.
- Reuse existing visual tokens and inline styles where possible.
