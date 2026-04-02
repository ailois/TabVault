// @vitest-environment jsdom

import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "../../src/ui/theme-context"
import { buildThemeFromOverride } from "../../src/ui/use-theme"
import { ToggleSwitch } from "../../src/components/toggle-switch"

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
      root!.render(
        <ThemeProvider theme={{ ...buildThemeFromOverride("sage"), toggle: () => {}, setTheme: () => {} }}>
          <ToggleSwitch checked={checked} onChange={onChange} label={label} />
        </ThemeProvider>
      )
    })
  }

  it("uses the prototype-sized track and thumb when unchecked", async () => {
    await renderToggle(false, vi.fn())

    const toggle = container?.querySelector<HTMLElement>('[role="switch"]')
    const thumb = toggle?.querySelector<HTMLElement>("span")
    expect(toggle?.style.width).toBe("40px")
    expect(toggle?.style.height).toBe("24px")
    expect(toggle?.style.backgroundColor).toBe("rgb(244, 247, 244)")
    expect(thumb?.style.width).toBe("16px")
    expect(thumb?.style.height).toBe("16px")
    expect(thumb?.style.backgroundColor).toBe("rgb(122, 138, 125)")
  })

  it("uses the prototype accent track and translated thumb when checked", async () => {
    await renderToggle(true, vi.fn())

    const toggle = container?.querySelector<HTMLElement>('[role="switch"]')
    const thumb = toggle?.querySelector<HTMLElement>("span")
    expect(toggle?.style.backgroundColor).toBe("rgb(107, 142, 115)")
    expect(toggle?.style.borderColor).toBe("rgb(107, 142, 115)")
    expect(thumb?.style.transform).toBe("translateX(16px)")
    expect(thumb?.style.backgroundColor).toBe("rgb(255, 255, 255)")
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
