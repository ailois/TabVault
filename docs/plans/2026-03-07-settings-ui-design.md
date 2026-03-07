# Settings UI Design

**Date:** 2026-03-07
**Status:** Approved for planning

## Goal
Replace TabVault's placeholder options page with a basic, usable settings UI for provider and analysis configuration, backed by the existing `chrome.storage.sync` repository.

## Scope

### In Scope
- Edit `defaultProvider`
- Toggle `autoAnalyzeOnSave`
- Edit provider configs for:
  - OpenAI-compatible
  - Claude
  - Gemini
- Save:
  - `apiKey`
  - `model`
  - `enabled`
  - `baseUrl` for OpenAI-compatible only
- Load initial values from `ChromeSettingsRepository`
- Persist values back to `chrome.storage.sync`
- Show a minimal save status

### Out of Scope
- Dynamic add/remove provider rows
- Advanced validation system
- Real-time provider key verification
- Styled product-polish UI
- Secret masking beyond normal password inputs

## Recommended Approach

### Option A: Basic usable form (recommended)
- One options page
- One app settings section
- One provider section per provider
- One Save button for the whole form

Why this is the best fit now:
- matches current MVP maturity
- minimizes branching and state complexity
- uses the already implemented settings repository directly
- replaces the README's manual storage editing with a real in-extension flow quickly

### Option B: Enhanced form with inline validation
- Adds required-field validation, per-provider disable rules, and richer status feedback

Not recommended yet because it expands UI logic and testing scope before the first usable form lands.

### Option C: Full dynamic provider manager
- Add/remove arbitrary provider configs and advanced management

Not recommended because current data model is fixed to three providers and the product does not need dynamic configuration yet.

## UI Structure

```text
TabVault Settings
├── App Settings
│   ├── Default provider select
│   └── Auto analyze on save checkbox
├── OpenAI-compatible
│   ├── Enabled checkbox
│   ├── API key input
│   ├── Model input
│   └── Base URL input
├── Claude
│   ├── Enabled checkbox
│   ├── API key input
│   └── Model input
├── Gemini
│   ├── Enabled checkbox
│   ├── API key input
│   └── Model input
└── Save button + status message
```

## Data Flow

### Load flow
1. Options page mounts
2. Read app settings from `ChromeSettingsRepository.getAppSettings()`
3. Read provider configs from `ChromeSettingsRepository.getProviders()`
4. Merge stored provider configs into a fixed three-provider UI model
5. Render the form

### Save flow
1. User edits form values
2. Clicks Save
3. Save app settings through `saveAppSettings`
4. Save provider configs through `saveProviders`
5. Show success or error status

## State Model

The UI should keep local React state shaped like:

```ts
type ProviderFormState = {
  provider: "openai" | "claude" | "gemini"
  apiKey: string
  model: string
  enabled: boolean
  baseUrl?: string
}
```

Use exactly one form state object per provider. Do not introduce generalized dynamic collections beyond what the three fixed providers need.

## Provider Defaults

If a stored provider config does not exist yet, the options page should synthesize a default row so all three providers are always editable.

Recommended UI defaults:
- OpenAI-compatible:
  - `enabled: true`
  - `baseUrl: "https://api.openai.com/v1"`
- Claude:
  - `enabled: false`
- Gemini:
  - `enabled: false`

The save action persists the current form state as the full provider config array.

## Error Handling

Minimal first version:
- Show `Saving...` while persisting
- Show `Saved settings` on success
- Show `Failed to save settings` on repository error

Do not block save on empty keys/models in the first version. The popup already handles missing-key analysis cases; the goal here is to provide the editing surface first.

## Testing Strategy

Required coverage:
1. options page loads stored values
2. options page renders all three provider sections
3. save writes app settings
4. save writes provider configs
5. OpenAI-compatible base URL field exists; Claude/Gemini do not require it

Keep tests DOM-oriented and repository-injected. Avoid end-to-end browser wiring in this phase.

## Risks to Avoid
- Reusing popup-specific logic in the options page
- Hiding providers that are not yet configured
- Adding dynamic provider management before the fixed three-provider UI works
- Coupling form state directly to storage response shape without defaults

## Recommended Next Step
Implement the basic usable form first. Once provider editing works inside the extension, validation and richer UX can be layered on top in a separate phase.
