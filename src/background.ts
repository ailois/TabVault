import { importChromeBookmarks } from "./features/bookmarks/import-chrome-bookmarks"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import { analyzeBookmark } from "./features/ai/analyze-bookmark"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import { createProvider } from "./lib/providers/provider-factory"

const repo = new IndexedDbBookmarkRepository()
const settingsRepo = new ChromeSettingsRepository()

async function processAnalysisQueue() {
  const bookmarks = await repo.list()
  const pending = bookmarks.filter(b => b.status === "saved" || b.status === "error")

  if (pending.length === 0) return

  const settings = await settingsRepo.getAppSettings()
  const providers = await settingsRepo.getProviders()
  const selectedProvider = providers.find(p => p.enabled && p.provider === settings.defaultProvider)

  if (!selectedProvider?.apiKey.trim()) return

  const provider = createProvider(selectedProvider)

  for (let i = 0; i < pending.length; i++) {
    const bookmark = pending[i]!

    // Notify frontend
    chrome.runtime.sendMessage({
      type: "ANALYSIS_PROGRESS",
      current: i + 1,
      total: pending.length,
      bookmarkId: bookmark.id
    }).catch(() => {}) // Ignore if Side Panel is closed

    try {
      // 1. Fetch raw HTML content
      const response = await fetch(bookmark.url)
      const html = await response.text()
      // Extremely basic content extraction for background: just strip tags
      const textContent = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').slice(0, 10000)

      // 2. Analyze
      await analyzeBookmark({
        bookmark,
        provider,
        bookmarkRepository: repo,
        contentOverride: textContent // We need to update analyzeBookmark to accept an override or pass it here
      })
    } catch {
      // Errors are handled by analyzeBookmark internally
    }
  }

  chrome.runtime.sendMessage({ type: "ANALYSIS_COMPLETE" }).catch(() => {})
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "IMPORT_BOOKMARKS") {
    importChromeBookmarks({
      getTree: async () => chrome.bookmarks.getTree(),
      bookmarkRepository: repo
    })
      .then(count => {
        sendResponse({ success: true, count })
        chrome.runtime.sendMessage({ type: "IMPORT_COMPLETE", count })
      })
      .catch(error => {
        sendResponse({ success: false, error: String(error) })
      })
    return true // Keep message channel open for async response
  }

  if (message.type === "ANALYZE_ALL") {
    processAnalysisQueue()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: String(err) }))
    return true
  }
})
