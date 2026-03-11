// tests/ui/sidepanel.test.tsx
// @vitest-environment jsdom
import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import SidePanel from "../../src/sidepanel"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("SidePanel", () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  afterEach(async () => {
    if (root && container) {
      await act(async () => { root?.unmount() })
    }
    container?.remove()
    container = null
    root = null
  })

  it("renders the Side Panel header and main sections", async () => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root!.render(<SidePanel />)
    })

    expect(container.textContent).toContain("TabVault Pro")
    expect(container.textContent).toContain("Manage your bookmarks")
    expect(container.querySelector("button")?.textContent).toContain("Import Chrome Bookmarks")
  })

  it("sends IMPORT_BOOKMARKS message when import button is clicked", async () => {
    const sendMessageMock = vi.fn((msg, cb) => {
      if (cb) cb({ success: true, count: 5 })
    })
    globalThis.chrome = { runtime: { sendMessage: sendMessageMock } } as any

    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root!.render(<SidePanel />)
    })

    const importBtn = container.querySelector("button")
    await act(async () => {
      importBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(sendMessageMock).toHaveBeenCalledWith(
      { type: "IMPORT_BOOKMARKS" },
      expect.any(Function)
    )
    expect(container.textContent).toContain("Imported 5 bookmarks")
  })
})
