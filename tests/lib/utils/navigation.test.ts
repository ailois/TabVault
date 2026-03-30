import { beforeEach, describe, expect, it, vi } from "vitest"
import { openCurrentTabSidePanel, openDashboardTab, openSettingsPage } from "../../../src/lib/utils/navigation"

describe("navigation helpers", () => {
  beforeEach(() => {
    globalThis.chrome = {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
        openOptionsPage: vi.fn(async () => undefined)
      },
      tabs: {
        create: vi.fn(async () => undefined),
        query: vi.fn(async () => [{ id: 7 }])
      },
      sidePanel: {
        open: vi.fn(async () => undefined)
      }
    } as any
  })

  it("opens dashboard in a new extension tab", async () => {
    await openDashboardTab()

    expect(globalThis.chrome.runtime.getURL).toHaveBeenCalledWith("tabs/dashboard.html")
    expect(globalThis.chrome.tabs.create).toHaveBeenCalledWith({
      url: "chrome-extension://test/tabs/dashboard.html"
    })
  })

  it("opens side panel for the active tab", async () => {
    await openCurrentTabSidePanel()

    expect(globalThis.chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true })
    expect(globalThis.chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: 7 })
  })

  it("opens settings page", async () => {
    await openSettingsPage()

    expect(globalThis.chrome.runtime.openOptionsPage).toHaveBeenCalled()
  })
})
