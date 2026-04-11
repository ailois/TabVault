# Dashboard Details Restoration Design

## Background

The dashboard bookmark detail experience regressed after the reading pane was split into `notes` and `ai` tabs. The current implementation defaults to the `notes` tab, while summary and tags editing were moved into the AI sidebar. As a result, clicking a bookmark no longer shows a complete detail view by default, and core detail editing appears missing unless the user manually switches to the AI tab.

Relevant current files:
- `src/features/dashboard/dashboard-reading-pane.tsx`
- `src/features/dashboard/dashboard-ai-sidebar.tsx`
- `src/features/dashboard/dashboard-shell.tsx`
- `tests/ui/dashboard-shell.test.tsx`
- `tests/ui/dashboard-persistence.test.tsx`
- `tests/ui/dashboard-editing.test.tsx`

## Problem Statement

When a user clicks a bookmark in the dashboard, the resulting detail area should feel like a normal bookmark detail view. Today it does not:
- the default tab is `notes`, not a complete detail view,
- summary and tags are not immediately visible,
- summary and tags editing are hidden inside the AI tab,
- the UI feels broken because important detail information appears to be gone.

## Goals

1. Restore a normal bookmark detail experience after clicking a dashboard result.
2. Make summary, tags, and notes visible from the default detail view.
3. Keep the AI workspace available as a separate tab.
4. Reuse existing persistence callbacks and avoid unnecessary architectural changes.

## Non-Goals

- No changes to bookmark storage shape or persistence model.
- No changes to Ghostreader retrieval or answer-generation behavior.
- No changes to bulk edit business logic.
- No redesign of dashboard navigation, filters, or folder tree behavior.

## Confirmed Product Decisions

Confirmed with the user:
- Clicking a bookmark should restore the old feeling of a complete detail view.
- The AI workspace should remain a separate tab.
- The default bookmark detail surface should show primary detail content first, with AI as an additional workspace.

## Approaches Considered

### Approach A — Keep the existing tabs but default to AI

Change the default tab from `notes` to `ai` so the user immediately sees summary and tags.

**Pros**
- Smallest implementation delta.
- Quickly avoids the “empty-looking detail view” problem.

**Cons**
- Does not restore a true bookmark detail view.
- Makes AI the default surface instead of details.
- Keeps summary and tags conceptually misplaced.

### Approach B — Keep tabs, but make the default tab a full detail surface

Replace the current `notes` tab with a `details` tab that contains tags, summary, and notes. Keep AI in a separate `ai` tab.

**Pros**
- Matches the user’s desired interaction model.
- Preserves the existing two-tab structure.
- Keeps responsibilities clear: details vs. AI.
- Allows reuse of existing editable summary/tags components and save callbacks.

**Cons**
- Requires moderate test updates.
- Slightly larger change than simply switching the default tab.

### Approach C — Remove tabs and place AI below details

Show summary, tags, notes, and AI in a single continuous surface.

**Pros**
- Everything is visible in one place.
- Eliminates tab switching.

**Cons**
- Larger UI restructuring.
- Conflates bookmark details with AI interaction.
- More likely to cause side effects outside the bug scope.

## Recommendation

Use **Approach B**.

This is the smallest change that fully restores the intended dashboard detail experience. It preserves the two-surface model while correcting the information architecture: details become the default view again, and AI remains available without being responsible for core bookmark details.

## Proposed Design

### Reading Pane Structure

`DashboardReadingPane` will use two tabs:
- `details`
- `ai`

The default tab will be `details`.

### Details Tab Content

The `details` tab will show, in order:
1. bookmark title and top actions,
2. tags editor,
3. summary editor,
4. notes editor.

This restores the expected bookmark detail workflow: open a bookmark, inspect its details, and edit core metadata directly.

### AI Tab Content

The `ai` tab will contain only the AI workspace:
- dashboard Ghostreader ask box,
- related AI interaction UI already provided by `DashboardAiSidebar`.

Summary and tags editing will no longer appear inside the AI tab.

## Component Changes

### `src/features/dashboard/dashboard-reading-pane.tsx`

Change the reading pane state from:
- `"notes" | "ai"`

to:
- `"details" | "ai"`

Change the default tab from `notes` to `details`.

Move the following components into the default details tab:
- `EditableTagsCard`
- `EditableSummaryCard`

Keep the existing notes editor in the same tab.

### `src/features/dashboard/dashboard-ai-sidebar.tsx`

Narrow this component’s responsibility to AI-only UI.

Remove:
- `EditableTagsCard`
- `EditableSummaryCard`

Keep:
- `DashboardAskBox`

### `src/features/dashboard/dashboard-shell.tsx`

No architectural changes are required.

Continue reusing the existing callbacks:
- `handleSaveSummary`
- `handleSaveTags`
- `handleSaveNotes`

These callbacks already persist updated bookmark metadata and refresh the active bookmark state, so only rendering location changes are needed.

## State and Data Flow

The data flow remains unchanged:
- `DashboardShell` owns `activeBookmark`.
- `DashboardShell` passes save callbacks into `DashboardReadingPane`.
- `DashboardReadingPane` invokes those callbacks through the editable cards and notes editor.
- The persisted bookmark is written through `updateBookmark` or the repository.
- The shell refreshes in-memory bookmark state and active bookmark state.

This keeps the bug fix low risk because only view composition changes.

## Testing Strategy

Update and/or add focused UI tests for the restored default detail flow.

### Primary verification

1. Clicking a bookmark opens the reading pane on the `details` tab by default.
2. Summary editing works without switching to the AI tab.
3. Tags editing works without switching to the AI tab.
4. Notes editing still works in the default details view.
5. Switching to the AI tab still exposes the ask workflow.
6. Bulk edit behavior remains unchanged when multiple bookmarks are selected.

### Test files to update

- `tests/ui/dashboard-shell.test.tsx`
- `tests/ui/dashboard-persistence.test.tsx`
- `tests/ui/dashboard-editing.test.tsx`

## Acceptance Criteria

The fix is complete when all of the following are true:
- Clicking a bookmark shows a complete detail view by default.
- Tags, summary, and notes are all visible from the default detail view.
- Tags and summary are editable from the default detail view.
- The AI tab remains available and still supports dashboard Ghostreader interactions.
- Existing bulk edit behavior is unaffected.
- Dashboard UI tests covering these behaviors pass.

## Change Boundaries

This design intentionally limits scope to the dashboard detail information architecture. It does not introduce new features or broader UI refactors.
