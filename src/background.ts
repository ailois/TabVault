import { importChromeBookmarks } from "./features/bookmarks/import-chrome-bookmarks"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import { analyzeBookmark } from "./features/ai/analyze-bookmark"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import { createProvider } from "./lib/providers/provider-factory"
import { TrialRepository } from "./lib/trial/trial-repository"
import { getTrialStatus } from "./lib/trial/get-trial-status"
import { getBuiltInKeyConfig } from "./lib/trial/built-in-key"

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

async function retryErrorQueue() {
  const bookmarks = await repo.list()
  const errorBookmarks = bookmarks.filter(b => b.status === "error")
  if (errorBookmarks.length === 0) return

  const settings = await settingsRepo.getAppSettings()
  if (!settings.autoRetryOnError) return

  const providers = await settingsRepo.getProviders()
  const selectedProvider = providers.find(p => p.enabled && p.provider === settings.defaultProvider)
  if (!selectedProvider?.apiKey.trim()) return

  const provider = createProvider(selectedProvider)

  for (const bookmark of errorBookmarks) {
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
      // leave as error, will retry next time
    }
  }
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
        sendResponse({ success: false, error: serializeBackgroundError(error) })
      })
    return true // Keep message channel open for async response
  }

  if (message.type === "ANALYZE_ALL") {
    processAnalysisQueue()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: serializeBackgroundError(error) }))
    return true
  }

  if (message.type === "TRIAL_ANALYZE") {
    const { bookmark } = message
    const trialRepo = new TrialRepository()

    void (async () => {
      const trialState = await trialRepo.get()

      if (!trialState) {
        sendResponse({ success: false, error: "Trial not initialized" })
        return
      }

      const status = getTrialStatus(trialState)
      if (status === "expired") {
        sendResponse({ success: false, error: "Trial expired" })
        return
      }

      const builtInConfig = getBuiltInKeyConfig()
      if (!builtInConfig.enabled) {
        sendResponse({ success: false, error: "Built-in key not configured" })
        return
      }

      try {
        const provider = createProvider(builtInConfig)
        const bookmarkRepo = new IndexedDbBookmarkRepository()
        await analyzeBookmark({ bookmark, provider, bookmarkRepository: bookmarkRepo })
        await trialRepo.incrementAnalysisUsed()
        sendResponse({ success: true })
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : "Analysis failed" })
      }
    })()

    return true
  }

  if (message.type === "GET_ANALYSIS_STATUS") {
    sendResponse({ running: analysisRunning, current: analysisCurrent, total: analysisTotal })
    return false
  }
})

// --- Chrome Bookmark Event Listeners for live sync ---
if (globalThis.chrome?.bookmarks) {
  chrome.bookmarks.onCreated.addListener(async (_id, bookmark) => {
    if (bookmark.url) {
      const now = new Date().toISOString()
      const newRecord = {
        id: bookmark.id,
        parentId: bookmark.parentId,
        url: bookmark.url,
        title: bookmark.title || "",
        aiTags: [],
        userTags: [],
        status: "saved" as const,
        createdAt: now,
        updatedAt: now
      }
      await repo.save(newRecord)

      // Check if auto-analyze is enabled
      try {
        const settings = await settingsRepo.getAppSettings()
        if (settings.autoAnalyzeOnSave) {
          processAnalysisQueue()
        }
      } catch {
        // Settings not configured yet, skip auto-analyze
      }
    }
    chrome.runtime.sendMessage({ type: "BOOKMARKS_CHANGED" }).catch(() => {})
  })

  chrome.bookmarks.onRemoved.addListener(async (id) => {
    try {
      await repo.delete(id)
    } catch {
      // Ignore if not found in IndexedDB
    }
    chrome.runtime.sendMessage({ type: "BOOKMARKS_CHANGED" }).catch(() => {})
  })

  chrome.bookmarks.onChanged.addListener(() => {
    chrome.runtime.sendMessage({ type: "BOOKMARKS_CHANGED" }).catch(() => {})
  })

  chrome.bookmarks.onMoved.addListener(() => {
    chrome.runtime.sendMessage({ type: "BOOKMARKS_CHANGED" }).catch(() => {})
  })
}

chrome.runtime.onStartup.addListener(() => {
  void retryErrorQueue()
})

chrome.runtime.onInstalled.addListener(() => {
  void retryErrorQueue()
  if (globalThis.chrome?.bookmarks) {
    importChromeBookmarks({
      getTree: async () => chrome.bookmarks.getTree(),
      bookmarkRepository: repo
    })
      .then(count => {
        chrome.runtime.sendMessage({ type: "IMPORT_COMPLETE", count }).catch(() => {})
      })
      .catch(() => {})
  }
})

function serializeBackgroundError(error: unknown): string {
  return error instanceof Error ? error.message : "Analysis failed"
}
