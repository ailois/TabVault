// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DashboardShell } from "../../src/features/dashboard/dashboard-shell"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import type { AiProvider } from "../../src/lib/providers/provider"
import type { BookmarkRecord } from "../../src/types/bookmark"
import type { ProviderConfig } from "../../src/types/settings"
import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let storageChangeListener: ((changes: Record<string, chrome.storage.StorageChange>, areaName?: string) => void) | null = null
let runtimeMessageListener: ((message: Record<string, unknown>) => void) | null = null
const openOptionsPageMock = vi.fn(async () => undefined)
const sendMessageMock = vi.fn(async (message?: { type?: string }) =>
  message?.type === "GET_ANALYSIS_STATUS" ? { running: false, current: 0, total: 0 } : { success: true }
)

globalThis.chrome = {
  ...(globalThis.chrome ?? {}),
  storage: {
    ...((globalThis.chrome as any)?.storage ?? {}),
    onChanged: {
      addListener: (listener: (changes: Record<string, chrome.storage.StorageChange>, areaName?: string) => void) => {
        storageChangeListener = listener
      },
      removeListener: (listener: (changes: Record<string, chrome.storage.StorageChange>, areaName?: string) => void) => {
        if (storageChangeListener === listener) {
          storageChangeListener = null
        }
      }
    }
  },
  runtime: {
    sendMessage: sendMessageMock,
    openOptionsPage: openOptionsPageMock,
    onMessage: {
      addListener: (listener: (message: Record<string, unknown>) => void) => {
        runtimeMessageListener = listener
      },
      removeListener: (listener: (message: Record<string, unknown>) => void) => {
        if (runtimeMessageListener === listener) {
          runtimeMessageListener = null
        }
      }
    }
  }
} as any

const SAMPLE_TREE: chrome.bookmarks.BookmarkTreeNode[] = [
  {
    id: "0",
    title: "",
    syncing: false,
    children: [
      {
        id: "1",
        title: "Bookmarks Bar",
        syncing: false,
        children: [
          { id: "b1", title: "React Docs", url: "https://react.dev", syncing: false },
          { id: "b2", title: "Vue Docs", url: "https://vuejs.org", syncing: false }
        ]
      },
      {
        id: "2",
        title: "Other Bookmarks",
        syncing: false,
        children: [{ id: "b3", title: "Svelte Docs", url: "https://svelte.dev", syncing: false }]
      }
    ]
  }
]

const NESTED_FOLDER_TREE: chrome.bookmarks.BookmarkTreeNode[] = [
  {
    id: "0",
    title: "",
    syncing: false,
    children: [
      {
        id: "1",
        title: "Bookmarks Bar",
        syncing: false,
        children: [
          {
            id: "10",
            title: "Frontend",
            syncing: false,
            children: [{ id: "b10", title: "React Docs", url: "https://react.dev", syncing: false }]
          }
        ]
      }
    ]
  }
]

describe("DashboardShell", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount()
      })
    }
    container?.remove()
    container = null
    root = null
    storageChangeListener = null
    runtimeMessageListener = null
    sendMessageMock.mockClear()
    openOptionsPageMock.mockClear()
  })

  it("renders a dashboard folder tree and updates results when a folder is selected", async () => {
    const bookmarks = [
      createBookmark({ id: "b1", title: "React Docs", url: "https://react.dev" }),
      createBookmark({ id: "b2", title: "Vue Docs", url: "https://vuejs.org" }),
      createBookmark({ id: "b3", title: "Svelte Docs", url: "https://svelte.dev" })
    ]

    await renderDashboardWithTree(bookmarks, SAMPLE_TREE)

    expect(container?.querySelector('[data-testid="dashboard-folder-tree"]')).not.toBeNull()
    expect(container?.textContent).toContain("React Docs")
    expect(container?.textContent).toContain("Vue Docs")

    const otherBookmarks = container?.querySelector<HTMLElement>("[data-testid='dashboard-folder-2']")
    await act(async () => {
      ;(otherBookmarks as HTMLElement | undefined)?.click()
    })

    expect(container?.textContent).toContain("Svelte Docs")
    expect(container?.textContent).not.toContain("React Docs")
  })

  it("loads bookmarks and browser folders into the dashboard workspace", async () => {
    const bookmarks = [createBookmark({ id: "b1", title: "React Docs", url: "https://react.dev" })]
    await renderDashboardWithTree(bookmarks, SAMPLE_TREE)

    expect(container?.querySelector('[data-testid="dashboard-navigation"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="dashboard-folder-tree"]')).not.toBeNull()
  })

  it("allows dashboard folders to collapse and expand", async () => {
    const bookmarks = [createBookmark({ id: "b10", title: "React Docs", url: "https://react.dev" })]
    await renderDashboardWithTree(bookmarks, NESTED_FOLDER_TREE)

    expect(container?.querySelector("[data-testid='dashboard-folder-10']")?.textContent).toContain("Frontend")

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-folder-toggle-1']")?.click()
    })

    expect(container?.querySelector("[data-testid='dashboard-folder-10']")).toBeNull()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-folder-toggle-1']")?.click()
    })

    expect(container?.querySelector("[data-testid='dashboard-folder-10']")?.textContent).toContain("Frontend")
  })

  it("renders design-aligned dashboard with browse and reading views", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs" })])

    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-shell']")).not.toBeNull()
    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-browse-view']")).not.toBeNull()
    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-navigation']")).not.toBeNull()
    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-results-column']")).not.toBeNull()
    expect(container?.querySelector<HTMLElement>("[data-testid='dashboard-reading-pane']")).not.toBeNull()
  })

  it("shows an empty reading state when no bookmark is selected", async () => {
    await renderDashboard([])

    expect(container?.textContent).toContain("Select a bookmark to start reading")
  })

  it("renders localized dashboard copy when display language is zh", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs" })], undefined, createSettingsRepository("zh"))

    expect(container?.textContent).toContain("\u77e5\u8bc6\u5e93")
    expect(container?.querySelector<HTMLInputElement>("[data-testid='dashboard-search-input']")?.placeholder).toContain("\u641c\u7d22\u6807\u9898")
  })

  it("reacts to synced display language changes after mount", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs" })], undefined, createSettingsRepository("en"))

    await act(async () => {
      storageChangeListener?.({
        "app-settings": {
          oldValue: { displayLanguage: "en" },
          newValue: { displayLanguage: "zh" }
        } as chrome.storage.StorageChange
      }, "sync")
    })

    expect(container?.querySelector<HTMLInputElement>("[data-testid='dashboard-search-input']")?.placeholder).toContain("\u641c\u7d22\u6807\u9898")
  })

  it("switches the dashboard results column to search mode when typing", async () => {
    const bookmarks = [
      createBookmark({ id: "b1", title: "React Docs", url: "https://react.dev" }),
      createBookmark({ id: "b2", title: "Vue Docs", url: "https://vuejs.org" }),
      createBookmark({ id: "b3", title: "Svelte Docs", url: "https://svelte.dev" })
    ]
    await renderDashboard(bookmarks)

    const searchInput = container?.querySelector<HTMLInputElement>('[data-testid="dashboard-search-input"]')
    expect(searchInput).not.toBeNull()

    await act(async () => {
      Object.defineProperty(searchInput, "value", { writable: true, value: "svelte" })
      searchInput?.dispatchEvent(new Event("change", { bubbles: true }))
    })

    expect(container?.textContent).toContain("Svelte Docs")
    expect(container?.textContent).not.toContain("React Docs")
  })

  it("shows analysis status chips and filters by analyzed state", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", status: "done", url: "https://react.dev" }),
      createBookmark({ id: "2", title: "Vue Docs", status: "saved", url: "https://vuejs.org" }),
      createBookmark({ id: "3", title: "Svelte Docs", status: "error", url: "https://svelte.dev" })
    ])

    expect(container?.querySelector("[data-testid='dashboard-status-1']")?.textContent).toContain("Analyzed")
    expect(container?.querySelector("[data-testid='dashboard-status-2']")?.textContent).toContain("Saved")
    expect(container?.querySelector("[data-testid='dashboard-status-3']")?.textContent).toContain("Error")

    const unanalyzedFilter = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-filter-unanalyzed']")
    await act(async () => {
      unanalyzedFilter?.click()
    })

    expect(container?.textContent).toContain("Vue Docs")
    expect(container?.textContent).toContain("Svelte Docs")
    expect(container?.textContent).not.toContain("React Docs")
  })

  it("dispatches dashboard bulk analysis actions through runtime messaging", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", status: "saved", url: "https://react.dev" }),
      createBookmark({ id: "2", title: "Vue Docs", status: "done", url: "https://vuejs.org" })
    ])
    sendMessageMock.mockClear()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-analyze-all']")?.click()
    })
    await act(async () => {
      runtimeMessageListener?.({ type: "ANALYSIS_COMPLETE" })
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-analyze-unanalyzed']")?.click()
    })
    await act(async () => {
      runtimeMessageListener?.({ type: "ANALYSIS_COMPLETE" })
    })

    await act(async () => {
      container?.querySelector<HTMLInputElement>("[data-testid='dashboard-select-1']")?.click()
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-analyze-selected']")?.click()
    })

    expect(sendMessageMock.mock.calls.map((call) => call[0])).toEqual([
      { type: "ANALYZE_ALL" },
      { type: "ANALYZE_PENDING" },
      { type: "ANALYZE_BOOKMARKS", bookmarkIds: ["1"] }
    ])
  })

  it("updates dashboard progress state from analysis runtime events", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", status: "saved", url: "https://react.dev" }),
      createBookmark({ id: "2", title: "Vue Docs", status: "saved", url: "https://vuejs.org" })
    ])

    await act(async () => {
      runtimeMessageListener?.({ type: "ANALYSIS_PROGRESS", current: 1, total: 2, bookmarkId: "2" })
    })

    expect(container?.querySelector("[data-testid='dashboard-analysis-progress']")?.textContent).toContain("Analyzing 1/2")
    expect(container?.querySelector("[data-testid='dashboard-status-2']")?.textContent).toContain("Analyzing")
  })

  it("does not leave bulk analysis stuck running after completion arrives before the runtime response resolves", async () => {
    let resolveAnalyzeRequest: ((value: { success: true }) => void) | null = null
    sendMessageMock.mockImplementation((message?: { type?: string }) => {
      if (message?.type === "GET_ANALYSIS_STATUS") {
        return Promise.resolve({ running: false, current: 0, total: 0 })
      }

      return new Promise((resolve) => {
        resolveAnalyzeRequest = () => resolve({ success: true })
      })
    })

    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", status: "error", url: "https://react.dev" }),
      createBookmark({ id: "2", title: "Vue Docs", status: "done", url: "https://vuejs.org" })
    ])

    await act(async () => {
      container?.querySelector<HTMLInputElement>("[data-testid='dashboard-select-1']")?.click()
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-analyze-selected']")?.click()
    })

    expect(container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-analyze-selected']")?.disabled).toBe(true)

    await act(async () => {
      runtimeMessageListener?.({ type: "ANALYSIS_COMPLETE" })
    })

    expect(container?.querySelector("[data-testid='dashboard-analysis-progress']")).toBeNull()
    expect(container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-analyze-selected']")?.disabled).toBe(false)

    await act(async () => {
      resolveAnalyzeRequest?.({ success: true })
      await Promise.resolve()
    })

    expect(container?.querySelector("[data-testid='dashboard-analysis-progress']")).toBeNull()
    expect(container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-analyze-selected']")?.disabled).toBe(true)

    await act(async () => {
      container?.querySelector<HTMLInputElement>("[data-testid='dashboard-select-1']")?.click()
    })

    expect(container?.querySelector("[data-testid='dashboard-analysis-progress']")).toBeNull()
    expect(container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-analyze-selected']")?.disabled).toBe(false)
  })

  it("forwards bookmark-added runtime events into dashboard Ghostreader session context", async () => {
    const analyze = vi.fn(async () => ({ summary: "Dashboard session-aware answer", tags: [] }))
    const settingsRepository: SettingsRepository = {
      getAppSettings: async () => ({
        defaultProvider: "openai",
        autoAnalyzeOnSave: false,
        summaryLanguage: "auto",
        autoRetryOnError: false,
        displayLanguage: "en",
        theme: "sage"
      }),
      saveAppSettings: async () => {},
      getProviders: async () => [
        {
          provider: "openai",
          enabled: true,
          apiKey: "test-key",
          model: "gpt-test"
        }
      ],
      saveProviders: async () => {}
    }

    await renderDashboard(
      [createBookmark({ id: "1", title: "React Docs", url: "https://react.dev", extractedText: "React content" })],
      undefined,
      settingsRepository,
      vi.fn((_config: ProviderConfig): AiProvider => ({ analyze }))
    )

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")?.click()
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ai-tab']")?.click()
    })
    await act(async () => {
      runtimeMessageListener?.({
        type: "BOOKMARK_ADDED",
        bookmarkId: "bm-yangmi",
        title: "Yang Mi interview archive",
        url: "https://yangmi.example",
        source: "page-save"
      })
    })

    const askInput = container?.querySelector<HTMLInputElement>("[data-testid='dashboard-ask-input']")
    await act(async () => {
      Object.defineProperty(askInput, "value", { writable: true, value: "What bookmark did I just save?" })
      askInput?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ask-submit']")?.click()
    })

    const analyzeInput = analyze.mock.calls.at(0)?.at(0) as { content: string } | undefined
    expect(analyzeInput?.content).toContain("Yang Mi interview archive")
    expect(analyzeInput?.content).toContain("https://yangmi.example")
  })

  it("marks the selected result with accessible current-state semantics", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", url: "https://react.dev" }),
      createBookmark({ id: "2", title: "Vue Docs", url: "https://vuejs.org" })
    ])

    const resultButtons = Array.from(
      container?.querySelectorAll<HTMLButtonElement>("[data-testid='dashboard-result-button']") ?? []
    )
    const vueButton = resultButtons.find((element) => element.textContent?.includes("Vue Docs"))
    const reactButton = resultButtons.find((element) => element.textContent?.includes("React Docs"))

    expect(vueButton?.getAttribute("aria-pressed")).toBe("false")
    expect(vueButton?.getAttribute("aria-current")).toBeNull()

    await act(async () => {
      vueButton?.click()
    })

    const updatedButtons = Array.from(
      container?.querySelectorAll<HTMLButtonElement>("[data-testid='dashboard-result-button']") ?? []
    )
    const updatedVueButton = updatedButtons.find((element) => element.textContent?.includes("Vue Docs"))
    const updatedReactButton = updatedButtons.find((element) => element.textContent?.includes("React Docs"))

    expect(updatedVueButton?.getAttribute("aria-pressed")).toBe("true")
    expect(updatedVueButton?.getAttribute("aria-current")).toBe("true")
    expect(updatedReactButton?.getAttribute("aria-pressed")).toBe("false")
    expect(updatedReactButton?.getAttribute("aria-current")).toBeNull()
    expect(reactButton).not.toBeNull()
  })

  it("keeps the reading pane visible when only one bookmark is batch-selected", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", extractedText: "React content" }),
      createBookmark({ id: "2", title: "Vue Docs", extractedText: "Vue content" })
    ])

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")?.click()
    })

    expect(container?.querySelector('[data-testid="dashboard-reading-pane"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="dashboard-bulk-edit-view"]')).toBeNull()

    await act(async () => {
      container?.querySelector<HTMLInputElement>("[data-testid='dashboard-select-1']")?.click()
    })

    expect(container?.querySelector('[data-testid="dashboard-reading-pane"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="dashboard-bulk-edit-view"]')).toBeNull()
    expect(container?.textContent).toContain("React Docs")
  })

  it("keeps the reading pane visible when multiple bookmarks are batch-selected", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", extractedText: "React content" }),
      createBookmark({ id: "2", title: "Vue Docs", extractedText: "Vue content" })
    ])

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")?.click()
    })

    expect(container?.querySelector('[data-testid="dashboard-reading-pane"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="dashboard-bulk-edit-view"]')).toBeNull()
    expect(container?.textContent).toContain("React Docs")

    await act(async () => {
      container?.querySelector<HTMLInputElement>("[data-testid='dashboard-select-1']")?.click()
    })
    await act(async () => {
      container?.querySelector<HTMLInputElement>("[data-testid='dashboard-select-2']")?.click()
    })

    expect(container?.querySelector('[data-testid="dashboard-reading-pane"]')).not.toBeNull()
    expect(container?.querySelector('[data-testid="dashboard-bulk-edit-view"]')).toBeNull()
    expect(container?.textContent).toContain("2 selected")
    expect(container?.textContent).toContain("React Docs")
  })

  it("styles navigation items and reading metadata closer to the design", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", extractedText: "React lets you build UIs." })
    ])

    const resultButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")
    await act(async () => {
      resultButton?.click()
    })

    const metadata = container?.querySelector<HTMLElement>("[data-testid='dashboard-reading-metadata']")
    expect(resultButton).not.toBeNull()
    expect(metadata).not.toBeNull()
    expect(metadata?.style.borderBottom).toContain("1px solid")
  })

  it("uses recents and highlights navigation entries as active filters", async () => {
    await renderDashboard([
      createBookmark({
        id: "1",
        title: "Old Bookmark",
        summary: "",
        updatedAt: "2026-03-01T00:00:00.000Z"
      }),
      createBookmark({
        id: "2",
        title: "Recent Highlight",
        summary: "Saved summary",
        updatedAt: "2026-04-01T00:00:00.000Z"
      })
    ])

    const recentsButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-nav-recents']")
    const highlightsButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-nav-highlights']")

    expect(recentsButton?.disabled).toBe(false)
    expect(highlightsButton?.disabled).toBe(false)

    await act(async () => {
      recentsButton?.click()
    })

    const resultButtons = Array.from(
      container?.querySelectorAll<HTMLButtonElement>("[data-testid='dashboard-result-button']") ?? []
    )
    expect(resultButtons.at(0)?.textContent).toContain("Recent Highlight")

    await act(async () => {
      highlightsButton?.click()
    })

    expect(container?.textContent).toContain("Recent Highlight")
    expect(container?.textContent).not.toContain("Old Bookmark")
  })

  it("updates the dashboard heading for recents and highlights views", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "Old Bookmark", updatedAt: "2026-03-01T00:00:00.000Z" }),
      createBookmark({ id: "2", title: "Recent Highlight", summary: "Saved summary", updatedAt: "2026-04-01T00:00:00.000Z" })
    ])

    expect(container?.querySelector("h2")?.textContent).toContain("All bookmarks")

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-nav-recents']")?.click()
    })

    expect(container?.querySelector("h2")?.textContent).toContain("Recents")

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-nav-highlights']")?.click()
    })

    expect(container?.querySelector("h2")?.textContent).toContain("Highlights")
  })

  it("opens settings from the dashboard navigation", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs" })])

    const settingsButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-nav-settings']")

    expect(settingsButton?.disabled).toBe(false)

    await act(async () => {
      settingsButton?.click()
    })

    expect(openOptionsPageMock).toHaveBeenCalledOnce()
  })

  it("replaces dashboard placeholder letters with icon affordances", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "React Docs", extractedText: "React lets you build UIs." })])

    const searchIcon = container?.querySelector("[data-testid='dashboard-search-icon']")
    expect(searchIcon).not.toBeNull()
    expect(searchIcon?.querySelector("svg")).not.toBeNull()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")?.click()
    })

    const openButton = container?.querySelector("[data-testid='dashboard-reading-open']")
    expect(openButton).not.toBeNull()
    expect(openButton?.querySelector("svg")).not.toBeNull()
  })

  it("uses icon elements for dashboard navigation and folder toggles", async () => {
    await renderDashboardWithTree([createBookmark({ id: "b10", title: "React Docs", url: "https://react.dev" })], NESTED_FOLDER_TREE)

    expect(container?.querySelector("[data-testid='dashboard-nav-all-icon'] svg")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-nav-recents-icon'] svg")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-nav-highlights-icon'] svg")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-nav-settings-icon'] svg")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-folder-toggle-icon-1'] svg")).not.toBeNull()
  })

  it("uses dashboard tag shortcuts as toggle filters with real counts", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "Frontend Guide", userTags: ["frontend"] }),
      createBookmark({ id: "2", title: "AI Tutorial", aiTags: ["ai"] }),
      createBookmark({ id: "3", title: "Plain Bookmark" })
    ])

    const frontendButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-tag-frontend']")
    const aiButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-tag-ai']")

    expect(frontendButton?.disabled).toBe(false)
    expect(aiButton?.disabled).toBe(false)
    expect(frontendButton?.textContent).toContain("1")
    expect(aiButton?.textContent).toContain("1")

    await act(async () => {
      frontendButton?.click()
    })

    expect(container?.textContent).toContain("Frontend Guide")
    expect(container?.textContent).not.toContain("AI Tutorial")
    expect(container?.textContent).not.toContain("Plain Bookmark")

    await act(async () => {
      aiButton?.click()
    })

    expect(container?.textContent).toContain("AI Tutorial")
    expect(container?.textContent).not.toContain("Frontend Guide")
    expect(container?.textContent).not.toContain("Plain Bookmark")

    await act(async () => {
      aiButton?.click()
    })

    expect(container?.textContent).toContain("Frontend Guide")
    expect(container?.textContent).toContain("AI Tutorial")
    expect(container?.textContent).toContain("Plain Bookmark")
  })

  it("uses empty-result messaging instead of coming-soon copy for disabled tag shortcuts", async () => {
    await renderDashboard([createBookmark({ id: "1", title: "Plain Bookmark" })])

    const frontendButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-tag-frontend']")
    const aiButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-tag-ai']")

    expect(frontendButton?.disabled).toBe(true)
    expect(aiButton?.disabled).toBe(true)
    expect(frontendButton?.title).not.toContain("Coming soon")
    expect(aiButton?.title).not.toContain("Coming soon")
    expect(frontendButton?.title).toContain("No matching bookmarks")
    expect(aiButton?.title).toContain("No matching bookmarks")
  })

  it("uses details/ai tab semantics and shows detail actions by default", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", extractedText: "React lets you build UIs." })
    ])

    const resultButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")
    await act(async () => {
      resultButton?.click()
    })

    const detailsTab = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-details-tab']")
    const aiTab = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ai-tab']")
    const summaryEdit = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-summary-edit']")
    const tagsEdit = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-tags-edit']")
    const boldButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-format-bold']")
    const italicButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-format-italic']")
    const quoteButton = container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-format-quote']")

    expect(detailsTab?.getAttribute("aria-selected")).toBe("true")
    expect(aiTab?.getAttribute("aria-selected")).toBe("false")
    expect(summaryEdit).not.toBeNull()
    expect(tagsEdit).not.toBeNull()
    expect(boldButton?.disabled).toBe(false)
    expect(italicButton?.disabled).toBe(false)
    expect(quoteButton?.disabled).toBe(false)
    expect((boldButton?.title?.length ?? 0) > 0).toBe(true)
    expect(summaryEdit?.querySelector("svg")).not.toBeNull()
    expect(tagsEdit?.querySelector("svg")).not.toBeNull()
    expect(boldButton?.querySelector("svg")).not.toBeNull()
    expect(italicButton?.querySelector("svg")).not.toBeNull()
    expect(quoteButton?.querySelector("svg")).not.toBeNull()
  })

  it("keeps summary and tags out of the ai workspace", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", summary: "React summary", userTags: ["frontend"] })
    ])

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-result-button']")?.click()
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='dashboard-ai-tab']")?.click()
    })

    expect(container?.querySelector("[data-testid='dashboard-ask-input']")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-summary-edit']")).toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-tags-edit']")).toBeNull()
  })

  it("renders icon-based actions in the results bulk actions panel", async () => {
    await renderDashboard([
      createBookmark({ id: "1", title: "React Docs", status: "saved", url: "https://react.dev" }),
      createBookmark({ id: "2", title: "Vue Docs", status: "done", url: "https://vuejs.org" })
    ])

    expect(container?.querySelector("[data-testid='dashboard-analyze-all'] svg")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-analyze-unanalyzed'] svg")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-select-visible'] svg")).not.toBeNull()

    await act(async () => {
      container?.querySelector<HTMLInputElement>("[data-testid='dashboard-select-1']")?.click()
    })

    expect(container?.querySelector("[data-testid='dashboard-analyze-selected'] svg")).not.toBeNull()
    expect(container?.querySelector("[data-testid='dashboard-clear-selection'] svg")).not.toBeNull()
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderDashboard(
  bookmarks: BookmarkRecord[],
  updateBookmark?: (bookmark: BookmarkRecord) => Promise<void>,
  settingsRepository?: SettingsRepository,
  createProvider?: (config: ProviderConfig) => AiProvider
) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardShell
          initialBookmarks={bookmarks}
          settingsRepository={settingsRepository}
          updateBookmark={updateBookmark}
          createProvider={createProvider}
        />
      </ThemeProvider>
    )
  })

  await act(async () => {
    await Promise.resolve()
  })
}

async function renderDashboardWithTree(bookmarks: BookmarkRecord[], tree: chrome.bookmarks.BookmarkTreeNode[]) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
        <DashboardShell initialBookmarks={bookmarks} initialTree={tree} />
      </ThemeProvider>
    )
  })

  await act(async () => {
    await Promise.resolve()
  })
}

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "Example page",
    url: "https://example.com/article",
    extractedText: "Example extracted content",
    aiTags: [],
    userTags: [],
    status: "done",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  }
}

function createSettingsRepository(displayLanguage: "en" | "zh"): SettingsRepository {
  return {
    getAppSettings: async () => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto",
      autoRetryOnError: false,
      displayLanguage,
      theme: "sage"
    }),
    saveAppSettings: async () => {},
    getProviders: async () => [],
    saveProviders: async () => {}
  }
}
