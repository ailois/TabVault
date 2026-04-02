// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { Card } from "../../src/components/ui/card"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("Card", () => {
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

  it("renders children inside a semantic card container", async () => {
    await renderCard(<Card>Hello</Card>)

    const card = container?.querySelector<HTMLElement>("[data-testid='ui-card']")
    expect(card?.textContent).toContain("Hello")
    expect(card?.className).toContain("bg-surface")
    expect(card?.className).toContain("border-subtle")
  })

  it("applies custom className when provided", async () => {
    await renderCard(<Card className="my-card">X</Card>)

    const card = container?.querySelector<HTMLElement>("[data-testid='ui-card']")
    expect(card?.className).toContain("my-card")
  })

  it("uses accent classes when accent is enabled", async () => {
    await renderCard(<Card accent>Accent</Card>)

    const card = container?.querySelector<HTMLElement>("[data-testid='ui-card']")
    expect(card?.className).toContain("border-accent-primary/30")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderCard(element: React.ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(element)
  })
}
