# Design: Manual AI Trigger and Connection Testing

Date: 2026-03-11

## Summary

Two features: (1) Let users manually trigger AI analysis on individual saved bookmarks or all unanalyzed bookmarks at once. (2) Let users test a provider's API key directly from the Settings page before saving.

---

## Feature 1: Manual AI Trigger

### Card-level trigger (single bookmark)

Each `BookmarkCard` header gains an **"Analyze"** button (left of the status badge area):

- Visible only when `status === "saved"` or `status === "error"`
- Hidden when `status === "analyzing"` (badge already shown) or `status === "done"` (already has result)
- On click: calls `onAnalyze(bookmark.id)` — delegate to Popup

`BookmarkList` gains a new required prop: `onAnalyze: (id: string) => Promise<void>`

### Global "Analyze all" button (Popup Actions)

A third button **"Analyze all"** in the Actions section:

- Targets only bookmarks where `status === "saved"` or `status === "error"`
- Disabled if no such bookmarks exist, or if analysis is already running
- Processes bookmarks **serially** (one at a time)
- Shows progress in the status message: `"Analyzing 2/5..."`
- On completion: status message returns to `"Ready to save the current page."`

### Popup state changes

New state:
- `analyzeProgress: { current: number; total: number } | null` — null when idle, set during Analyze all

New handlers:
- `handleAnalyzeBookmark(id)`: resolves provider config → calls `analyzeBookmark()` → reloads list. Shows error banner if no provider configured.
- `handleAnalyzeAll()`: filters bookmarks to `saved`/`error` status → serially calls `handleAnalyzeBookmark` for each, updating `analyzeProgress` before each call → clears progress on finish

### Error handling

- If no default provider is configured or enabled, show error banner: `"Add an API key in Settings to enable analysis."`
- Individual analysis errors are written to the bookmark record (`status: "error"`, `errorMessage`), not surfaced as a global banner (consistent with existing auto-analyze behavior)

---

## Feature 2: Connection Testing

### Test button in each provider card

Each `ProviderSettingsForm` gains a **"Test connection"** button at the bottom of the form:

- Enabled only when `enabled === true` and required fields are filled (apiKey, model, and baseUrl for openai)
- On click: button text → `"Testing..."`, disabled during test
- On success: show green `"✓ Connected"` text next to button; auto-clears after 3 seconds
- On failure: show red error string (e.g. `"401 Unauthorized"`) — persists until next test or form field change

### Component state

`ProviderSettingsForm` gains internal state:
```
testStatus: "idle" | "testing" | "ok" | string  // string = error message
```

Reset `testStatus` to `"idle"` whenever any field in the form changes (`onChange` fires).

### New prop on ProviderSettingsForm

```ts
onTestConnection: (value: ProviderFormState) => Promise<"ok" | string>
```

Returns `"ok"` on success, or an error string on failure.

### Options service extension

`OptionsServices` gains:
```ts
testConnection: (config: ProviderConfig) => Promise<void>
```

Default implementation: calls `createProvider(config).analyze({ title: "test", url: "https://test", content: "Say OK" })`. Throws on failure.

`Options` wraps this into `onTestConnection` for each provider form:
```ts
onTestConnection={async (formValue) => {
  try {
    await optionsServices.testConnection(providerConfigFromFormState(formValue))
    return "ok"
  } catch (error) {
    return error instanceof Error ? error.message : "Connection failed"
  }
}}
```

---

## Files Changed

### Feature 1
- `src/components/bookmark-list.tsx` — add `onAnalyze` prop to `BookmarkList` and `BookmarkCard`; add Analyze button on card
- `src/popup.tsx` — add `handleAnalyzeBookmark`, `handleAnalyzeAll`, `analyzeProgress` state; pass `onAnalyze` to `BookmarkList`; add "Analyze all" button; update status message logic
- `tests/ui/bookmark-card.test.tsx` — test Analyze button visibility per status, test onAnalyze called on click
- `tests/ui/popup-state.test.tsx` — test single analyze flow, test Analyze all with progress, test error when no provider

### Feature 2
- `src/components/provider-settings-form.tsx` — add `onTestConnection` prop; add Test button with `testStatus` state; reset on field change
- `src/options.tsx` — extend `OptionsServices` with `testConnection`; wire `onTestConnection` into each `ProviderSettingsForm`
- `src/lib/providers/provider-factory.ts` — (check if `createProvider` is already exported for use in Options; no change needed if so)
- `tests/ui/options.test.tsx` or new `tests/ui/options-test-connection.test.tsx` — test button enabled/disabled, test ok and error states

---

## Testing

- Analyze button: hidden for `done`/`analyzing`, visible for `saved`/`error`
- onAnalyze called with correct id on click
- Analyze all: progress message updates, serially processes all pending bookmarks
- Analyze all disabled when no pending bookmarks
- Test connection button: disabled when provider not enabled or fields empty
- Test connection success: shows ✓ Connected, clears after 3s
- Test connection failure: shows error string
- Test status resets when form field changes
