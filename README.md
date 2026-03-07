# TabVault

Local-first AI bookmark browser extension built with Plasmo, TypeScript, and React.

TabVault lets you save the current page, keep bookmarks locally, search them in the popup, and optionally run AI summary/tag generation with your own provider key.

## 当前状态 / Current MVP state

- ✅ Save the current tab from the popup
- ✅ Extract and store page title, URL, and captured content locally
- ✅ Search saved bookmarks in the popup
- ✅ Persist bookmarks in IndexedDB
- ✅ Persist app/provider settings in `chrome.storage.sync`
- ✅ Run AI analysis with an enabled provider config when auto-analyze is turned on in settings data
- ⚠️ The options page exists, but the full settings form is not implemented yet

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

TabVault currently stores settings in browser sync storage, not in a remote backend.

- App settings key: `app-settings`
- Provider configs key: `provider-configs`

The checked-in options page is still a placeholder, so provider keys are **not** entered through a finished settings form yet. For the current MVP, seed settings manually from an extension page DevTools console:

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

Current provider config shape:

- `provider`: `openai` | `claude` | `gemini`
- `apiKey`: provider key
- `baseUrl?`: optional override for OpenAI-compatible endpoints
- `model`: model name to call
- `enabled`: whether the provider can be selected

Notes:

- The popup currently creates an OpenAI-compatible provider instance from the selected config.
- `defaultProvider` defaults to `openai`.
- `autoAnalyzeOnSave` defaults to `false`, so saving a page works without AI setup.

## Loading the built extension

After `npm run build`:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select `build/chrome-mv3-prod`

## Short roadmap note

Near-term follow-up work is to replace the placeholder options page with a real settings UI for provider management.
