import { importChromeBookmarks } from "./features/bookmarks/import-chrome-bookmarks"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import { analyzeBookmark } from "./features/ai/analyze-bookmark"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import { createProvider } from "./lib/providers/provider-factory"

const repo = new IndexedDbBookmarkRepository()
const settingsRepo = new ChromeSettingsRepository()

let analysisRunning = false
let analysisCurrent = 0
let analysisTotal = 0

async function processAnalysisQueue() {
  if (analysisRunning) return // Prevent concurrent runs

  const bookmarks = await repo.list()
  const pending = bookmarks.filter(b => b.status === "saved" || b.status === "error")

  if (pending.length === 0) return

  const settings = await settingsRepo.getAppSettings()
  const providers = await settingsRepo.getProviders()
  const selectedProvider = providers.find(p => p.enabled && p.provider === settings.defaultProvider)

  if (!selectedProvider?.apiKey.trim()) return

  const provider = createProvider(selectedProvider)

  analysisRunning = true
  analysisTotal = pending.length
  analysisCurrent = 0

  for (let i = 0; i < pending.length; i++) {
    const bookmark = pending[i]!
    analysisCurrent = i + 1

    // Notify frontend
    chrome.runtime.sendMessage({
      type: "ANALYSIS_PROGRESS",
      current: analysisCurrent,
      total: analysisTotal,
      bookmarkId: bookmark.id
    }).catch(() => {}) // Ignore if no listener

    try {
      const response = await fetch(bookmark.url)
      const html = await response.text()
      const textContent = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').slice(0, 10000)

      await analyzeBookmark({
        bookmark,
        provider,
        bookmarkRepository: repo,
        contentOverride: textContent,
        summaryLanguage: settings.summaryLanguage
      })
    } catch {
      // Errors are handled by analyzeBookmark internally
    }
  }

  analysisRunning = false
  analysisCurrent = 0
  analysisTotal = 0

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

  if (message.type === "GET_ANALYSIS_STATUS") {
    sendResponse({ running: analysisRunning, current: analysisCurrent, total: analysisTotal })
    return false
  }
})
