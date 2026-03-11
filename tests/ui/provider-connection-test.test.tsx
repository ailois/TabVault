// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import ProviderSettingsForm from "../../src/components/provider-settings-form"
import type { ProviderFormState } from "../../src/features/settings/provider-form-state"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("ProviderSettingsForm connection testing", () => {
  afterEach(async () => {
    if (root && container) {
      await act(async () => { root?.unmount() })
    }
    container?.remove()
    container = null
    root = null
  })

  it("shows Test connection button when provider is enabled with apiKey and model filled", async () => {
    await render(enabledOpenAi())
    expect(getTestBtn()).not.toBeNull()
  })

  it("disables Test connection button when provider is not enabled", async () => {
    await render({ ...enabledOpenAi(), enabled: false })
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)
  })

  it("disables Test connection button when apiKey is empty", async () => {
    await render({ ...enabledOpenAi(), apiKey: "" })
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)
  })

  it("disables Test connection button when model is empty", async () => {
    await render({ ...enabledOpenAi(), model: "" })
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)
  })

  it("disables Test connection button when baseUrl is empty for openai", async () => {
    await render({ ...enabledOpenAi(), baseUrl: "" })
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)
  })

  it("shows Testing... while the test is in progress", async () => {
    const deferred = createDeferred<"ok">()
    await render(enabledOpenAi(), () => deferred.promise)

    await act(async () => {
      getTestBtn()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(getTestBtn()?.textContent).toBe("Testing...")
    expect(getTestBtn()?.hasAttribute("disabled")).toBe(true)

    deferred.resolve("ok")
    await act(async () => { await Promise.resolve() })
  })

  it("shows ✓ Connected after a successful test", async () => {
    await render(enabledOpenAi(), async () => "ok")

    await act(async () => {
      getTestBtn()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    await act(async () => { await Promise.resolve() })

    expect(container?.querySelector("[data-testid='connection-test-result']")?.textContent).toBe("✓ Connected")
  })

  it("shows error message after a failed test", async () => {
    await render(enabledOpenAi(), async () => "401 Unauthorized")

    await act(async () => {
      getTestBtn()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    await act(async () => { await Promise.resolve() })

    expect(container?.querySelector("[data-testid='connection-test-result']")?.textContent).toBe("401 Unauthorized")
  })

  it("resets test status when a field changes", async () => {
    let currentValue = enabledOpenAi()
    const { rerender } = await renderWithRerender(currentValue, async () => "ok")

    await act(async () => {
      getTestBtn()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    await act(async () => { await Promise.resolve() })

    expect(container?.querySelector("[data-testid='connection-test-result']")?.textContent).toBe("✓ Connected")

    currentValue = { ...currentValue, apiKey: "new-key" }
    await act(async () => {
      rerender(currentValue)
    })

    expect(container?.querySelector("[data-testid='connection-test-result']")).toBeNull()
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function render(
  value: ProviderFormState,
  onTestConnection: (value: ProviderFormState) => Promise<"ok" | string> = vi.fn(async () => "ok")
): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(
      <ProviderSettingsForm
        value={value}
        onChange={() => {}}
        onTestConnection={onTestConnection}
      />
    )
  })
}

async function renderWithRerender(
  initialValue: ProviderFormState,
  onTestConnection: (value: ProviderFormState) => Promise<"ok" | string>
): Promise<{ rerender: (value: ProviderFormState) => void }> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  let currentValue = initialValue

  function TestWrapper({ value }: { value: ProviderFormState }) {
    return (
      <ProviderSettingsForm
        value={value}
        onChange={() => {}}
        onTestConnection={onTestConnection}
      />
    )
  }

  await act(async () => {
    root.render(<TestWrapper value={currentValue} />)
  })

  return {
    rerender: (value: ProviderFormState) => {
      currentValue = value
      root!.render(<TestWrapper value={currentValue} />)
    }
  }
}

function getTestBtn(): HTMLButtonElement | null {
  return container?.querySelector<HTMLButtonElement>("[data-testid='provider-test-button']") ?? null
}

function enabledOpenAi(): ProviderFormState {
  return {
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    enabled: true
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => { resolve = res })
  return { promise, resolve }
}
