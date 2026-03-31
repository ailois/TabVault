# Settings / Dashboard Separation Design

Date: 2026-03-31

## Summary

Refactor the current settings surface so it becomes a pure configuration center aligned to `design/settings.html`, and move all bookmark workspace responsibilities out of settings into the standalone dashboard. The standalone dashboard becomes the only place for bookmark browsing, search, reading, analysis, and metadata editing, while its UI is upgraded toward `design/dashboard.html`.

This approved direction supersedes the earlier combined settings/bookmarks direction from `docs/plans/2026-03-19-settings-dashboard-design.md`.

## Approved Direction

- Keep `settings` as a configuration-focused page
- Remove the `Bookmarks` tab from the settings page completely
- Move the existing settings `Bookmarks` tab capabilities into the standalone dashboard page
- Redesign the settings page UI to match the structure and visual language of `design/settings.html`
- Redesign the standalone dashboard UI to move closer to `design/dashboard.html`
- Keep global maintenance actions in settings rather than mixing them into the dashboard workflow
- Allow dashboard information architecture to be reorganized as long as it fully covers the old bookmarks capabilities

## Goals

1. Make the settings page a dedicated configuration surface with no bookmark workspace mixed in
2. Make the dashboard the single source of truth for bookmark management workflows
3. Align settings and dashboard with their respective design references
4. Reuse existing data flow and bookmark logic where possible rather than rewriting behavior from scratch
5. Preserve current bookmark capabilities while improving page responsibility boundaries

## Non-Goals

1. Do not change bookmark storage architecture or provider repository contracts unless required for relocation
2. Do not introduce a second dashboard-like bookmark workspace inside settings
3. Do not add new product features outside the approved migration and visual redesign
4. Do not replace existing theme infrastructure with an unrelated styling system

## Information Architecture

### Settings page responsibility

The settings page becomes a pure configuration center. It should adopt the top-level structure and visual tone of `design/settings.html`, but only for settings-related concerns.

It should contain areas such as:
- provider / protocol configuration
- retrieval architecture configuration
- experience / behavior toggles
- license / trial state
- global maintenance actions

It should no longer contain:
- bookmark folder tree
- bookmark browsing list
- bookmark detail workspace
- bookmark search results workspace
- bookmark analysis operations tied to individual records

### Dashboard page responsibility

The standalone dashboard becomes the only bookmark workspace in the product. It should absorb the old settings `Bookmarks` tab behavior and also visually move toward `design/dashboard.html`.

The dashboard becomes responsible for:
- folder navigation
- bookmark search
- bookmark list browsing
- bookmark detail and content viewing
- single-bookmark analysis actions
- summary editing
- tag editing
- ask / AI interactions for the active bookmark

### Global navigation model

After this change:
- `settings` means system configuration
- `dashboard` means bookmark workspace

The old dual-purpose options shell is removed.

## Settings Page Design

### Visual direction

Use `design/settings.html` as the reference for:
- overall page framing
- section headers
- top tab/card styling language
- spacing rhythm
- card shapes and borders
- accent usage
- light/dark visual hierarchy

Implementation should continue to use the current token/theme system instead of introducing raw duplicated colors throughout the React code.

### Content structure

The settings page should be reorganized into a configuration dashboard structure. Exact grouping can follow existing logic, but the responsibilities should map to the design reference.

Recommended groupings:
- Agent / Provider configuration
- Retrieval architecture configuration
- Experience settings
- License / Trial
- Maintenance

### Removal of Bookmarks tab

The current `OptionsTab = "settings" | "bookmarks"` split should be removed. Settings becomes the only view in `src/options.tsx`.

Any settings navigation that still references bookmarks should be deleted rather than replaced with a placeholder.

## Dashboard Design

### Visual direction

Use `design/dashboard.html` as the reference for:
- three-column workspace structure
- left navigation styling
- search/header area composition
- reading pane surface treatment
- right-side AI card hierarchy
- spacing, contrast, and accent usage

The implementation does not need pixel-perfect parity, but the dashboard should clearly move toward the reference layout and tone.

### Functional absorption of old Bookmarks tab

#### Left column

The left column absorbs the old folder tree responsibility.

It should:
- display bookmark folders / folder hierarchy
- determine the current browsing scope
- use the new dashboard visual style
- optionally preserve high-level grouping language if useful, but the actual browsing model should still be based on real bookmark folders

#### Top search

The dashboard search area absorbs the old bookmarks search behavior.

It should:
- search across the current workspace or allowed scope
- reuse current matching behavior for title, URL, folder title, summary, AI tags, and user tags
- switch the main result set from folder browsing mode to search mode when a query is active

#### Middle area

The middle area absorbs the bookmark list responsibility.

It should support:
- folder browsing mode
- search result mode
- bookmark rows/cards with title, URL/domain, status, and metadata preview
- active selection synchronized with the reading/detail area

#### Reading pane

The reading pane becomes the main detail/content view for the selected bookmark.

It should absorb the core informational responsibility previously held by the old bookmark detail column, including:
- title
- source URL/domain
- extracted or stored content
- empty states when content is unavailable

#### Right sidebar

The right sidebar remains the action-oriented AI panel, but it must expand to absorb the old bookmark detail actions.

It should handle:
- analyze
- retry analysis if already supported
- summary editing
- tag editing
- ask-current-document interactions
- other single-bookmark metadata actions that belong to the active record

### Maintenance boundary

Global destructive or maintenance-style actions such as clearing all analysis or clearing failed analysis should remain in settings. They should not be pulled into the dashboard’s primary bookmark workflow.

## Component and Code Structure

### Settings-side restructuring

`src/options.tsx` should be simplified so it becomes a settings-only page shell.

Expected changes:
- remove the top-level `Bookmarks` navigation state
- remove bookmarks page rendering from options
- keep settings load/save/license/provider logic in place
- recompose the UI to match the new settings reference

### Dashboard-side expansion

`src/features/dashboard/dashboard-shell.tsx` should become the state root of the bookmark workspace.

It should absorb bookmark workspace state that currently lives in `src/options.tsx`, including:
- bookmark folder tree loading
- current folder selection
- search query
- filter state if preserved
- current result set derivation
- active bookmark synchronization
- optimistic updates after analysis or metadata edits

### Reuse strategy

Prefer moving or extracting existing bookmark workspace logic rather than rewriting it.

Candidate logic to relocate out of `src/options.tsx`:
- `collectBookmarksWithFolderContext`
- `findDefaultFolderId`
- `findFolderTitle`
- `matchesFilterMode`
- `matchesSearch`

These belong to the bookmark workspace domain and should live near the dashboard or a bookmark workspace module instead of the settings page.

### Existing dashboard component reuse

Continue reusing the current dashboard components where practical:
- `DashboardNavigation`
- `DashboardReadingPane`
- `DashboardAiSidebar`

But their responsibilities should expand:
- `DashboardNavigation` absorbs folder-tree navigation concerns
- `DashboardReadingPane` becomes the primary detail/content surface
- `DashboardAiSidebar` absorbs summary, tags, analysis, and single-record actions

## Data Flow

Recommended top-level ownership:
- `DashboardShell` loads bookmark metadata records and browser bookmark tree data
- it derives folder-scoped results and search results
- it owns the active bookmark and synchronization across columns
- child components receive focused data and callbacks

This avoids keeping bookmark workspace behavior inside the settings page.

## Error Handling

### Settings

Keep current logic and messages for:
- loading settings failure
- saving settings failure
- provider connection test failure

Only the presentation should change.

### Dashboard

Handle these states explicitly in their local UI regions:
- bookmark tree load failure
- bookmark repository list/update/delete failures
- analysis failure
- empty folder state
- empty search state
- selected bookmark with no extracted content

Do not introduce a new global notification system unless the existing code already requires it.

## Testing Strategy

### Settings tests

Update settings tests so they assert:
- settings renders as a settings-only page
- bookmarks navigation is removed
- existing provider/retrieval/license behavior still works

### Dashboard tests

Migrate old options-bookmarks behavior coverage into dashboard-focused tests.

Key areas:
- folder tree navigation updates the result set
- search switches the middle area to search results
- active bookmark selection synchronizes the reading pane and right sidebar
- analyze actions update visible state immediately where currently expected
- empty and error states render correctly

### Structure changes

Tests that currently target settings bookmarks behavior should be renamed or re-scoped to dashboard behavior.

## Implementation Phases

1. Remove bookmark workspace responsibility from `src/options.tsx` and restyle settings to match `design/settings.html`
2. Extract or relocate bookmark workspace logic out of settings
3. Expand `DashboardShell` and related dashboard components to absorb the old bookmarks tab behavior
4. Restyle the standalone dashboard toward `design/dashboard.html`
5. Update and migrate tests from options-bookmarks semantics to dashboard semantics

## Risks

1. Bookmark behavior may regress during relocation from settings to dashboard
2. Tests that encode old options-page structure will fail and need deliberate migration
3. Visual parity work may accidentally mix old settings layout assumptions into the new dashboard structure

## Mitigations

1. Reuse existing bookmark filtering/search/detail logic rather than changing logic and layout at the same time
2. Separate settings cleanup from dashboard feature absorption in the implementation steps
3. Keep tests focused on user-visible behavior and responsibility boundaries rather than incidental DOM structure

## Final Approved Outcome

Build a product split where:
- `settings` is a design-reference-aligned configuration center
- `dashboard` is the only bookmark workspace
- the old settings `Bookmarks` tab is removed entirely
- old bookmarks tab capabilities are absorbed into the standalone dashboard
- dashboard visuals move toward `design/dashboard.html`
- maintenance actions remain in settings
