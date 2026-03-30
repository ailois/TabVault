# TabVault Design-Parity Refactor Design

## Overview

This document defines the target design for refactoring TabVault so the real product more closely matches the experience represented in `design/popup.html`, `design/sidepanel.html`, `design/settings.html`, and `design/dashboard.html`.

The agreed direction is **structural and visual alignment with the design prototypes while reusing as much of the current working capability layer as possible**. This is not a pure reskin and not a ground-up rewrite. It is a staged product-shape refactor.

## Goals

1. Align the product UI and information architecture with the `design/` prototypes.
2. Preserve and reuse the existing functional core where it is already solid: bookmark storage, page extraction, provider configuration, AI analysis, hybrid retrieval, theme persistence, and trial/license flows.
3. Introduce a new top-level product model:
   - **Popup** = quick entry
   - **Side Panel** = Ghostreader companion
   - **Dashboard** = primary knowledge workspace
   - **Settings** = architecture and system configuration
4. Reduce the MVP utility feel and move the product toward a cohesive local-first knowledge tool.

## Current State Summary

### Existing implemented strengths
- `src/popup.tsx` already supports save-current-page, bookmark search, analysis triggering, and bookmark detail interactions.
- `src/sidepanel.tsx` already contains the most advanced retrieval logic, including current-page context loading and hybrid retrieval result generation.
- `src/options.tsx` already manages provider settings, bookmark-related views, theme usage, trial state, and license activation.
- `src/lib/storage/*`, `src/lib/config/*`, `src/lib/providers/*`, `src/features/ai/*`, and `src/features/hybrid-retrieval/*` provide a meaningful reusable capability layer.

### Current structural problems
- Page responsibilities are too broad and blurry.
- `popup`, `sidepanel`, and `options` each mix layout, orchestration, and product-module concerns in large files.
- The current product feels like several MVP tools rather than one coherent reading-and-knowledge experience.
- There is no true implementation of the `design/dashboard.html` product concept.

## Architecture Decisions

### Dashboard entry path
- Dashboard should ship as a dedicated extension page at `src/tabs/dashboard.tsx`.
- Popup and sidepanel should open it as a standalone tab, not by overloading `src/options.tsx`.

### Settings responsibility
- `src/options.tsx` remains the Settings surface.
- Settings and Dashboard should share visual language and primitives, but not page responsibility.

### Shared navigation
- Navigation into dashboard, sidepanel, and settings should use a small shared helper rather than duplicated raw browser API calls in each surface.

### Shared bookmark metadata updates
- Summary and tag edits should use one shared update path that always writes a fresh `updatedAt`.
- Dashboard should reuse this shared path instead of introducing a dashboard-only persistence flow.

## Product Information Architecture

### 1. Popup
**Target role:** Fast action entry point.

**What it should become:**
- A lightweight card-based entry view.
- Shows the current page and whether it can be saved or has already been saved.
- Primary CTA: **Save and analyze**.
- Secondary actions: **Open side panel** and **Open dashboard**.

**What it should stop being:**
- A full bookmark manager.
- A full search/list/detail environment.

**Implication:**
Most list management and deep interactions currently in `src/popup.tsx` should move out of popup responsibility.

### 2. Side Panel
**Target role:** Ghostreader companion for query-driven interaction.

**What it should become:**
- A persistent reading assistant.
- Search/query first.
- Conversation-like result flow.
- Current-page-aware and saved-bookmark-aware.
- Lightweight prompt chips, answer blocks, and suggested actions.

**What it should stop being:**
- A visually dominant bookmark-management list.
- A tree-first management interface.

**Implication:**
The strongest current sidepanel capabilities stay, but their UI framing changes from management-first to assistant-first.

### 3. Dashboard
**Target role:** Primary knowledge workspace.

**What it should become:**
- The main place to browse, read, inspect, and edit saved knowledge.
- Left navigation for a simple real grouping such as recency or domain in the MVP.
- Center reading pane for archived page content.
- Right-side AI utility cards for summary, tags, and ask actions.
- Top search entry at the top; it may be visual-only in the MVP.

**Why it matters:**
This is the biggest missing product surface today. It is the core of the design direction because it transforms TabVault from a bookmark utility into a local-first reading and knowledge console.

**MVP scope constraints:**
- The first version should show bookmark title, URL, `createdAt`, and extracted content from `extractedText`.
- The first version should support selecting a bookmark, editing summary, editing tags, and asking Ghostreader about the active bookmark.
- The first version should not require spaces backend, semantic dashboard search, knowledge graph, or persistent multi-turn chat.

### 4. Settings
**Target role:** Architecture configuration center.

**What it should become:**
- Provider and protocol configuration.
- Retrieval architecture configuration.
- Theme and experimental settings.
- Trial/license information in a non-disruptive presentation.

**What it should stop being:**
- A generic options page that also carries unrelated product flows.

## UI Design Alignment

### Visual language
All primary product surfaces should align to the design prototype language:
- soft paper-like light theme
- muted low-contrast dark theme
- 1px borders
- restrained shadows
- rounded cards
- careful spacing and typography hierarchy
- low-anxiety state presentation
- minimal large warning blocks

### Shared shell rules
Across popup, sidepanel, dashboard, and settings:
- use a shared token system rather than per-page styling drift
- normalize card, border, spacing, and input treatments
- keep accent usage intentional and sparse
- make the theme feel like one product, not several independent pages

## Functional Alignment Decisions

### Directly carried forward and upgraded
These should be retained and re-presented in the new product structure.

#### Save + optional AI analysis
Reuse existing save and analysis behavior from `src/popup.tsx` and `src/features/ai/analyze-bookmark.ts`.

#### Hybrid retrieval
Reuse the existing `src/features/hybrid-retrieval/*` logic, especially from `src/sidepanel.tsx`, as the core of the Ghostreader query flow.

#### AI summary and tags
Reuse stored bookmark summary/tag data and existing update paths so dashboard cards can support inline editing.

#### Extracted local content
Use the already extracted and stored bookmark content as the basis for the dashboard reading pane and context-aware questioning.

#### Shared navigation and metadata helpers
Centralize dashboard/sidepanel/settings navigation and bookmark metadata updates so popup, sidepanel, dashboard, and settings do not each reimplement the same browser API and `updatedAt` logic.

### Implement now as MVP, not full vision
These should be real in the refactor, but only to the degree needed to support the new product shape.

#### Dashboard workspace
Build the page for real, but keep the first version focused on:
- navigation column
- reading pane
- AI side cards
- selecting and switching the active bookmark
- showing `createdAt` and `extractedText` from the stored bookmark record

Do not require advanced layout editing, rich space systems, or heavy filtering in the first pass.

#### Sidepanel Ghostreader experience
Make the sidepanel feel conversational and assistant-led, but do not require full persistent multi-turn chat memory in the first iteration.

#### Settings architecture view
Restructure the settings page around system concerns even if some planned settings are initially informational or partially wired.

### Defer or represent as future-facing UI
These may appear in structure or settings, but should not be deeply implemented in the first refactor.

#### Local embeddings / full local model stack
#### Complex multi-agent routing
#### Spaced repetition / resurfacing systems
#### Knowledge-graph-style organization

These belong to future capability expansion, not the first design-parity refactor.

## Structural Refactor Direction

### Recommended front-end organization
Move toward product-area organization while preserving shared capability modules.

Suggested direction:
- `src/features/popup/*`
- `src/features/sidepanel/*`
- `src/features/dashboard/*`
- `src/features/settings/*`
- `src/components/shared/*`
- keep `src/lib/*` as the reusable capability and persistence layer

### Separation principles

#### Page entry files
Should primarily orchestrate:
- page shell
- high-level state
- routing between local page modes
- service wiring

#### Shared components
Should cover reusable product pieces such as:
- search bars
- card shells
- header/toolbars
- editable summary blocks
- tag editors
- reading panes
- assistant thread blocks
- provider configuration sections
- retrieval configuration sections

#### Capability layer
Should keep using the existing repository/provider/config/extraction/retrieval modules rather than duplicating logic inside page components.

## Staged Refactor Plan

### Stage 1: Shared design foundation
- Redesign shared tokens in `src/ui/design-tokens.ts`
- Update global styles and theme usage to support the new product language
- Create shared shell/card/input primitives or wrappers

### Stage 2: Popup refactor
- Reduce popup scope to fast-entry behavior
- Surface current page, save status, and save/analyze CTA
- Add clear links/actions into sidepanel and dashboard
- Route these actions through a shared navigation helper
- Remove deep management responsibilities from popup

### Stage 3: Sidepanel refactor
- Reframe sidepanel as Ghostreader
- Promote search/query input and answer flow to first-class UI
- Keep retrieval logic, but present it as conversational guidance
- De-emphasize tree/list-heavy management UI

### Stage 4: Dashboard implementation
- Add a real dashboard entry page
- Use a dedicated tab entry at `src/tabs/dashboard.tsx`
- Build reading-focused layout based on `design/dashboard.html`
- Connect bookmark selection to stored content, summary, and tags
- Support editing summary and tags with existing storage paths

### Stage 5: Settings refactor
- Reorganize options into architecture-centered sections
- Separate provider configuration from retrieval settings from experience settings
- Retain license/trial visibility without overwhelming the page

### Stage 6: Cohesion and polish
- Normalize cross-surface navigation
- Ensure theme parity and visual consistency
- Reconcile duplicated components and remove obsolete UI flows
- Tighten loading, empty, and error states to match the low-noise design language
- Eliminate duplicated raw navigation calls and duplicated summary/tag update logic where practical

## Success Criteria

### UX success
- Popup feels like a quick launcher, not a mini admin screen.
- Sidepanel feels like an assistant, not a bookmark dump.
- Dashboard becomes the obvious primary place for deep interaction with saved knowledge.
- Settings reads like an architecture console rather than a raw storage editor.

### Technical success
- Existing core data flows remain functional.
- No redundant rewrite of storage, provider, extraction, or retrieval modules.
- New page structures reduce single-file complexity in `popup.tsx`, `sidepanel.tsx`, and `options.tsx`.
- Dashboard uses real bookmark fields such as `createdAt` and `extractedText`, not new parallel schema.
- Shared navigation and shared bookmark metadata update paths reduce duplicated implementation logic.

### Design success
- The shipped UI clearly resembles the direction established in `design/`.
- The product feels unified across all entry points.
- The interface better communicates a local-first AI knowledge product rather than an MVP utility.
