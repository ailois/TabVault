// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import { SectionCard } from "../../src/components/shared/section-card"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

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
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: vi.fn()
  }
} as any

describe("SectionCard", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount()
      })
    }

    container?.remove()
    container = null
    root = null
  })

  it("renders children inside a card container", async () => {
    await renderCard(<SectionCard>Hello</SectionCard>)

    const card = container?.querySelector<HTMLElement>("[data-testid='section-card']")
    expect(card?.textContent).toContain("Hello")
  })

  it("applies custom className when provided", async () => {
    await renderCard(<SectionCard className="my-card">X</SectionCard>)

    const card = container?.querySelector<HTMLElement>("[data-testid='section-card']")
    expect(card?.className).toContain("my-card")
  })

  it("uses accent border styles when accent is enabled", async () => {
    await renderCard(<SectionCard accent>Accent</SectionCard>)

    const card = container?.querySelector<HTMLElement>("[data-testid='section-card']")
    expect(card?.style.border).toContain("rgba")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderCard(element: React.ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <ThemeProvider theme={{ ...buildThemeFromOverride("light"), toggle: () => {} }}>
        {element}
      </ThemeProvider>
    )
  })
}
