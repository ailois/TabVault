# TabVault

Local-first AI bookmark browser extension built with Plasmo, TypeScript, and React.

TabVault lets you save the current page, keep bookmarks locally, search them in the popup, and optionally run AI summary/tag generation with your own provider key.

## 当前状态 / Current MVP state

- ✅ Save the current tab from the popup
- ✅ Extract and store page title, URL, and captured content locally
- ✅ Search saved bookmarks in the popup
- ✅ Persist bookmarks in IndexedDB
- ✅ Persist app/provider settings in `chrome.storage.sync`
- ✅ Run AI analysis with an enabled OpenAI-compatible, Claude, or Gemini provider config when auto-analyze is turned on in settings
- ✅ OpenAI-compatible analysis now uses real `chat/completions` network requests; Claude and Gemini continue to use their own live provider APIs
- ⚠️ The options page now supports basic app/provider editing, but the settings UI is still intentionally minimal for the MVP

## Tech stack

- Plasmo
- TypeScript
- React
- IndexedDB for bookmarks
- `chrome.storage.sync` for app/provider settings

## Quickstart

This repo is Plasmo-based. The environment used for this project has npm available, so the commands below use npm.

### 1. Install dependencies

```bash
npm install
```

### 2. Start extension development mode

```bash
npm run dev
```

Plasmo will build a development extension. After the first successful build, load the generated `build/chrome-mv3-dev` folder as an unpacked extension in Chromium-based browsers.

### 3. Load the dev extension in Chrome / Edge

1. Open `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `build/chrome-mv3-dev`

Open the TabVault popup from the extension toolbar to save and search bookmarks.

## Build, test, and typecheck

### Production build

```bash
npm run build
```

This writes the production extension to `build/chrome-mv3-prod`.

To load the production build manually, use **Load unpacked** and select `build/chrome-mv3-prod`.

### Typecheck

```bash
npm run typecheck
```

### Test

```bash
npx vitest run
```

## Provider keys and settings

TabVault stores settings in browser sync storage, not in a remote backend.

- App settings key: `app-settings`
- Provider configs key: `provider-configs`

Open the extension's **Options** page to edit the current MVP settings UI. The checked-in form supports:

- `defaultProvider`
- `autoAnalyzeOnSave`
- provider `enabled` toggle
- provider `apiKey`
- provider `model`
- OpenAI-compatible `baseUrl`

This settings UI is still basic on purpose: it focuses on direct editing of the stored values and does not yet add advanced validation, onboarding, or richer provider management flows.

If you want to seed values directly instead of using the options page, you can still write them from an extension page DevTools console:

```js
await chrome.storage.sync.set({
  "app-settings": {
    defaultProvider: "openai",
    autoAnalyzeOnSave: true
  },
  "provider-configs": [
    {
      provider: "openai",
      apiKey: "YOUR_KEY_HERE",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      enabled: true
    },
    {
      provider: "claude",
      apiKey: "YOUR_KEY_HERE",
      model: "claude-sonnet-4-5",
      enabled: false
    },
    {
      provider: "gemini",
      apiKey: "YOUR_KEY_HERE",
      model: "gemini-1.5-flash",
      enabled: false
    }
  ]
})
```

Current provider config shape:

- `provider`: `openai` | `claude` | `gemini`
- `apiKey`: provider key
- `baseUrl?`: optional override for OpenAI-compatible endpoints only
- `model`: provider-specific model name string (`gpt-*`, `claude-*`, `gemini-*`, etc.)
- `enabled`: whether the provider can be selected

Notes:

- The popup now routes provider selection through a shared factory and supports OpenAI-compatible, Claude, and Gemini analysis paths.
- The OpenAI-compatible provider now sends real network requests to `{baseUrl}/chat/completions` instead of returning stubbed output.
- Claude and Gemini remain available through their existing live API integrations; this phase specifically upgraded the OpenAI-compatible path.
- `defaultProvider` defaults to `openai`.
- `autoAnalyzeOnSave` defaults to `false`, so saving a page works without AI setup.
- The options page is now the primary way to switch default provider, toggle auto-analyze, and edit provider credentials/config for this MVP.

## Loading the built extension

After `npm run build`:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select `build/chrome-mv3-prod`

## Current limitations

- The checked-in options UI is a basic MVP form, not a polished/final settings experience.
- Provider configuration is still storage-driven under the hood via `chrome.storage.sync`; the UI is a thin editor over those values.
- There is no advanced validation, connection testing, provider-specific guidance, or non-provider settings management beyond the current basic form.
- Provider support is still MVP-level overall: OpenAI-compatible now has a real request path, but the extension still lacks richer provider UX such as connection testing and advanced validation.
