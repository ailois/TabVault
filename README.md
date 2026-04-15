# TabVault: Local-First AI Web Memory

The browser extension that helps you save, understand, and find web pages again—with your own API keys.

TabVault is designed for developers, researchers, and power users who need to process large amounts of web information locally without trusting another cloud service with their reading history.

## Why TabVault?

- **Save instantly:** Extract and store the full readable content of any tab locally in IndexedDB.
- **Understand quickly:** Automatically generate summaries and tags using OpenAI, Anthropic, or Google APIs.
- **Find again easily:** Search your local, fully-indexed reading history directly from the browser popup.

## Current MVP state

- ✅ Save the current tab from the popup
- ✅ Extract and store page title, URL, and captured content locally
- ✅ Search saved bookmarks in the popup
- ✅ Persist bookmarks in IndexedDB
- ✅ Persist app/provider settings in `chrome.storage.sync`
- ✅ Run AI analysis with an enabled OpenAI-compatible, Claude, or Gemini provider config when auto-analyze is turned on in settings
- ✅ OpenAI-compatible, Claude, and Gemini analysis all use real network request paths in the current implementation
- ⚠️ The options page now supports basic app/provider editing with synchronous validation that blocks obviously invalid provider configs before save, but the settings UI is still intentionally minimal for the MVP and does not yet include connection testing

## Tech stack

- Plasmo
- TypeScript
- React
- IndexedDB for bookmarks
- `chrome.storage.sync` for app/provider settings

## Quickstart

This repo is Plasmo-based. The environment used for this project has npm available, so the commands below use npm.

### 1. Install & Build

```bash
npm install
npm run dev
```

Plasmo will build a development extension. After the first successful build, load the generated `build/chrome-mv3-dev` folder as an unpacked extension in Chromium-based browsers.

### 2. Configure Your Provider

1. Open the extension's **Options** page.
2. Enter your API key for OpenAI, Claude, or Gemini.
3. Toggle "Auto-analyze on save" if you want AI summaries.

### 3. Save & Find Again

1. Click the TabVault extension icon on any useful page to save it.
2. Later, click the icon again and use the search bar to instantly find it based on its content or AI-generated tags.

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

## Documentation

- Manual testing guide: `docs/manual-testing.md`
- QA regression checklist: `docs/qa-checklist.md`
- Design and implementation plans: `docs/plans/`

## Trust & Privacy: Local-First with Bring-Your-Own-Key

TabVault is designed around a strict local-first architecture to protect your browsing data:

- **Local Storage Only:** Bookmarks, extracted page content, and AI summaries are stored exclusively on your machine in IndexedDB.
- **No Backend Accounts:** TabVault doesn't have a backend server for syncing or user accounts. Settings live entirely in browser sync storage.
- **Your API Keys:** You provide your own API keys for OpenAI, Anthropic, or Google. TabVault connects directly from your browser to these providers.
- **Transparency:** We do not proxy your requests. We do not store your keys in a central vault. What happens in your browser stays in your browser (and between you and your chosen AI provider).

Open the extension's **Options** page to edit the current MVP settings UI. The checked-in form supports:

- `defaultProvider`
- `autoAnalyzeOnSave`
- provider `enabled` toggle
- provider `apiKey`
- provider `model`
- OpenAI-compatible `baseUrl`

This settings UI is still basic on purpose: it focuses on direct editing of the stored values, now includes basic synchronous validation that blocks obviously invalid provider configs before save, and still does not include connection testing, onboarding, or richer provider management flows.

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
- `baseUrl?`: OpenAI-compatible endpoint URL; required when the OpenAI-compatible provider is enabled
- `model`: provider-specific model name string (`gpt-*`, `claude-*`, `gemini-*`, etc.)
- `enabled`: whether the provider can be selected

Notes:

- The popup now routes provider selection through a shared factory and supports OpenAI-compatible, Claude, and Gemini analysis paths.
- OpenAI-compatible sends real network requests to `{baseUrl}/chat/completions`, Claude sends real requests to Anthropic's messages API, and Gemini sends real requests to Google's generateContent API.
- Transport robustness is now aligned across all three providers, but provider support is still intentionally MVP-level overall.
- `defaultProvider` defaults to `openai`.
- `autoAnalyzeOnSave` defaults to `false`, so saving a page works without AI setup.
- The options page is now the primary way to switch default provider, toggle auto-analyze, and edit provider credentials/config for this MVP.
- Current validation is intentionally basic: it blocks obvious invalid states such as missing required enabled-provider fields, invalid enabled OpenAI-compatible base URLs, or a default provider that is not enabled.
- Connection testing is still not implemented.

## Loading the built extension

After `npm run build`:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select `build/chrome-mv3-prod`

## Current limitations

- The checked-in options UI is a basic MVP form, not a polished/final settings experience.
- Provider configuration is still storage-driven under the hood via `chrome.storage.sync`; the UI is a thin editor over those values.
- The current settings validation is intentionally basic and only blocks obvious invalid configs before save; there is still no connection testing, provider-specific guidance, or non-provider settings management beyond the current basic form.
- Provider support is still MVP-level overall even though all three providers now use real network request paths.
- The extension still lacks richer provider UX such as connection testing, deeper validation, onboarding help, and more polished provider management flows.
- Provider keys are user-managed on the client side for this MVP; that preserves the local-first model, but it is a deliberate tradeoff rather than a hardened secret-management story.
