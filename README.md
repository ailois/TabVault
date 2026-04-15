# TabVault: Local-First AI Web Memory

**The browser extension that helps you save, understand, and find web pages again—with your own API keys.**

## Who it's for

TabVault is designed for developers, researchers, and power users who need to process large amounts of web information locally without trusting another cloud service with their reading history.

## Why TabVault?

- **Save instantly:** Extract and store the full readable content of any tab locally in IndexedDB.
- **Understand quickly:** Automatically generate summaries and tags using OpenAI, Anthropic, or Google APIs.
- **Find again easily:** Search your local, fully-indexed reading history directly from the browser popup or sidepanel.

## Quickstart

1. **Install:** Download the extension and load it into your browser.
2. **Configure:** Open Options and enter your API key (OpenAI, Claude, or Gemini).
3. **Save:** Click the TabVault icon on any page to save and auto-analyze it.
4. **Find:** Open the Ghostreader sidepanel or Dashboard to search your saved library and chat with your pages.

## Trust FAQ

**Where is my data?**
All your bookmarks, extracted page content, and AI summaries are stored exclusively on your machine in IndexedDB. 

**Do I need an account?**
No. TabVault doesn't have a backend server for syncing or user accounts. Settings live entirely in browser sync storage.

**Which AI providers are supported?**
You can use OpenAI, Anthropic (Claude), or Google (Gemini) by providing your own API keys. TabVault connects directly from your browser to these providers.

**What does it cost to run?**
TabVault itself is free and runs locally. You only pay your chosen AI provider for the API requests made when analyzing pages or using Ghostreader.

## What it looks like (Demo Flow)

1. **Save a page:** Click the TabVault icon. The page is instantly saved locally.
2. **Wait for analysis:** If configured, TabVault automatically extracts the content and asks your chosen AI to summarize and tag it.
3. **Ask Ghostreader:** Open the sidepanel on any page. Ask a question, and TabVault will search your saved library and the current page to give you an answer.
4. **Browse your library:** Open the full Dashboard to see all your saved pages, read their summaries, and manage your knowledge base.

---

## Developer / Technical Details

### Tech stack

- Plasmo
- TypeScript
- React
- IndexedDB for bookmarks
- `chrome.storage.sync` for app/provider settings

### Build and Test

This repo is Plasmo-based. The environment used for this project has npm available, so the commands below use npm.

#### 1. Install & Build Development Version

```bash
npm install
npm run dev
```

Plasmo will build a development extension. After the first successful build, load the generated `build/chrome-mv3-dev` folder as an unpacked extension in Chromium-based browsers.

#### 2. Production build

```bash
npm run build
```

This writes the production extension to `build/chrome-mv3-prod`. To load the production build manually, use **Load unpacked** and select `build/chrome-mv3-prod`.

#### 3. Typecheck & Test

```bash
npm run typecheck
npx vitest run
```

### Documentation

- Manual testing guide: `docs/manual-testing.md`
- QA regression checklist: `docs/qa-checklist.md`
- Productization validation report: `docs/productization-validation-report.md`
- Design and implementation plans: `docs/plans/`
- Product Assets Checklist: `docs/product-assets-checklist.md`

### Current MVP state & Limitations

- ✅ Save the current tab from the popup
- ✅ Extract and store page title, URL, and captured content locally
- ✅ Search saved bookmarks in the popup
- ✅ Persist bookmarks in IndexedDB
- ✅ Persist app/provider settings in `chrome.storage.sync`
- ✅ Run AI analysis with an enabled OpenAI-compatible, Claude, or Gemini provider config
- ⚠️ The options page supports basic app/provider editing with synchronous validation, but does not yet include connection testing.
- Provider configuration is storage-driven under the hood via `chrome.storage.sync`; the UI is a thin editor over those values.
- Provider keys are user-managed on the client side for this MVP; that preserves the local-first model, but it is a deliberate tradeoff rather than a hardened secret-management story.

If you want to seed values directly instead of using the options page, you can write them from an extension page DevTools console:

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
    }
  ]
})
```
