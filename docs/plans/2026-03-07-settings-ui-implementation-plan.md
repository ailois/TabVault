# Settings UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder options page with a basic, usable provider settings UI backed by the existing `chrome.storage.sync` repository.

**Architecture:** Keep the options page thin and form-focused. Load app settings and provider configs through `ChromeSettingsRepository`, normalize them into fixed UI state for OpenAI-compatible, Claude, and Gemini, then persist the edited values back through the existing repository methods.

**Tech Stack:** TypeScript, React, Plasmo, `chrome.storage.sync`, Vitest

---

### Task 1: Add provider form defaults and normalization helpers

**Files:**
- Create: `src/features/settings/provider-form-state.ts`
- Test: `tests/settings/provider-form-state.test.ts`

**Step 1: Write the failing test**

`tests/settings/provider-form-state.test.ts`
```ts
import { describe, expect, it } from "vitest"
import { buildProviderFormState } from "../../src/features/settings/provider-form-state"

describe("buildProviderFormState", () => {
  it("returns fixed rows for openai, claude, and gemini", () => {
    const state = buildProviderFormState([])

    expect(state).toHaveLength(3)
    expect(state.map((item) => item.provider)).toEqual(["openai", "claude", "gemini"])
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/settings/provider-form-state.test.ts
```

Expected: FAIL because helper does not exist.

**Step 3: Write minimal implementation**

Create `src/features/settings/provider-form-state.ts` with:
- `ProviderFormState` type
- `buildProviderFormState(storedProviders)` helper
- fixed provider order: openai, claude, gemini
- default OpenAI-compatible `baseUrl`

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/settings/provider-form-state.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/settings/provider-form-state.ts tests/settings/provider-form-state.test.ts
git commit -m "feat: add provider settings form defaults"
```

### Task 2: Replace placeholder options page with editable form sections

**Files:**
- Modify: `src/options.tsx`
- Create: `src/components/provider-settings-form.tsx`
- Test: `tests/ui/options.test.tsx`

**Step 1: Write the failing test**

Update `tests/ui/options.test.tsx` to expect:
- app settings section
- three provider sections
- OpenAI-compatible base URL field

Example test expectation:

```ts
expect(markup).toContain("Auto analyze on save")
expect(markup).toContain("OpenAI-compatible")
expect(markup).toContain("Claude")
expect(markup).toContain("Gemini")
expect(markup).toContain("Base URL")
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/options.test.tsx
```

Expected: FAIL because options page is still placeholder-only.

**Step 3: Write minimal implementation**

Create a reusable `ProviderSettingsForm` component that renders:
- Enabled checkbox
- API key input
- Model input
- Base URL input only for `openai`

Update `src/options.tsx` to render:
- default provider select
- auto-analyze checkbox
- three provider sections
- save button placeholder/state area

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/options.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/options.tsx src/components/provider-settings-form.tsx tests/ui/options.test.tsx
git commit -m "feat: add basic provider settings form UI"
```

### Task 3: Load settings from repository into the options page

**Files:**
- Modify: `src/options.tsx`
- Test: `tests/ui/options-load-state.test.tsx`

**Step 1: Write the failing test**

Create `tests/ui/options-load-state.test.tsx` that verifies:
- options page loads saved app settings
- options page loads stored provider configs
- stored values appear in the rendered form

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/options-load-state.test.tsx
```

Expected: FAIL because options page does not yet load repository-backed state.

**Step 3: Write minimal implementation**

Update `src/options.tsx` to:
- accept injectable services for tests
- load `getAppSettings()` on mount
- load `getProviders()` on mount
- normalize providers with `buildProviderFormState`
- render loaded values into controlled inputs

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/options-load-state.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options-load-state.test.tsx
git commit -m "feat: load stored settings into options UI"
```

### Task 4: Persist settings changes back to chrome.storage

**Files:**
- Modify: `src/options.tsx`
- Test: `tests/ui/options-save-state.test.tsx`

**Step 1: Write the failing test**

Create `tests/ui/options-save-state.test.tsx` that verifies:
- clicking Save calls `saveAppSettings`
- clicking Save calls `saveProviders`
- persisted payload reflects form state

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/options-save-state.test.tsx
```

Expected: FAIL because options page does not yet save changes.

**Step 3: Write minimal implementation**

Update `src/options.tsx` to:
- maintain local app-settings state
- maintain local provider-form state
- persist both on Save
- save all three provider rows back through `saveProviders`

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/options-save-state.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options-save-state.test.tsx
git commit -m "feat: persist provider settings from options page"
```

### Task 5: Add minimal save status and error feedback

**Files:**
- Modify: `src/options.tsx`
- Test: `tests/ui/options-save-state.test.tsx`

**Step 1: Write the failing test**

Extend save-state tests to expect:
- `Saving...` while persisting
- `Saved settings` on success
- `Failed to save settings` on repository error

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/options-save-state.test.tsx
```

Expected: FAIL because status messaging is not yet implemented.

**Step 3: Write minimal implementation**

Add local UI state for:
- idle
- saving
- saved
- error

Render a simple status message near the Save button.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/options-save-state.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options-save-state.test.tsx
git commit -m "feat: surface settings save status in options page"
```

### Task 6: Update README and run full verification

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Replace the manual-storage-only guidance with:
- options page now supports provider editing
- where to edit default provider / auto-analyze / provider keys
- note that this is still a basic MVP settings UI

**Step 2: Run the relevant test suite**

Run:
```bash
npm exec vitest run
```

Expected: PASS.

**Step 3: Run typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

**Step 4: Run build**

Run:
```bash
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: describe options-based provider settings"
```
