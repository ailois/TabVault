// tests/ui/sidepanel.test.tsx
// @vitest-environment jsdom
import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"
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
})