import { importChromeBookmarks } from "./features/bookmarks/import-chrome-bookmarks"
import { createGhostreaderBookmarkAddedMessage } from "./features/ghostreader-session/ghostreader-bookmark-events"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import { analyzeBookmark } from "./features/ai/analyze-bookmark"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import { createProvider } from "./lib/providers/provider-factory"
import { TrialRepository } from "./lib/trial/trial-repository"
import { getTrialStatus } from "./lib/trial/get-trial-status"
import { getBuiltInKeyConfig } from "./lib/trial/built-in-key"
import { INTERNAL_ERROR_MESSAGES } from "./lib/i18n/error-messages"
import type { BookmarkRecord } from "./types/bookmark"

const repo = new IndexedDbBookmarkRepository()
const settingsRepo = new ChromeSettingsRepository()
const FETCH_TIMEOUT_MS = 15000
const ANALYSIS_TIMEOUT_MS = 45000
const ANALYSIS_TIMEOUT_MESSAGE = "Analysis timed out"

let analysisRunning = false
let analysisCurrent = 0
let analysisTotal = 0

async function createAnalysisProvider() {
  const settings = await settingsRepo.getAppSettings()
  const providers = await settingsRepo.getProviders()
  const selectedProvider = providers.find(p => p.enabled && p.provider === settings.defaultProvider)

  if (!selectedProvider?.apiKey.trim()) {
    throw new Error("No enabled provider configured")
  }

  return {
    provider: createProvider(selectedProvider),
    summaryLanguage: settings.summaryLanguage
  }
}

async function runAnalysisQueue(queue: BookmarkRecord[]) {
  if (analysisRunning) {
    throw new Error("Analysis already running")
  }

  if (queue.length === 0) return

  const { provider, summaryLanguage } = await createAnalysisProvider()

  analysisRunning = true
  analysisTotal = queue.length
  analysisCurrent = 0

  try {
    for (let i = 0; i < queue.length; i++) {
      const bookmark = queue[i]!
      analysisCurrent = i + 1

      chrome.runtime.sendMessage({
        type: "ANALYSIS_PROGRESS",
        current: analysisCurrent,
        total: analysisTotal,
        bookmarkId: bookmark.id
      }).catch(() => {})

      try {
        await analyzeSingleBookmark(bookmark, provider, summaryLanguage)
      } catch {
        // Errors are handled by analyzeBookmark internally.
      }

      chrome.runtime.sendMessage({ type: "BOOKMARKS_CHANGED" }).catch(() => {})
    }
  } finally {
    analysisRunning = false
    analysisCurrent = 0
    analysisTotal = 0
  }

  chrome.runtime.sendMessage({ type: "ANALYSIS_COMPLETE" }).catch(() => {})
}

async function processAnalysisQueue() {
  const bookmarks = await repo.list()
  await runAnalysisQueue(bookmarks)
}

async function processPendingAnalysisQueue() {
  const bookmarks = await repo.list()
  const pending = bookmarks.filter((bookmark) => bookmark.status === "saved" || bookmark.status === "error")
  await runAnalysisQueue(pending)
}

async function processSelectedAnalysisQueue(bookmarkIds: string[]) {
  const ids = new Set(bookmarkIds)
  if (ids.size === 0) return

  const bookmarks = await repo.list()
  const selected = bookmarks.filter((bookmark) => ids.has(bookmark.id))
  await runAnalysisQueue(selected)
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
      await analyzeSingleBookmark(bookmark, provider, settings.summaryLanguage)
    } catch {
      // leave as error, will retry next time
    }
  }
}

async function analyzeSingleBookmark(
  bookmark: BookmarkRecord,
  provider: ReturnType<typeof createProvider>,
  summaryLanguage: Awaited<ReturnType<typeof settingsRepo.getAppSettings>>["summaryLanguage"]
) {
  try {
    const textContent = await fetchBookmarkTextContent(bookmark.url)
    await withTimeout(
      analyzeBookmark({
        bookmark,
        provider,
        bookmarkRepository: repo,
        contentOverride: textContent,
        summaryLanguage
      }),
      ANALYSIS_TIMEOUT_MS
    )
  } catch (error) {
    if (isTimeoutError(error)) {
      await repo.update({
        ...bookmark,
        status: "error",
        errorMessage: ANALYSIS_TIMEOUT_MESSAGE,
        updatedAt: new Date().toISOString()
      })
    }

    throw error
  }
}

async function fetchBookmarkTextContent(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    const html = await response.text()
    return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").slice(0, 10000)
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = globalThis.setTimeout(() => reject(new Error(ANALYSIS_TIMEOUT_MESSAGE)), timeoutMs)
      })
    ])
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId)
    }
  }
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (
    error.message === ANALYSIS_TIMEOUT_MESSAGE ||
    error.name === "AbortError"
  )
}

function notifyBookmarkAdded(
  bookmark: Pick<BookmarkRecord, "id" | "title" | "url">,
  source: "manual" | "page-save" | "session-action"
) {
  chrome.runtime.sendMessage(
    createGhostreaderBookmarkAddedMessage({
      bookmarkId: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      source
    })
  ).catch(() => {})
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "IMPORT_BOOKMARKS") {
    importChromeBookmarks({
      getTree: async () => chrome.bookmarks.getTree(),
      bookmarkRepository: repo,
      onBookmarkImported: async (bookmark) => {
        notifyBookmarkAdded(bookmark, "manual")
      }
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

  if (message.type === "ANALYZE_PENDING") {
    processPendingAnalysisQueue()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: serializeBackgroundError(error) }))
    return true
  }

  if (message.type === "ANALYZE_BOOKMARKS") {
    processSelectedAnalysisQueue(Array.isArray(message.bookmarkIds) ? message.bookmarkIds : [])
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
        sendResponse({ success: false, error: INTERNAL_ERROR_MESSAGES.trialNotInitialized })
        return
      }

      const status = getTrialStatus(trialState)
      if (status === "expired") {
        sendResponse({ success: false, error: INTERNAL_ERROR_MESSAGES.trialExpired })
        return
      }

      const builtInConfig = getBuiltInKeyConfig()
      if (!builtInConfig.enabled) {
        sendResponse({ success: false, error: INTERNAL_ERROR_MESSAGES.builtInKeyNotConfigured })
        return
      }

      try {
        const provider = createProvider(builtInConfig)
        const bookmarkRepo = new IndexedDbBookmarkRepository()
        await analyzeBookmark({ bookmark, provider, bookmarkRepository: bookmarkRepo })
        await trialRepo.incrementAnalysisUsed()
        sendResponse({ success: true })
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : INTERNAL_ERROR_MESSAGES.analysisFailed })
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
      notifyBookmarkAdded(newRecord, "manual")

      // Check if auto-analyze is enabled
      try {
        const settings = await settingsRepo.getAppSettings()
        if (settings.autoAnalyzeOnSave) {
          processPendingAnalysisQueue()
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
      bookmarkRepository: repo,
      onBookmarkImported: async (bookmark) => {
        notifyBookmarkAdded(bookmark, "manual")
      }
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
