# Settings Validation Design

**Date:** 2026-03-07
**Status:** Approved for planning

## Goal
Add basic validation to TabVault's settings UI so obviously invalid provider/app configurations cannot be saved, while keeping the UI lightweight and avoiding the larger scope of provider connection testing.

## Scope

### In Scope
- Validate required fields before save:
  - provider `apiKey`
  - provider `model`
- Validate OpenAI-compatible `baseUrl` when provider is enabled
- Prevent `defaultProvider` from pointing to a disabled provider
- Show minimal inline validation messages
- Disable save while validation errors exist
- Recompute validation as the form changes

### Out of Scope
- Network-based provider connection tests
- Per-provider credential verification
- Rich onboarding/help text
- Complex validation framework
- Async field validation

## Recommended Approach

### Option A: Basic synchronous validation (recommended)
- Validation runs locally in the options page
- Errors are derived from current form state
- Save is blocked until errors are resolved

Why this is the best fit now:
- matches current MVP maturity
- avoids network and API-key verification complexity
- fixes the biggest UX problem first: saving obviously broken config

### Option B: Validation + connection test buttons
- Adds a test button per provider with network calls

Not recommended yet because it significantly expands scope and introduces new provider-specific UX, loading state, and error handling concerns.

### Option C: Connection tests only
- Skip form validation and rely on network tests

Not recommended because it leaves obvious local mistakes unresolved and makes the settings experience slower and noisier.

## Validation Rules

### Provider-level rules

For each **enabled** provider:
- `apiKey` must be non-empty
- `model` must be non-empty

For **OpenAI-compatible** only, when enabled:
- `baseUrl` must be non-empty
- `baseUrl` must parse as a valid URL

For disabled providers:
- field errors are not blocking

### App-level rules
- `defaultProvider` must reference an enabled provider

## UX Rules

### Error display
- Show inline text below or near the relevant field/section
- Keep copy short and direct, e.g.:
  - `API key is required`
  - `Model is required`
  - `Base URL is required`
  - `Base URL must be a valid URL`
  - `Default provider must be enabled`

### Save behavior
- If validation errors exist:
  - Save button disabled
  - save handler exits early as a safety backstop
- If no validation errors:
  - current save flow stays unchanged

## State Design

Keep validation derived, not separately editable.

Recommended shape:

```ts
type ProviderValidation = {
  apiKey?: string
  model?: string
  baseUrl?: string
}

type SettingsValidation = {
  defaultProvider?: string
  providers: Record<ProviderType, ProviderValidation>
  hasErrors: boolean
}
```

The options page should compute this from `appSettings` + `providers`, not store arbitrary free-form error state that can drift from inputs.

## Component Design

### Options page
Responsibilities:
- compute validation result
- pass provider-specific errors down to provider sections
- render app-level validation error
- disable save when invalid

### ProviderSettingsForm
Responsibilities:
- render field-level validation text passed in via props
- stay presentation-focused

Do not move repository or provider logic into this component.

## Testing Strategy

Required tests:
1. empty enabled provider `apiKey` blocks save
2. empty enabled provider `model` blocks save
3. invalid OpenAI `baseUrl` blocks save
4. disabled provider does not block save when fields are empty
5. disabled `defaultProvider` shows app-level error and blocks save
6. valid inputs re-enable save and allow persistence

Keep tests DOM-oriented and repository-injected, matching the current options-page testing style.

## Risks to Avoid
- Validating disabled providers as if they were active
- Storing duplicate mutable error state separate from form state
- Introducing provider-specific network checks under the banner of “validation”
- Blocking the user with overly strict rules that are not necessary for MVP

## Recommended Next Step
Implement the basic synchronous validation layer first. Once obviously invalid settings are blocked locally, connection tests can be added later as a separate, explicitly networked feature.
