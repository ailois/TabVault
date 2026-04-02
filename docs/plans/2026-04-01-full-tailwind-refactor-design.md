# TabVault Full Tailwind Refactor Design

## Overview

This document defines the agreed redesign and refactor direction for TabVault as of 2026-04-01.

The user confirmed that the project should be **fully refactored around the `design/` HTML prototypes**, with **design priority over the current React implementation**, and with the **entire CSS management approach migrated from custom TypeScript tokens + CSS-in-JS to TailwindCSS + semantic CSS variables + `data-theme` switching**.

This is a front-end rebuild of the product surface, not a rewrite of the underlying capability layer.

## Canonical References

The refactor should treat the following files as canonical UI references:

- `design/popup-sync.html`
- `design/popup-unsync.html`
- `design/sidepanel.html`
- `design/settings.html`
- `design/setting-knowledge.html`
- `design/dashboard.html`
- `design/dashboard-bulk-edit.html`
- `design/TabVault UI 架构与交互说明文档.md`
- `design/Tailwind主题系统开发规范.md`

When the current implementation conflicts with those references, the refactor should follow the design references.

## Goals

1. Make the real product visually and structurally match the HTML prototypes as closely as practical.
2. Land all design states from `design/` as real React views or mode-based stateful views.
3. Replace the current styling architecture with a standard TailwindCSS-based system.
4. Eliminate the old theme token injection model from the UI layer.
5. Keep the business and persistence layer intact where possible: repositories, storage, providers, extraction, retrieval, and extension messaging.

## Explicitly Agreed Product Scope

The user selected the following constraints during brainstorming:

- **Use design priority over current implementation**.
- **Implement all design HTML states**, not only currently wired extension pages.
- **Allow major reorganization of the front-end layer** as long as core business capability remains reusable.

This means the work is not a skin-deep visual pass. It is a structural front-end refactor.

## Styling and Theme Architecture

## TailwindCSS adoption

The UI layer should be rebuilt on:

- TailwindCSS
- global CSS variables
- semantic Tailwind color tokens
- root-level `data-theme` switching

A shared global stylesheet should be introduced, e.g. `src/styles/globals.css`.

A Tailwind config should be added and used as the canonical style bridge from CSS variables to utility classes.

## Semantic color system

The agreed semantic color set comes from `design/Tailwind主题系统开发规范.md` and should be used consistently across the UI:

- `bg-base`
- `bg-surface`
- `text-primary`
- `text-secondary`
- `border-subtle`
- `accent-primary`
- `accent-hover`
- `accent-muted`

Small practical extensions are allowed where needed for real UI states, for example:

- `danger`
- `danger-muted`
- `success`
- `success-muted`

Concrete hex colors should not be hardcoded directly in JSX for theme-driven UI.

## Supported themes

The refactor should implement the six themes defined in the theme spec:

- `cloud`
- `obsidian`
- `sage`
- `breeze`
- `taro`
- `vanilla`

Default theme: `sage`.

## Theme switching model

Theme changes should be applied by setting a root attribute such as:

```html
<html data-theme="sage">
```

The new theme layer should:

- read persisted theme settings
- set `document.documentElement.dataset.theme`
- avoid dynamic `<style>` tag injection
- avoid using React theme objects to pass colors component-by-component

## Legacy styling system to retire

The following old UI theme/styling system should be removed from active use by the end of the refactor:

- `src/ui/design-tokens.ts`
- `src/ui/theme-context.tsx`
- `src/ui/use-global-styles.ts`

`src/ui/use-theme.ts` may be retained only if simplified to persistence + `data-theme` synchronization.

## Product Surface Mapping

The refactor should preserve the existing real extension entry points, while mapping all design files into real page states.

## Popup

Entry point remains:

- `src/popup.tsx`

Design states to implement:

- `design/popup-unsync.html`
- `design/popup-sync.html`

Recommended React mapping:

- `PopupUnsyncedView`
- `PopupSyncedView`

These should be conditional states within one popup entry, based on whether the current page already exists in storage.

## Settings

Entry point remains:

- `src/options.tsx`

Design states to implement:

- `design/settings.html`
- `design/setting-knowledge.html`

Recommended React mapping:

- `SettingsProviderPanel`
- `SettingsKnowledgePanel`

These should be rendered inside one settings shell with left-side navigation.

## Sidepanel

Entry point remains:

- `src/sidepanel.tsx`

Design state to implement:

- `design/sidepanel.html`

This should become the canonical sidepanel UI surface.

## Dashboard

Entry point remains:

- `src/tabs/dashboard.tsx`

Design states to implement:

- `design/dashboard.html`
- `design/dashboard-bulk-edit.html`

Recommended React mapping:

- `DashboardBrowseView`
- `DashboardBulkEditView`

These should be state-driven modes of the same dashboard product surface.

## Recommended Front-End Structure

A reorganized structure should separate page orchestration, feature composition, and reusable UI primitives.

Suggested direction:

```text
src/
  styles/
    globals.css
  ui/
    providers/
      theme-provider.tsx
    utils/
      cn.ts
  components/
    ui/
      button.tsx
      input.tsx
      textarea.tsx
      select.tsx
      badge.tsx
      card.tsx
      switch.tsx
      radio-card.tsx
      page-shell.tsx
      section-title.tsx
    brand/
      app-logo.tsx
    layout/
      sidebar-nav.tsx
      split-pane.tsx
  features/
    popup/
      popup-root.tsx
      popup-synced-view.tsx
      popup-unsynced-view.tsx
    settings/
      settings-root.tsx
      settings-provider-panel.tsx
      settings-knowledge-panel.tsx
      theme-picker.tsx
    sidepanel/
      sidepanel-root.tsx
    dashboard/
      dashboard-root.tsx
      dashboard-browse-view.tsx
      dashboard-bulk-edit-view.tsx
      dashboard-sidebar.tsx
      dashboard-results-pane.tsx
      dashboard-reading-pane.tsx
```

The exact filenames may vary, but the separation principles should hold.

## UI Component Rules

## Shared UI primitives

The design files repeat many UI patterns that should become reusable primitives, including:

- buttons
- icon buttons
- inputs
- textareas
- selects
- badges
- cards
- switches
- radio-card selectors
- status pills
- section headers

These primitives should encapsulate base layout and Tailwind variants, but not business logic.

## Feature-level components

Feature components should compose business behavior using those primitives, such as:

- provider settings form
- theme picker
- bookmark result card
- reading notes editor
- bulk edit workspace
- sidepanel thread blocks

## View-state mapping rules

The design files represent several UI states that should be mapped as stateful modes rather than separate app-level routes.

Examples:

- popup synced/unsynced = one popup, conditional state
- dashboard browse/bulk edit = one dashboard, conditional mode
- settings architecture/knowledge = one settings page, navigation-selected panel
- theme switching = one global setting reflected via `data-theme`

## Data Flow Principles

The refactor should preserve the existing capability layer wherever practical.

These subsystems should be reused instead of rebuilt unless a specific integration issue requires change:

- settings repository
- theme repository
- bookmark repository
- storage / IndexedDB layer
- provider factory and provider implementations
- page extraction
- hybrid retrieval logic
- background/runtime messaging
- trial and license services

The front-end should move toward a clearer layering model:

- repository/service layer = data and actions
- feature layer = page orchestration and view state
- UI layer = rendering and visual variants

The UI layer should no longer own theme token mechanics.

## Recommended Migration Order

To minimize risk while still achieving a full rebuild, the refactor should proceed in this order:

1. Add TailwindCSS and global theme variable system.
2. Build shared UI primitives.
3. Rebuild Settings.
4. Rebuild Popup synced + unsynced states.
5. Rebuild Sidepanel.
6. Rebuild Dashboard browse + bulk-edit modes.
7. Remove the old styling/theme system and stale UI components.
8. Run full verification.

## Why this order

- Settings is the best first host for shared form and theme primitives.
- Popup is small and ideal for validating visual parity quickly.
- Sidepanel validates compact assistant layout patterns.
- Dashboard is the largest and should come last to maximize reuse.

## Risk Management

## Risk: visual parity but feature regression

Control:
- keep business repositories and services in place
- change UI layer first
- avoid mixing business rewrites into page restyling tasks

## Risk: mixed styling systems

Control:
- establish one global Tailwind + CSS variable pipeline
- stop adding new inline theme styles
- remove old theme-based styling after each page migration stabilizes

## Risk: static design prototypes do not cover all product states

Control:
- follow design files for canonical shape
- add only minimal extra states required by real data and edge cases
- keep those extensions inside the same visual system

## Risk: long-lived dual systems

Control:
- after each page is migrated, prefer replacing old components rather than maintaining parallel design systems

## Verification Requirements

The refactor should not be considered complete unless the following are verified:

- typecheck passes
- build passes
- popup loads and shows synced + unsynced states correctly
- settings loads and shows both architecture + knowledge panels correctly
- sidepanel loads correctly
- dashboard loads and shows both browse + bulk-edit modes correctly
- all six themes switch correctly using `data-theme`

Recommended additional verification:

- smoke tests for root `data-theme`
- smoke tests for key page states
- smoke tests for mode switching without crashes

## Execution Principles

- Follow the design files as the canonical product surface.
- Prefer a clean UI-layer rebuild over incremental styling patchwork.
- Do not preserve the old token/CSS-in-JS system for compatibility once the new system is in place.
- Reuse capability modules rather than rewriting business logic unnecessarily.
- Keep the implementation disciplined: no hardcoded theme hex values in JSX for theme-driven UI.

## Relationship to Earlier Plans

Earlier work already moved part of the product toward a clearer split between settings and dashboard, and settings design alignment/global display language switching was completed in a separate worktree.

This new refactor supersedes those narrower efforts at the top-level UI architecture layer by defining a full Tailwind-based rebuild aligned to all current design references.
