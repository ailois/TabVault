# Settings Design Alignment and Global Language Switching Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the settings page to match `design/settings.html`, preserve the required runtime settings, and add extension-wide display language switching with English as the default UI language.

**Architecture:** Keep the existing React settings entrypoint, but reorganize `src/options.tsx` around the design reference's tabbed information architecture. Introduce a shared display-language setting and translation layer that all user-facing extension pages can consume, while preserving `Summary language` as a separate setting.

**Tech Stack:** React, TypeScript/TSX, existing extension settings repository, shared UI theme system, Vitest or the repo's existing frontend test setup.

---

### Task 1: Inventory settings and page text sources

**Files:**
- Modify: `src/options.tsx`
- Inspect: `design/settings.html`
- Inspect: user-facing extension page entry files under `src/`

**Step 1: List all text and layout regions in the current settings page**

Identify:
- the current top-level layout in `src/options.tsx`
- the controls for provider settings
- the existing runtime settings (`Summary language`, `Auto (follow content)`, `Auto analyze on save`, `Auto retry failed analysis`)
- any current title/subtitle/status copy

**Step 2: List all text blocks from `design/settings.html` that must be mirrored**

Capture:
- header title/subtitle
- tab labels
- section headings
- helper copy
- button labels
- badges and explainer text

**Step 3: Identify all extension surfaces that need display-language adoption**

Search for user-facing pages/components and record exact files that currently hardcode visible text.

**Step 4: Write down the source-of-truth mapping**

For each setting/control, decide whether it is:
- an existing real setting
- a new real setting
- a design-aligned shell that may be disabled/placeholder initially

**Step 5: Commit**

```bash
git add src/options.tsx
git commit -m "chore: inventory settings text and layout sources"
```

---

### Task 2: Add display-language setting to shared configuration

**Files:**
- Modify: the shared app settings type definition file (for example `src/types/settings.ts`)
- Modify: the default settings file (for example `src/features/settings/default-settings.ts`)
- Modify: the settings repository implementation that persists app settings
- Test: the nearest settings repository tests if they exist

**Step 1: Write the failing test**

Add or update a test that loads default app settings and asserts:
- `displayLanguage` exists
- the default is `en`
- existing saved settings can still round-trip with the new field present

**Step 2: Run test to verify it fails**

Run the narrowest applicable test command for the settings model/repository.

**Step 3: Write minimal implementation**

Add a new app setting field:
- `displayLanguage: "en" | "zh"`

Update defaults and persistence so the field is saved/loaded with the rest of app settings.

**Step 4: Run test to verify it passes**

Run the same narrow test command and confirm PASS.

**Step 5: Commit**

```bash
git add <settings-type-file> <default-settings-file> <settings-repository-files> <test-files>
git commit -m "feat(settings): add display language preference"
```

---

### Task 3: Build a shared translation layer

**Files:**
- Create: a shared i18n dictionary/helper file under `src/` (for example `src/lib/i18n/messages.ts`)
- Create or modify: a helper/hook file for resolving localized strings
- Test: a focused test file for translation lookup if the repo has unit tests for helpers

**Step 1: Write the failing test**

Add a test that verifies:
- `en` returns English copy
- `zh` returns Chinese copy
- unknown keys fail loudly or fall back according to the chosen rule

**Step 2: Run test to verify it fails**

Run the focused helper test.

**Step 3: Write minimal implementation**

Create:
- a typed message dictionary
- keys for settings-page strings first
- a small helper like `getMessage(language, key)` or a page hook wrapper

Keep it simple and central. Do not over-abstract.

**Step 4: Run test to verify it passes**

Run the helper test and confirm PASS.

**Step 5: Commit**

```bash
git add src/lib/i18n <test-files>
git commit -m "feat(i18n): add shared extension message dictionary"
```

---

### Task 4: Refactor settings page structure to match design tabs

**Files:**
- Modify: `src/options.tsx`
- Inspect for reuse: any existing presentational components already used by settings controls
- Test: settings page/component test file if present

**Step 1: Write the failing test**

Add or update a UI test that asserts the settings page renders:
- English header `Architecture Settings`
- tab labels for `Agent Companion Engine` and `Lightweight Hybrid Retrieval`
- the new separate `Experience & Automation` card

**Step 2: Run test to verify it fails**

Run the focused options/settings UI test.

**Step 3: Write minimal implementation**

Restructure `src/options.tsx` so it matches the design reference hierarchy:
- header
- top tabs
- agent tab content
- retrieval tab content
- separate preservation card beneath the main tab content

Preserve the existing save/load wiring while moving controls into the new layout.

**Step 4: Run test to verify it passes**

Run the same focused options/settings UI test and confirm PASS.

**Step 5: Commit**

```bash
git add src/options.tsx <test-files>
git commit -m "refactor(settings): align page structure with design tabs"
```

---

### Task 5: Wire the Experience & Automation card

**Files:**
- Modify: `src/options.tsx`
- Modify: any form-state helpers used by these settings
- Test: settings page/component test file

**Step 1: Write the failing test**

Add or update a UI test asserting the card renders and binds:
- `Display language`
- `Summary language`
- `Auto (follow content)`
- `Auto analyze on save`
- `Auto retry failed analysis`

Also assert that changing those controls updates the relevant form state.

**Step 2: Run test to verify it fails**

Run the focused UI test.

**Step 3: Write minimal implementation**

Implement the separate card and bind each control to the real settings model.

Be explicit in labels so users understand:
- `Display language` affects UI language
- `Summary language` affects summary output language

**Step 4: Run test to verify it passes**

Run the same UI test and confirm PASS.

**Step 5: Commit**

```bash
git add src/options.tsx <helper-files> <test-files>
git commit -m "feat(settings): add experience and automation card"
```

---

### Task 6: Localize the settings page itself

**Files:**
- Modify: `src/options.tsx`
- Modify: the shared message dictionary/helper
- Test: settings page/component test file

**Step 1: Write the failing test**

Add a test that renders the settings page with:
- `displayLanguage = "en"` and expects English text
- `displayLanguage = "zh"` and expects Chinese text for the same labels

**Step 2: Run test to verify it fails**

Run the focused settings page test.

**Step 3: Write minimal implementation**

Replace hardcoded settings-page text with message lookups.

Keep:
- all visible labels translatable
- control values and internal setting keys unchanged

**Step 4: Run test to verify it passes**

Run the same test and confirm PASS.

**Step 5: Commit**

```bash
git add src/options.tsx src/lib/i18n <test-files>
git commit -m "feat(settings): localize settings page copy"
```

---

### Task 7: Apply display-language switching to the other extension pages

**Files:**
- Modify: all user-facing extension page entry files identified in Task 1
- Modify: any shared layout/components that own visible text
- Test: the nearest page/component tests for those surfaces

**Step 1: Write the failing test**

For each major surface, add or update a focused test asserting visible text changes when `displayLanguage` switches between `en` and `zh`.

If there is no existing test coverage for a surface, add the smallest practical smoke test.

**Step 2: Run test to verify it fails**

Run the narrow test set for the affected pages.

**Step 3: Write minimal implementation**

Replace hardcoded copy in the targeted pages with shared message lookups.

Do not refactor unrelated logic. Keep this task centered on language adoption.

**Step 4: Run test to verify it passes**

Run the same page-level tests and confirm PASS.

**Step 5: Commit**

```bash
git add <localized-page-files> <shared-components> <test-files>
git commit -m "feat(i18n): apply display language across extension pages"
```

---

### Task 8: Recreate the retrieval/reranking visual sections safely

**Files:**
- Modify: `src/options.tsx`
- Modify: any supporting components if needed
- Test: settings page/component test file

**Step 1: Write the failing test**

Add or update a test asserting the retrieval tab contains:
- Stage 1 lexical search section
- Stage 2 semantic reranking section
- reranking enable state UI
- local/cloud source choice UI

If some controls are intentionally disabled or placeholder, assert that state explicitly.

**Step 2: Run test to verify it fails**

Run the focused retrieval/settings test.

**Step 3: Write minimal implementation**

Restore the reference visual hierarchy for the retrieval tab.

Where production wiring exists, use it.
Where it does not, render clearly non-final controls rather than fake behavior.

**Step 4: Run test to verify it passes**

Run the same test and confirm PASS.

**Step 5: Commit**

```bash
git add src/options.tsx <supporting-files> <test-files>
git commit -m "feat(settings): restore retrieval and reranking sections"
```

---

### Task 9: Verify save/load behavior and page integrity end-to-end

**Files:**
- Modify: tests covering options/settings persistence and rendering
- Modify: `src/options.tsx` only if bugs are found

**Step 1: Write or extend a failing integration-style test**

Verify that:
- saved display language persists after reload
- saved summary/automation settings persist after reload
- the settings page reloads into the correct tab/card state without layout regressions

**Step 2: Run test to verify it fails**

Run the focused integration test.

**Step 3: Write minimal implementation**

Fix only the persistence or rendering bugs exposed by the test.

**Step 4: Run test to verify it passes**

Run the integration test and confirm PASS.

**Step 5: Commit**

```bash
git add src/options.tsx <settings-files> <test-files>
git commit -m "test(settings): verify persistence after design alignment"
```

---

### Task 10: Run final verification

**Files:**
- Modify: none unless verification finds a defect

**Step 1: Run targeted tests for settings, shared settings persistence, and i18n helpers**

Run the project's narrowest relevant commands for:
- settings page tests
- settings repository/model tests
- i18n helper tests
- any affected page smoke tests

**Step 2: Run broader verification for the extension frontend**

Run the nearest equivalent of the frontend/unit test suite covering the modified pages.

**Step 3: Perform a manual UI checklist**

Verify in the extension UI that:
- Settings defaults to English
- switching display language updates other pages
- Agent and Retrieval tabs match the intended design shape
- the Experience & Automation card is present
- Summary language remains distinct from display language
- Save/Test controls still work or remain correctly disabled where unsupported

**Step 4: Commit final fixes if needed**

```bash
git add <files>
git commit -m "fix(settings): address final verification issues"
```

Only do this step if verification uncovered a real defect.
