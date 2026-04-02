// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ToggleSwitch } from "../../src/components/ui/switch"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("ToggleSwitch", () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

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

  async function renderToggle(checked: boolean, onChange: (v: boolean) => void, label = "Test toggle") {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root!.render(<ToggleSwitch checked={checked} onChange={onChange} label={label} />)
    })
  }

  it("renders semantic size classes when unchecked", async () => {
    await renderToggle(false, vi.fn())

    const toggle = container?.querySelector<HTMLElement>('[role="switch"]')
    const thumb = toggle?.querySelector<HTMLElement>("span")
    expect(toggle?.className).toContain("h-6")
    expect(toggle?.className).toContain("w-10")
    expect(toggle?.className).toContain("bg-base")
    expect(thumb?.className).toContain("h-4")
    expect(thumb?.className).toContain("w-4")
  })

  it("renders accent classes when checked", async () => {
    await renderToggle(true, vi.fn())

    const toggle = container?.querySelector<HTMLElement>('[role="switch"]')
    const thumb = toggle?.querySelector<HTMLElement>("span")
    expect(toggle?.className).toContain("bg-accent-primary")
    expect(toggle?.className).toContain("border-accent-primary")
    expect(thumb?.className).toContain("translate-x-4")
    expect(thumb?.className).toContain("bg-white")
  })

  it("has aria-checked=false when unchecked", async () => {
    await renderToggle(false, vi.fn())
    const toggle = container?.querySelector('[role="switch"]')
    expect(toggle?.getAttribute("aria-checked")).toBe("false")
  })

  it("has aria-checked=true when checked", async () => {
    await renderToggle(true, vi.fn())
    const toggle = container?.querySelector('[role="switch"]')
    expect(toggle?.getAttribute("aria-checked")).toBe("true")
  })

  it("calls onChange with inverted value when clicked", async () => {
    const onChange = vi.fn()
    await renderToggle(false, onChange)

    const toggle = container?.querySelector('[role="switch"]') as HTMLButtonElement
    await act(async () => {
      toggle.click()
    })

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("calls onChange with false when checked and clicked", async () => {
    const onChange = vi.fn()
    await renderToggle(true, onChange)

    const toggle = container?.querySelector('[role="switch"]') as HTMLButtonElement
    await act(async () => {
      toggle.click()
    })

    expect(onChange).toHaveBeenCalledWith(false)
  })

  it("has aria-label set to the label prop", async () => {
    await renderToggle(false, vi.fn(), "Enable feature")
    const toggle = container?.querySelector('[role="switch"]')
    expect(toggle?.getAttribute("aria-label")).toBe("Enable feature")
  })
})
