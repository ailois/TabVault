# Settings Design Alignment and Global Language Switching Design

## Goal

Make the extension settings page match `design/settings.html` in structure, visual hierarchy, and copy direction, while preserving the currently required real settings (`Summary language`, `Auto (follow content)`, `Auto analyze on save`, `Auto retry failed analysis`) and adding an extension-wide `Display language` switch. The UI should default to English, but users must be able to switch languages across all extension pages.

## Constraints Confirmed

- The settings surface should align with `design/settings.html`, including:
  - top-level tab structure
  - retrieval and reranking sections
  - reference copy direction and card hierarchy
- The following existing settings must remain available:
  - `Summary language`
  - `Auto (follow content)`
  - `Auto analyze on save`
  - `Auto retry failed analysis`
- The page UI should be English-first.
- Language switching must apply to all extension pages, not just Settings.
- `Summary language` and UI language are separate concerns and must not be conflated.

## Recommended Approach

### Option A — Design parity + separate preservation card + global i18n (recommended)

Restore the main settings layout to closely follow `design/settings.html`, then add one clearly scoped extra card for the preserved runtime settings and the new UI language selector.

**Why this is recommended:**
- It best satisfies the requirement that everything else should match the design reference.
- It avoids overloading the Agent or Search sections with unrelated controls.
- It creates a clean separation between architecture configuration and UX/runtime preferences.
- It provides a correct place to introduce extension-wide display language without misusing `Summary language`.

### Option B — Merge preserved settings into Agent tab

This keeps the page shorter but distorts the reference design by mixing interaction/runtime preferences into the provider/agent configuration area.

### Option C — Merge preserved settings into Search tab

This also reduces visible sections, but it creates a semantic mismatch because summary language and automation toggles are not retrieval-engine configuration.

## Approved Information Architecture

The updated Settings page should be organized into four visible layers.

### 1. Header

Use an English header by default:
- Title: `Architecture Settings`
- Subtitle: English copy derived from the design reference
- Theme toggle remains at the top right

### 2. Top-level tabs

Restore the two-tab structure from the design reference, translated into English:
- `Agent Companion Engine`
- `Lightweight Hybrid Retrieval`

These tabs define the primary architectural sections of the settings surface.

### 3. Tab content

#### Agent Companion Engine

This tab should visually and structurally align with the design reference's agent section. It includes:
- Protocol
- Base URL
- Model ID
- API Key
- Test connection action
- Save configuration action

The card styling, spacing, headings, helper text, and control grouping should closely match the reference layout.

#### Lightweight Hybrid Retrieval

This tab should restore the design reference's retrieval-oriented sections:
- Stage 1: Lexical Search (BM25)
- Stage 2: Semantic Reranking
- Reranking enabled state
- Local / Cloud reranking source choice
- Contextual explainer copy, badges, and nested configuration blocks

If part of this area is not yet fully wired to production settings, the UI should still preserve the structure while making any unavailable controls visibly non-final (for example disabled, placeholder, or clearly labeled as not yet active).

### 4. Additional preservation card

Below the main tab content, add a separate card dedicated to UX/runtime preferences. Recommended title:
- `Experience & Automation`

This card contains:
- `Display language` (new, extension-wide UI language)
- `Summary language` (existing, summary output language)
- `Auto (follow content)`
- `Auto analyze on save`
- `Auto retry failed analysis`

This card is the intentional and only structural deviation from the design reference.

## Language Model for the Product UI

The product needs two distinct language concepts.

### Display language

This is a new global UI setting controlling extension chrome and page copy.

Requirements:
- Default value: `English`
- Supported initially: `English`, `中文`
- Stored in shared extension settings
- Read by all extension pages from one common source
- Used for visible labels, helper text, buttons, section titles, and informational copy

### Summary language

This remains an existing content-generation preference.

Requirements:
- Keep it separate from display language in both data model and UI placement
- Do not reuse it as UI language
- Make the label explicit enough that users understand it affects summary output, not interface chrome

## Extension-wide i18n Direction

The implementation should introduce a lightweight shared translation layer rather than hardcoding strings page-by-page.

### Expected structure

- A central language setting in shared configuration/storage
- A shared translation dictionary for English and Chinese copy
- A small helper or hook used by extension pages to resolve strings from the current display language
- Page-level adoption across the extension's existing user-facing surfaces

### Rollout expectation

This work is not just a Settings-page-only toggle. The selected display language should propagate across all extension pages that currently expose user-facing text, with Settings being the place where the user controls it.

## Functional vs Presentational Boundaries

To avoid misleading parity, the implementation should distinguish between controls that must be fully wired now and controls that may begin as aligned UI shells.

### Must be fully functional in this phase

- Display language
- Summary language
- Auto (follow content)
- Auto analyze on save
- Auto retry failed analysis
- Existing provider configuration save/load path
- Theme toggle behavior already present in the page

### Can be design-aligned with explicit non-final state if needed

- Retrieval and reranking controls that do not yet have complete production plumbing

Those controls should not falsely imply end-to-end support if the backing logic is absent.

## Success Criteria

The work is successful when all of the following are true:

1. The settings page visually reads as the implemented form of `design/settings.html`, rather than the current custom dashboard-style layout.
2. The Agent and Retrieval sections use the reference tab structure and card hierarchy.
3. The preserved settings remain available in a separate card without distorting the reference layout.
4. The UI defaults to English.
5. Users can switch display language between English and Chinese.
6. That display language applies across extension pages, not just the settings page.
7. `Summary language` remains separate and continues to affect summary behavior only.

## Out of Scope

- Adding more than two UI languages in this phase
- Redesigning unrelated flows that do not need text localization for this scope
- Replacing existing data models beyond what is necessary to add display language and wire the shared translation layer
