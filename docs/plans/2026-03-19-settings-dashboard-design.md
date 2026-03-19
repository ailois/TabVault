# Settings Dashboard Redesign Design

Date: 2026-03-19

## Summary

Redesign the options/settings page into a wider dashboard-style workspace. The page should adopt the visual structure of `ui/dashboard.html`, follow the semantic color guidance in `ui/颜色指导.md`, and fix the current narrow layout that hurts usability.

The approved direction is:
- Use a unified dashboard shell for the whole options page
- Use a left sidebar for primary navigation
- Keep two top-level views: `Settings` and `Bookmarks`
- Make `Settings` a two-column dashboard
- Keep `Bookmarks` as a three-column dashboard, but visually align it with the new shell
- Use semantic theme tokens instead of scattering hard-coded light/dark colors

## Goals

1. Replace the current centered narrow layout with a near-full-width dashboard shell
2. Make the `Bookmarks` section visually match the style of `ui/dashboard.html`
3. Improve the `Settings` view so it feels roomy, structured, and easier to scan
4. Keep existing data flow and business logic stable while upgrading the presentation layer
5. Align colors and states with the semantic token guidance in `ui/颜色指导.md`

## Non-Goals

1. Do not change repositories, provider APIs, or bookmark storage behavior
2. Do not redesign the underlying save/test/analyze flows
3. Do not merge settings and bookmarks into a single combined page
4. Do not introduce a second independent theming system

## Current Constraints

- The current options shell is constrained to `maxWidth: 640px`, which makes the settings page feel too narrow
- `Bookmarks` already has a strong three-column structure and should be preserved as the base interaction model
- The app already has a token-based theme system in `src/ui/design-tokens.ts`
- Tests already assert options shell structure and the bookmarks dashboard layout

## Approved Information Architecture

### Global shell

The options page will use a shared dashboard shell:
- **Left sidebar**: branding, theme toggle, primary navigation
- **Right content area**: renders either `Settings` or `Bookmarks`

This replaces the current centered header-with-tabs model.

### Sidebar

The sidebar should visually mirror the reference dashboard pattern:
- Brand/header area at the top
- Theme toggle integrated into the sidebar header area
- Primary navigation items for:
  - `Settings`
  - `Bookmarks`
- Active item uses semantic accent styling
- Hover, active, border, and surface styling use theme tokens

### Settings view

The approved settings layout is a **two-column dashboard**:

#### Left column
- `App Settings` card
  - Default provider
  - Summary language
  - Auto analyze on save
  - Auto retry failed analysis
- `Maintenance` card
  - Clear all analysis
  - Clear failed analysis

#### Right column
- Provider switcher presented as a visible provider rail/cards/pills rather than only a select input
- Current provider editor panel underneath
- The provider editor continues to reuse the existing `ProviderSettingsForm` logic
- The active provider state should be clearer and more dashboard-like

#### Save area
- Keep a sticky save action area
- Restyle it to feel like a dashboard action bar in the content area
- Keep existing save-state messaging behavior

### Bookmarks view

The approved bookmarks layout remains a **three-column dashboard**:
- Left: folder tree
- Middle: bookmark list
- Right: bookmark detail panel

The interaction model remains the same, but the visuals should be unified with the new shell:
- Folder tree styled more like the reference sidebar/list system
- Bookmark list cards aligned with the reference selected/hover states
- Detail panel aligned with the dashboard surface, border, and spacing language
- Summary and tag sections visually refined to match the reference tone

## Layout Decisions

### Width strategy

The page should no longer use a narrow centered container. The new layout should be near full width:
- Fixed-width sidebar on the left
- Flexible main content area on the right
- Comfortable padding, but no restrictive `640px` shell
- The layout should feel like a workspace, not a modal-sized settings form

### Responsiveness

The primary target is a desktop extension options page. The layout should still degrade safely for smaller widths:
- Main content must use `minmax(0, 1fr)` patterns where needed
- Columns may stack or compress only when necessary
- Avoid overflow caused by rigid nested widths

## Visual System Decisions

The redesign should follow the semantic token approach from `ui/颜色指导.md`.

### Token mapping

- `page` → background/base layer (`bg-background` role)
- `surface` → cards, panels, sidebar surfaces (`bg-card` role)
- `surfaceElevated` / `surfaceSubtle` → inputs, muted panels, hover contexts (`bg-muted` role)
- `textPrimary` → titles and main text (`text-primary` role)
- `textMuted` → descriptions, metadata, URLs (`text-muted` role)
- `border` / `borderMuted` → structural separation (`border` role)
- `accent` / `accentSoft` → active navigation, active bookmark state, provider selection (`brand` role)

### Color implementation rule

Do not add more scattered hard-coded light/dark values across the options page unless there is no existing token that fits. Prefer consuming the existing theme tokens and, if needed, extending the token set in one place.

### Visual tone

- Zinc-based neutrals for structure and readability
- Indigo-based accent for active and branded emphasis
- Stronger visual hierarchy through surface contrast, borders, spacing, and type weight
- Avoid over-decorating; the design should feel like a clean SaaS dashboard, not a marketing page

## Interaction Decisions

### Navigation
- `activeTab` remains the top-level state for switching content
- The switch moves from a centered header tab control to sidebar navigation items

### Theme toggle
- Keep current theme behavior and persistence
- Move the visible control into the sidebar header/brand area

### Provider switching
- Replace the current provider editor selector emphasis with a more direct visual selector
- Keep the current single-provider editing model
- Do not show all provider forms at once

### Bookmarks interactions
- Keep current search, filter, folder selection, bookmark selection, detail view, retry, analyze, and tag-editing flows
- Only refine presentation and layout

## Error and State Handling

Keep the current state model and reuse current messages where possible:
- Settings load/save states remain unchanged in logic
- Bookmarks load/error states remain unchanged in logic
- Error messages should become more readable in the new layout, but not fundamentally change behavior

## Testing Strategy

Update UI tests to reflect the new structure while keeping them focused on meaningful behavior.

### Update
- `tests/ui/options.test.tsx`
  - Replace assumptions about the centered header/tab shell
  - Assert presence of the dashboard shell, sidebar navigation, and wider settings structure
- `tests/ui/options-bookmarks-dashboard.test.tsx`
  - Keep three-column bookmarks assertions
  - Add assertions for the shared dashboard shell and navigation path if needed

### Preserve
- Existing dependency injection pattern for `Options`
- Current tests for settings validation and data logic

### Avoid
- Fragile tests for cosmetic-only details like exact shadows or nonessential pixel values

## Implementation Notes

Likely implementation areas:
- `src/options.tsx`
- `src/components/provider-settings-form.tsx`
- `src/ui/design-tokens.ts` (only if token refinement is needed)
- `tests/ui/options.test.tsx`
- `tests/ui/options-bookmarks-dashboard.test.tsx`

## Risks

1. UI restructuring may accidentally break existing tests that rely on current shell structure
2. Hard-coded colors left behind in nested areas may weaken theme consistency
3. Wider layouts can introduce overflow bugs if columns are not constrained with proper flex/grid sizing

## Mitigations

1. Keep data/state logic intact and isolate most changes to layout and presentation
2. Consolidate color decisions through theme tokens first
3. Reuse the existing bookmarks dashboard logic and only refine surfaces and spacing
4. Update tests around user-visible structure instead of low-level implementation details

## Final Approved Direction

Build a unified options dashboard with:
- left sidebar navigation
- near-full-width layout
- two-column `Settings` workspace
- three-column `Bookmarks` workspace
- semantic zinc + indigo token-driven styling
- preserved data flow and behavior
