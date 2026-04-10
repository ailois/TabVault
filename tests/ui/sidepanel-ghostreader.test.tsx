// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import SidePanel from "../../src/sidepanel"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { SettingsRepository } from "../../src/lib/config/settings-repository"
import type { ThemeRepository } from "../../src/lib/config/theme-repository"
import type { BookmarkRecord } from "../../src/types/bookmark"
import type { AppSettings, ProviderConfig } from "../../src/types/settings"

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let runtimeMessageListener: ((message: Record<string, unknown>) => void) | null = null

globalThis.chrome = {
  ...(globalThis.chrome ?? {}),
  storage: {
    ...((globalThis.chrome as any)?.storage ?? {}),
    local: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {})
    }
  },
  runtime: {
    ...((globalThis.chrome as any)?.runtime ?? {}),
    onMessage: {
      addListener: vi.fn((listener: (message: Record<string, unknown>) => void) => {
        runtimeMessageListener = listener
      }),
      removeListener: vi.fn((listener: (message: Record<string, unknown>) => void) => {
        if (runtimeMessageListener === listener) {
          runtimeMessageListener = null
        }
      })
    },
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`)
  },
  tabs: {
    create: vi.fn(async () => undefined),
    query: vi.fn(async () => [{ id: 1, title: "Current React Page", url: "https://example.com/current" }])
  },
  sidePanel: {
    open: vi.fn(async () => undefined)
  },
  bookmarks: {
    getTree: vi.fn(async () => [])
  }
} as any

describe("SidePanel Ghostreader", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount()
      })
    }

    container?.remove()
    container = null
    root = null
    runtimeMessageListener = null
    vi.clearAllMocks()
  })

  it("renders a persistent Ghostreader input", async () => {
    await renderSidePanel(createServices())

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    expect(input).not.toBeNull()
    expect(input?.getAttribute("placeholder")).toContain("Ghostreader")
  })

  it("matches the prototype header, welcome bubble, and composer sizing", async () => {
    await renderSidePanel(createServices())

    const panel = container?.querySelector<HTMLElement>("main")
    const searchInput = container?.querySelector<HTMLInputElement>("#sidepanel-search")
    const welcomeCard = container?.querySelector<HTMLElement>("[data-testid='ghostreader-welcome-card']")
    const composerInput = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const composerButton = container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")

    expect(panel?.style.borderLeft).toContain("1px solid")
    expect(searchInput?.style.padding).toBe("10px 12px 10px 36px")
    expect(searchInput?.style.borderRadius).toBe("8px")
    expect(welcomeCard?.style.borderTopLeftRadius).toBe("5px")
    expect(composerInput?.style.borderRadius).toBe("12px")
    expect(composerButton?.style.width).toBe("28px")
    expect(composerButton?.style.height).toBe("28px")
  })

  it("shows a clear button in the header search field and clears the query", async () => {
    await renderSidePanel(createServices())

    const searchInput = container?.querySelector<HTMLInputElement>("#sidepanel-search")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setter?.call(searchInput, "react compiler")
      searchInput?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const clearButton = container?.querySelector<HTMLButtonElement>("[data-testid='sidepanel-search-clear']")
    expect(clearButton).not.toBeNull()
    expect(clearButton?.style.position).toBe("absolute")

    await act(async () => { clearButton?.click() })
    expect(searchInput?.value).toBe("")
  })

  it("keeps header search and Ghostreader composer independent", async () => {
    await renderSidePanel(createServices())

    const searchInput = container?.querySelector<HTMLInputElement>("#sidepanel-search")
    const composerInput = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(composerInput, "Yang Mi")
      composerInput?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    expect(searchInput?.value).toBe("")
    expect(composerInput?.value).toBe("Yang Mi")
  })

  it("does not trigger retrieval while typing in the Ghostreader composer", async () => {
    const analyze = vi.fn(async () => ({ summary: "unused", tags: [] }))

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({ id: "bm-react", title: "React Notes", extractedText: "react compiler details" })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const composerInput = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(composerInput, "React")
      composerInput?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(analyze).not.toHaveBeenCalled()
    expect(container?.textContent).not.toContain("React Notes")
  })

  it("keeps previous user and assistant turns visible after follow-up questions", async () => {
    const analyze = vi
      .fn(async () => ({ summary: "unused", tags: [] }))
      .mockResolvedValueOnce({ summary: "first answer", tags: [] })
      .mockResolvedValueOnce({ summary: "second answer", tags: [] })

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setValue?.call(input, "关于杨幂的书签有哪些？")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    await act(async () => {
      setValue?.call(input, "帮我总结一下这个书签")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    const secondCall = analyze.mock.calls.at(1)?.at(0) as { content: string } | undefined
    expect(secondCall?.content).toContain("关于杨幂的书签有哪些？")
    expect(container?.textContent).toContain("关于杨幂的书签有哪些？")
    expect(container?.textContent).toContain("first answer")
    expect(container?.textContent).toContain("帮我总结一下这个书签")
    expect(container?.textContent).toContain("second answer")
  })

  it("updates last transcript answer when clicking action cards", async () => {
    const analyze = vi
      .fn(async () => ({ summary: "unused", tags: [] }))
      .mockResolvedValueOnce({ summary: "Follow-up answer", tags: [] })

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({
              id: "yangmi-bookmark",
              title: "Yang Mi interview archive",
              url: "https://example.com/yangmi",
              extractedText: "Yang Mi profile and interview references"
            })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setValue?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    const actionButton = container?.querySelector<HTMLButtonElement>("[data-testid='hybrid-action-ask-top-matches']")
    expect(actionButton).not.toBeNull()

    const answerCardsBefore = container?.querySelectorAll<HTMLElement>("[data-testid='hybrid-answer-card']")
    const lastAnswerBefore = answerCardsBefore?.item((answerCardsBefore.length ?? 1) - 1)?.textContent ?? ""
    expect(lastAnswerBefore).toContain("Follow-up answer")

    await act(async () => {
      actionButton?.click()
    })

    const answerCardsAfter = container?.querySelectorAll<HTMLElement>("[data-testid='hybrid-answer-card']")
    const lastAnswerAfter = answerCardsAfter?.item((answerCardsAfter.length ?? 1) - 1)?.textContent ?? ""
    expect(lastAnswerAfter).not.toContain("Follow-up answer")
    expect(lastAnswerAfter).toContain("Based on Yang Mi interview archive")
  })

  it("injects inherited memory only on the first turn after starting a new session", async () => {
    const analyze = vi
      .fn(async () => ({ summary: "unused", tags: [] }))
      .mockResolvedValueOnce({ summary: "Legacy answer", tags: [] })
      .mockResolvedValueOnce({ summary: "New session first answer", tags: [] })
      .mockResolvedValueOnce({ summary: "New session second answer", tags: [] })

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({
              id: "bm-yangmi",
              title: "Yang Mi interview archive",
              url: "https://example.com/yangmi",
              extractedText: "Yang Mi profile and interview references"
            })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setValue?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='sidepanel-new-session']")?.click()
    })

    expect(container?.textContent).not.toContain("Legacy answer")

    await act(async () => {
      setValue?.call(input, "继续聊杨幂")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    await act(async () => {
      setValue?.call(input, "再补充两点")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    const firstTurnAfterNewSession = analyze.mock.calls.at(1)?.at(0) as { content: string } | undefined
    const secondTurnAfterNewSession = analyze.mock.calls.at(2)?.at(0) as { content: string } | undefined

    expect(firstTurnAfterNewSession?.content).toContain("Inherited memory")
    expect(firstTurnAfterNewSession?.content).toContain("What bookmarks mention Yang Mi?")
    expect(firstTurnAfterNewSession?.content).toContain("recentTopicSummary")
    expect(firstTurnAfterNewSession?.content).toContain("bm-yangmi")

    expect(secondTurnAfterNewSession?.content).not.toContain("Inherited memory")
    expect(secondTurnAfterNewSession?.content).not.toContain("recentTopicSummary")
    expect(secondTurnAfterNewSession?.content).not.toContain("bm-yangmi")
    expect(container?.textContent).not.toContain("Legacy answer")
  })

  it("restores full transcript when continuing a previous session", async () => {
    const analyze = vi
      .fn(async () => ({ summary: "unused", tags: [] }))
      .mockResolvedValueOnce({ summary: "First session answer", tags: [] })
      .mockResolvedValueOnce({ summary: "Follow-up answer", tags: [] })
    const ghostreaderSessionStore = createGhostreaderSessionStore()

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        }),
        ghostreaderSessionStore
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setValue?.call(input, "What is this page?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    await act(async () => {
      setValue?.call(input, "Can you summarize it?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    expect(container?.textContent).toContain("What is this page?")
    expect(container?.textContent).toContain("First session answer")
    expect(container?.textContent).toContain("Can you summarize it?")
    expect(container?.textContent).toContain("Follow-up answer")

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='sidepanel-new-session']")?.click()
    })

    expect(container?.textContent).not.toContain("First session answer")
    expect(container?.textContent).not.toContain("Follow-up answer")
    expect(container?.querySelector("[data-testid='sidepanel-continue-session']")).not.toBeNull()

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='sidepanel-continue-session']")?.click()
    })

    expect(container?.textContent).toContain("What is this page?")
    expect(container?.textContent).toContain("First session answer")
    expect(container?.textContent).toContain("Can you summarize it?")
    expect(container?.textContent).toContain("Follow-up answer")
  })

  it("records bookmark-added runtime events into the active Ghostreader session", async () => {
    const analyze = vi.fn(async () => ({ summary: "Session-aware answer", tags: [] }))
    const ghostreaderSessionStore = createGhostreaderSessionStore()

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        }),
        ghostreaderSessionStore
      })
    )

    await act(async () => {
      runtimeMessageListener?.({
        type: "BOOKMARK_ADDED",
        bookmarkId: "bm-yangmi",
        title: "Yang Mi interview archive",
        url: "https://yangmi.example",
        source: "page-save"
      })
    })

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setValue?.call(input, "What bookmark did I just save?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    const analyzeInput = analyze.mock.calls.at(0)?.at(0) as { content: string } | undefined
    expect(analyzeInput?.content).toContain("Yang Mi interview archive")
    expect(analyzeInput?.content).toContain("https://yangmi.example")
  })

  it("submits on Enter and returns only the Yang Mi bookmark for the Chinese question", async () => {
    const analyze = vi.fn(async () => {
      const error = new Error("OpenAI-compatible rejected the request") as Error & { code?: string }
      error.code = "invalid_request_error"
      throw error
    })

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({
              id: "bm-yangmi",
              title: "\u6768\u5e42\u91c7\u8bbf\u5408\u96c6",
              extractedText: "\u6768\u5e42\u4e13\u8bbf\u4e0e\u5f71\u89c6\u8d44\u6599"
            }),
            createBookmark({
              id: "bm-about",
              title: "\u5173\u4e8e\u6211\u4eec - UniVibe",
              extractedText: "\u4e13\u4e1a AI \u7f16\u7a0b\u52a9\u624b"
            }),
            createBookmark({
              id: "bm-keras",
              title: "\u5173\u4e8e Keras \u7684\u201c\u5c42\u201d",
              extractedText: "deep learning layers"
            })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const searchInput = container?.querySelector<HTMLInputElement>("#sidepanel-search")
    const composerInput = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(composerInput, "\u5173\u4e8e\u6768\u5e42\u7684\u4e66\u7b7e\u6709\u54ea\u4e9b\uff1f")
      composerInput?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(analyze).not.toHaveBeenCalled()
    expect(searchInput?.value).toBe("")
    expect(container?.textContent).not.toContain("\u6768\u5e42\u91c7\u8bbf\u5408\u96c6")

    await act(async () => {
      composerInput?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(analyze).toHaveBeenCalledTimes(1)
    expect(composerInput?.value).toBe("")
    expect(container?.textContent).toContain("\u6768\u5e42\u91c7\u8bbf\u5408\u96c6")
    expect(container?.textContent).not.toContain("\u5173\u4e8e\u6211\u4eec - UniVibe")
    expect(container?.textContent).not.toContain("\u5173\u4e8e Keras \u7684\u201c\u5c42\u201d")
  })

  it("shows provider errors clearly when Ghostreader submission fails", async () => {
    const analyze = vi.fn(async () => {
      const error = new Error("OpenAI-compatible authentication failed") as Error & { code?: string }
      error.code = "auth_error"
      throw error
    })
    const provider = { analyze }

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => provider),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "bad-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "Why is this failing?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(analyze).toHaveBeenCalled()
    expect(container?.textContent).toContain("OpenAI-compatible authentication failed")
  })

  it("localizes provider errors in Chinese when Ghostreader submission fails", async () => {
    const analyze = vi.fn(async () => {
      const error = new Error("OpenAI-compatible authentication failed") as Error & { code?: string }
      error.code = "auth_error"
      throw error
    })
    const provider = { analyze }

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => provider),
        settingsRepository: createSettingsRepository({
          getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
            defaultProvider: "openai",
            autoAnalyzeOnSave: false,
            summaryLanguage: "auto",
            autoRetryOnError: false,
            displayLanguage: "zh",
            theme: "sage"
          })),
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "bad-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "Why is this failing?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(analyze).toHaveBeenCalled()
    expect(container?.textContent).toContain("OpenAI-compatible \u8eab\u4efd\u9a8c\u8bc1\u5931\u8d25")
  })

  it("truncates oversized current-page and saved-match content before Ghostreader submission", async () => {
    const analyze = vi.fn(async () => ({ summary: "trimmed answer", tags: [] }))
    const provider = { analyze }
    const longCurrentPage = "A".repeat(6_000)
    const longSavedContent = "B".repeat(3_000)

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => provider),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({
              id: "bookmark-long",
              title: "Yang Mi interview",
              summary: "Yang Mi notes",
              extractedText: longSavedContent
            })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        }),
        extractPage: vi.fn(async () => longCurrentPage)
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(analyze).toHaveBeenCalledTimes(1)
    const submittedInput = (analyze as any).mock.calls[0]?.[0] as { content: string } | undefined
    expect(submittedInput).toBeTruthy()
    expect(submittedInput?.content.length).toBeLessThan(8_000)
    expect(submittedInput?.content).not.toContain("A".repeat(4_000))
    expect(submittedInput?.content).not.toContain("B".repeat(1_500))
  })

  it("falls back to local retrieval answers when Ghostreader gets invalid_request_error", async () => {
    const analyze = vi.fn(async () => {
      const error = new Error("OpenAI-compatible rejected the request") as Error & { code?: string }
      error.code = "invalid_request_error"
      throw error
    })
    const provider = { analyze }

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => provider),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({
              id: "yangmi-bookmark",
              title: "Yang Mi interview archive",
              summary: "Collected Yang Mi notes",
              extractedText: "Yang Mi profile and interview references"
            })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(analyze).toHaveBeenCalled()
    expect(container?.textContent).toContain("Yang Mi interview archive")
    expect(container?.textContent).not.toContain("OpenAI-compatible rejected the request")
  })

  it("falls back to local retrieval answers when Ghostreader gets network_error", async () => {
    const analyze = vi.fn(async () => {
      const error = new Error("OpenAI-compatible request failed") as Error & { code?: string }
      error.code = "network_error"
      throw error
    })

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({
              id: "yangmi-bookmark",
              title: "Yang Mi interview archive",
              summary: "Collected Yang Mi notes",
              extractedText: "Yang Mi profile and interview references"
            })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(analyze).toHaveBeenCalled()
    expect(container?.textContent).toContain("Yang Mi interview archive")
    expect(container?.textContent).not.toContain("OpenAI-compatible request failed")
  })

  it("keeps current-bookmark summary questions out of cross-bookmark retrieval context", async () => {
    const analyze = vi.fn(async () => ({ summary: "This bookmark explains the current React page.", tags: [] }))

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({
              id: "yangmi-bookmark",
              title: "Yang Mi interview archive",
              url: "https://example.com/yangmi",
              extractedText: "Yang Mi profile and interview references"
            })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "Summarize this bookmark")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(analyze).toHaveBeenCalledTimes(1)
    const submittedInput = analyze.mock.calls.at(0)?.at(0) as { content: string } | undefined
    expect(submittedInput?.content).not.toContain("Saved bookmark matches")
    expect(submittedInput?.content).not.toContain("Yang Mi interview archive")
    expect(submittedInput?.content).not.toContain("https://example.com/yangmi")
    expect(container?.textContent).toContain("This bookmark explains the current React page.")
    expect(container?.textContent).not.toContain("Yang Mi interview archive")
  })

  it("does not submit another Ghostreader request while one is already in flight", async () => {
    let resolveAnalyze: ((value: { summary: string; tags: string[] }) => void) | null = null
    const analyze = vi.fn(
      () =>
        new Promise<{ summary: string; tags: string[] }>((resolve) => {
          resolveAnalyze = resolve
        })
    )

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "First question")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    await act(async () => {
      setter?.call(input, "Second question")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    expect(analyze).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveAnalyze?.({ summary: "Done", tags: [] })
      await Promise.resolve()
    })
  })

  it("clears previous Ghostreader results when the provider becomes unavailable", async () => {
    const analyze = vi.fn(async () => ({ summary: "Found Yang Mi bookmark", tags: [] }))
    const getProviders = vi
      .fn<SettingsRepository["getProviders"]>()
      .mockResolvedValueOnce([
        {
          provider: "openai",
          apiKey: "test-key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini",
          enabled: true
        }
      ])
      .mockResolvedValueOnce([])

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({
              id: "yangmi-bookmark",
              title: "Yang Mi interview archive",
              summary: "Collected Yang Mi notes",
              extractedText: "Yang Mi profile and interview references"
            })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.textContent).toContain("Yang Mi interview archive")

    await act(async () => {
      setter?.call(input, "What bookmarks mention React?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.textContent).toContain("API key")
    expect(container?.textContent).not.toContain("Yang Mi interview archive")
  })

  it("keeps transcript and appends an assistant error turn when a later sidepanel ask fails", async () => {
    const analyze = vi.fn(async (_input: unknown) => {
      if (analyze.mock.calls.length === 1) {
        return { summary: "Yang Mi matches found.", tags: [] }
      }

      const error = new Error("OpenAI-compatible authentication failed") as Error & { code?: string }
      error.code = "auth_error"
      throw error
    })

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        bookmarkRepository: createBookmarkRepository({
          list: vi.fn(async () => [
            createBookmark({
              id: "yangmi-bookmark",
              title: "Yang Mi interview archive",
              summary: "Collected Yang Mi notes",
              extractedText: "Yang Mi profile and interview references"
            })
          ])
        }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.textContent).toContain("What bookmarks mention Yang Mi?")
    expect(container?.textContent).toContain("Yang Mi matches found.")

    await act(async () => {
      setter?.call(input, "What bookmarks mention Vue?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.textContent).toContain("OpenAI-compatible authentication failed")
    expect(container?.textContent).toContain("What bookmarks mention Yang Mi?")
    expect(container?.textContent).toContain("Yang Mi matches found.")
  })

  it("clears previous Ghostreader matches immediately when a new sidepanel ask starts", async () => {
    let resolveSecondList: ((value: BookmarkRecord[]) => void) | null = null
    const list = vi
      .fn<BookmarkRepository["list"]>()
      .mockResolvedValueOnce([
        createBookmark({
          id: "yangmi-bookmark",
          title: "Yang Mi interview archive",
          summary: "Collected Yang Mi notes",
          extractedText: "Yang Mi profile and interview references"
        }),
        createBookmark({
          id: "vue-bookmark",
          title: "Vue Docs",
          summary: "Vue notes",
          extractedText: "Vue composition api guide"
        })
      ])
      .mockResolvedValueOnce([
        createBookmark({
          id: "yangmi-bookmark",
          title: "Yang Mi interview archive",
          summary: "Collected Yang Mi notes",
          extractedText: "Yang Mi profile and interview references"
        }),
        createBookmark({
          id: "vue-bookmark",
          title: "Vue Docs",
          summary: "Vue notes",
          extractedText: "Vue composition api guide"
        })
      ])
      .mockImplementationOnce(
        () =>
          new Promise<BookmarkRecord[]>((resolve) => {
            resolveSecondList = resolve
          })
      )

    const analyze = vi.fn(async () => ({ summary: "Yang Mi matches found.", tags: [] }))

    await renderSidePanel(
      createServices({
        createProvider: vi.fn(() => ({ analyze })),
        bookmarkRepository: createBookmarkRepository({ list }),
        settingsRepository: createSettingsRepository({
          getProviders: vi.fn(async (): Promise<ProviderConfig[]> => [
            {
              provider: "openai",
              apiKey: "test-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              enabled: true
            }
          ])
        })
      })
    )

    const input = container?.querySelector<HTMLInputElement>("[data-testid='ghostreader-input']")
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, "What bookmarks mention Yang Mi?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.textContent).toContain("Yang Mi interview archive")

    await act(async () => {
      setter?.call(input, "What bookmarks mention Vue?")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("[data-testid='ghostreader-submit']")?.click()
    })

    expect(container?.textContent).not.toContain("Yang Mi interview archive")

    await act(async () => {
      resolveSecondList?.([
        createBookmark({
          id: "yangmi-bookmark",
          title: "Yang Mi interview archive",
          summary: "Collected Yang Mi notes",
          extractedText: "Yang Mi profile and interview references"
        }),
        createBookmark({
          id: "vue-bookmark",
          title: "Vue Docs",
          summary: "Vue notes",
          extractedText: "Vue composition api guide"
        })
      ])
      await Promise.resolve()
    })
  })

})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderSidePanel(services: any) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(<SidePanel services={services} />)
  })

  await act(async () => { await Promise.resolve() })
}

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "Example page",
    url: "https://example.com/article",
    aiTags: [],
    userTags: [],
    status: "saved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

function createServices(overrides: any = {}) {
  return {
    bookmarkRepository: createBookmarkRepository(),
    settingsRepository: createSettingsRepository(),
    themeRepository: createThemeRepository(),
    analyzeBookmark: vi.fn(async ({ bookmark }: { bookmark: BookmarkRecord }) => ({ ...bookmark, status: "done" })),
    createProvider: vi.fn(() => ({ analyze: vi.fn() })),
    queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
    extractPage: vi.fn(async () => "react compiler and useMemo"),
    ...overrides
  }
}

function createThemeRepository(overrides: Partial<ThemeRepository> = {}): ThemeRepository {
  return {
    getTheme: vi.fn(async () => undefined),
    setTheme: vi.fn(async () => undefined),
    ...overrides
  }
}

function createBookmarkRepository(overrides: Partial<BookmarkRepository> = {}): BookmarkRepository {
  return {
    save: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    clearAnalysis: vi.fn(async () => undefined),
    clearAllAnalysis: vi.fn(async () => undefined),
    clearErrorAnalysis: vi.fn(async () => undefined),
    ...overrides
  }
}

function createSettingsRepository(overrides: Partial<SettingsRepository> = {}): SettingsRepository {
  return {
    getAppSettings: vi.fn(async (): Promise<AppSettings> => ({
      defaultProvider: "openai",
      autoAnalyzeOnSave: false,
      summaryLanguage: "auto",
      autoRetryOnError: false,
      displayLanguage: "en",
      theme: "sage"
    })),
    saveAppSettings: vi.fn(async () => undefined),
    getProviders: vi.fn(async (): Promise<ProviderConfig[]> => []),
    saveProviders: vi.fn(async () => undefined),
    ...overrides
  }
}

function createGhostreaderSessionStore() {
  let state = {
    activeSessionId: null as string | null,
    sessions: [] as any[],
    version: 1
  }

  return {
    loadSessions: vi.fn(async () => state),
    saveSessions: vi.fn(async (input: { activeSessionId: string | null; sessions: any[] }) => {
      state = { ...state, ...input }
    }),
    clearActiveSession: vi.fn(async () => {
      state = { ...state, activeSessionId: null }
    })
  }
}
