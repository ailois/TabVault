# Dashboard Multi-Select Details Design

## Background

The dashboard previously switched the right-hand pane into `DashboardBulkEditPanel` when multiple bookmarks were batch-selected. A recent fix already corrected the single-select regression, but the user confirmed that the desired product behavior is now broader: even during multi-select, the right side should continue to show the current bookmark details instead of replacing the details surface.

Relevant files:
- `src/features/dashboard/dashboard-shell.tsx`
- `src/features/dashboard/dashboard-reading-pane.tsx`
- `tests/ui/dashboard-shell.test.tsx`
- `tests/ui/dashboard-persistence.test.tsx`

## Problem Statement

The current multi-select behavior intentionally swaps the right-hand details area for the bulk edit panel. That causes the dashboard to feel unstable because selecting more than one checkbox replaces the detail context entirely.

The user wants multi-select to preserve the normal details-reading experience.

## Confirmed Product Decision

Confirmed with the user on 2026-04-12:
- Multi-select should keep the right-hand details pane visible.
- The dashboard should no longer switch the right side into bulk edit mode when multiple bookmarks are selected.

## Goals

1. Keep `DashboardReadingPane` visible regardless of how many bookmarks are batch-selected.
2. Preserve checkbox selection state, selected-count UI, and other multi-select state already shown in the results column.
3. Avoid adding new UI or workflow changes beyond this behavior correction.

## Non-Goals

- No redesign of the reading pane.
- No new bulk action banner or replacement multi-edit workflow.
- No changes to bookmark persistence shape.
- No changes to Ghostreader or AI workspace behavior.

## Approaches Considered

### Approach A — Always keep the reading pane visible

Stop conditionally rendering `DashboardBulkEditPanel` and always render `DashboardReadingPane` on the right.

**Pros**
- Smallest code change.
- Matches the confirmed user expectation exactly.
- Removes the source of the right-pane mode switch.

**Cons**
- Existing bulk-edit-specific right-pane workflow goes away.
- Tests that assert entry into bulk edit mode must be updated or removed.

### Approach B — Keep the reading pane visible and add a small bulk-edit banner

Preserve the details pane and add an inline banner or controls for multi-select.

**Pros**
- Preserves details visibility.
- Keeps room for future bulk-edit affordances.

**Cons**
- Introduces new UI that the user did not ask for.
- Larger surface area and more testing than needed.

### Approach C — Keep bulk edit, but only behind an explicit user action

Do not auto-switch on multi-select; instead require a dedicated “Bulk edit” action to open the panel.

**Pros**
- More deliberate than auto-switching.
- Retains bulk-edit workflow for future use.

**Cons**
- Adds interaction design work outside this bug scope.
- Requires extra UI and state transitions.

## Recommendation

Use **Approach A**.

This is the minimum behavior change that satisfies the confirmed requirement. It removes the auto-switching right-pane behavior without introducing replacement UI or broader workflow redesign.

## Proposed Design

### Shell behavior

`DashboardShell` should always render `DashboardReadingPane` in the right column.

`selectedBookmarkIds` should continue to control:
- checkbox selection state,
- selected-count messaging,
- multi-select actions that already live in the results column.

It should no longer control which right-side panel is rendered.

### Active bookmark behavior

The right pane should continue to depend on `activeBookmark` only. Multi-select should not clear or replace the active bookmark.

### Bulk edit behavior

`DashboardBulkEditPanel` is no longer part of the active dashboard path for this behavior. If it becomes unused after the change, the follow-up implementation may remove the dead render path and any dead handler that only supported that path.

## Testing Strategy

### Update existing shell coverage

Replace the current multi-select bulk-edit expectation with a regression test that verifies:
- selecting multiple bookmarks keeps `dashboard-reading-pane` visible,
- `dashboard-bulk-edit-view` does not render,
- the active bookmark details remain visible.

### Update persistence coverage

The old persistence test that exercises bulk edit from the right pane no longer matches the desired product behavior. Replace or remove that expectation so test coverage reflects the confirmed UX.

### Verification

Run the narrow dashboard UI tests first, then the related dashboard persistence/editing tests, and finally typecheck.

## Acceptance Criteria

The change is complete when all of the following are true:
- Selecting multiple dashboard checkboxes does not replace the right-hand details pane.
- The currently active bookmark detail view remains visible during multi-select.
- Selected-count and list-column multi-select state still work.
- Relevant dashboard tests and typecheck pass.
