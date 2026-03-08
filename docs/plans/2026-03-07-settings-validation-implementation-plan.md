# Settings Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add basic synchronous validation to TabVault’s settings UI so obviously invalid provider/app configurations are blocked before save.

**Architecture:** Keep validation local to the options page and derived from the current form state. The options page computes app-level and provider-level errors, passes field errors down to `ProviderSettingsForm`, and disables the save flow while validation errors exist.

**Tech Stack:** TypeScript, React, Plasmo, Vitest

---

### Task 1: Add validation state helpers for settings UI

**Files:**
- Create: `src/features/settings/settings-validation.ts`
- Test: `tests/settings/settings-validation.test.ts`

**Step 1: Write the failing test**

`tests/settings/settings-validation.test.ts`
```ts
import { describe, expect, it } from "vitest"
import { validateSettingsForm } from "../../src/features/settings/settings-validation"

describe("validateSettingsForm", () => {
  it("flags an enabled provider with an empty API key", () => {
    const result = validateSettingsForm(
      { defaultProvider: "openai", autoAnalyzeOnSave: false },
      [
        {
          provider: "openai",
          enabled: true,
          apiKey: "",
          model: "gpt-4o-mini",
          baseUrl: "https://api.openai.com/v1"
        },
        { provider: "claude", enabled: false, apiKey: "", model: "" },
        { provider: "gemini", enabled: false, apiKey: "", model: "" }
      ]
    )

    expect(result.providers.openai.apiKey).toBe("API key is required")
    expect(result.hasErrors).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/settings/settings-validation.test.ts
```

Expected: FAIL because the helper does not exist.

**Step 3: Write minimal implementation**

Create `src/features/settings/settings-validation.ts` with:
- `ProviderValidation`
- `SettingsValidation`
- `validateSettingsForm(appSettings, providers)`

Rules to implement now:
- enabled provider requires `apiKey`
- enabled provider requires `model`
- enabled OpenAI requires valid `baseUrl`
- `defaultProvider` must reference an enabled provider

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/settings/settings-validation.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/settings/settings-validation.ts tests/settings/settings-validation.test.ts
git commit -m "feat: add settings validation helpers"
```

### Task 2: Render provider-level validation messages in the settings form

**Files:**
- Modify: `src/components/provider-settings-form.tsx`
- Modify: `tests/ui/options.test.tsx`

**Step 1: Write the failing test**

Extend `tests/ui/options.test.tsx` to expect provider field error messages when passed through props.

Example assertion:
```ts
expect(openAiSection?.textContent).toContain("API key is required")
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/options.test.tsx
```

Expected: FAIL because `ProviderSettingsForm` does not yet render validation messages.

**Step 3: Write minimal implementation**

Update `ProviderSettingsForm` to accept provider field errors and render:
- API key error
- model error
- baseUrl error

Keep messages inline and minimal.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/options.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/provider-settings-form.tsx tests/ui/options.test.tsx
git commit -m "feat: render provider validation messages"
```

### Task 3: Add app-level validation and disable save when invalid

**Files:**
- Modify: `src/options.tsx`
- Test: `tests/ui/options-save-state.test.tsx`

**Step 1: Write the failing test**

Extend `tests/ui/options-save-state.test.tsx` to verify:
- save is disabled when default provider is disabled
- save is disabled when enabled provider has missing required fields
- save handler does not persist invalid settings

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/ui/options-save-state.test.tsx
```

Expected: FAIL because the options page does not yet compute or enforce validation.

**Step 3: Write minimal implementation**

Update `src/options.tsx` to:
- compute `validateSettingsForm(appSettings, providers)`
- render app-level validation error for invalid `defaultProvider`
- pass per-provider validation down to each provider form
- disable Save when validation has errors
- exit early in `handleSave` if validation has errors

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/ui/options-save-state.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options-save-state.test.tsx
git commit -m "feat: block invalid provider settings from saving"
```

### Task 4: Add OpenAI base URL validation and disabled-provider edge cases

**Files:**
- Modify: `tests/settings/settings-validation.test.ts`
- Modify: `tests/ui/options-save-state.test.tsx`
- Modify: `src/features/settings/settings-validation.ts`

**Step 1: Write the failing tests**

Add tests for:
- enabled OpenAI with empty `baseUrl` -> blocking error
- enabled OpenAI with invalid URL -> blocking error
- disabled provider with empty fields -> no blocking errors

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/settings/settings-validation.test.ts tests/ui/options-save-state.test.tsx
```

Expected: FAIL because those edge cases are not fully enforced yet.

**Step 3: Write minimal implementation**

Update `validateSettingsForm` to:
- require OpenAI `baseUrl` only when OpenAI is enabled
- use `new URL(...)` validation guarded with try/catch
- skip blocking field validation for disabled providers

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/settings/settings-validation.test.ts tests/ui/options-save-state.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/settings/settings-validation.ts tests/settings/settings-validation.test.ts tests/ui/options-save-state.test.tsx
git commit -m "feat: validate enabled provider requirements"
```

### Task 5: Update README and run full verification

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Clarify that:
- settings UI now includes basic validation
- invalid provider settings are blocked before save
- connection testing is still not implemented

**Step 2: Run validation-related tests**

Run:
```bash
npm exec vitest run tests/settings/settings-validation.test.ts tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx
```

Expected: PASS.

**Step 3: Run full test suite**

Run:
```bash
npm exec vitest run
```

Expected: PASS.

**Step 4: Run typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

**Step 5: Run build**

Run:
```bash
npm run build
```

Expected: PASS.

**Step 6: Commit**

```bash
git add README.md
git commit -m "docs: describe basic settings validation"
```
