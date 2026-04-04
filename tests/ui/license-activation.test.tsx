// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { LicenseActivation } from "../../src/components/license-activation"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("LicenseActivation", () => {
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

  async function renderLicenseActivation(
    props: Partial<React.ComponentProps<typeof LicenseActivation>> = {}
  ): Promise<React.ComponentProps<typeof LicenseActivation>> {
    const defaultProps: React.ComponentProps<typeof LicenseActivation> = {
      licenseKey: "",
      isLicensed: false,
      isSubmitting: false,
      errorMessage: null,
      onLicenseKeyChange: vi.fn(),
      onSubmit: vi.fn(),
      onEdit: vi.fn()
    }

    const mergedProps = { ...defaultProps, ...props }

    if (!container) {
      container = document.createElement("div")
      document.body.appendChild(container)
    }

    if (!root) {
      root = createRoot(container)
    }

    await act(async () => {
      root!.render(<LicenseActivation {...mergedProps} />)
    })

    return mergedProps
  }

  it("renders input and Activate button when not licensed", async () => {
    await renderLicenseActivation({ licenseKey: "TVLT-AAAA-BBBB-CCCC" })

    expect(container?.querySelector("[data-testid='license-key-input']")).not.toBeNull()
    expect(container?.querySelector("[data-testid='license-submit-button']")?.textContent).toBe("Activate")
    expect(container?.textContent).toContain("Activate TabVault")
  })

  it("disables Activate button when input is empty", async () => {
    await renderLicenseActivation({ licenseKey: "   " })

    expect(container?.querySelector("[data-testid='license-submit-button']")?.hasAttribute("disabled")).toBe(true)
  })

  it("calls onLicenseKeyChange when input value changes", async () => {
    const onLicenseKeyChange = vi.fn()
    await renderLicenseActivation({ onLicenseKeyChange, licenseKey: "" })

    const input = container?.querySelector("[data-testid='license-key-input']") as HTMLInputElement

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      valueSetter?.call(input, "TVLT-1234-5678-ABCD")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })

    expect(onLicenseKeyChange).toHaveBeenCalledWith("TVLT-1234-5678-ABCD")
  })

  it("shows Activating... and disables controls while submitting", async () => {
    await renderLicenseActivation({ licenseKey: "TVLT-1234-5678-ABCD", isSubmitting: true })

    const input = container?.querySelector("[data-testid='license-key-input']") as HTMLInputElement
    const button = container?.querySelector("[data-testid='license-submit-button']") as HTMLButtonElement

    expect(input.disabled).toBe(true)
    expect(button.disabled).toBe(true)
    expect(button.textContent).toBe("Activating...")
  })

  it("shows error message without clearing input", async () => {
    await renderLicenseActivation({
      licenseKey: "TVLT-1234-5678-ABCD",
      errorMessage: "Invalid license key"
    })

    const input = container?.querySelector("[data-testid='license-key-input']") as HTMLInputElement

    expect(container?.textContent).toContain("Invalid license key")
    expect(input.value).toBe("TVLT-1234-5678-ABCD")
  })

  it("shows success state with masked key when licensed", async () => {
    await renderLicenseActivation({
      licenseKey: "TVLT-1234-5678-ABCD",
      isLicensed: true
    })

    const card = container?.querySelector<HTMLElement>("[data-testid='license-activation-card']")
    expect(container?.textContent).toContain("Activated")
    expect(container?.textContent).toContain("ABCD")
    expect(container?.textContent).not.toContain("TVLT-1234-5678-ABCD")
    expect(card?.getAttribute("aria-labelledby")).toBe("license-activation-heading-active")
  })

  it("renders localized Chinese defaults when language is zh", async () => {
    await renderLicenseActivation({
      language: "zh",
      licenseKey: "TVLT-1234-5678-ABCD"
    })

    const card = container?.querySelector<HTMLElement>("[data-testid='license-activation-card']")
    expect(container?.textContent).toContain("\u6fc0\u6d3b TabVault")
    expect(container?.querySelector("[data-testid='license-key-input']")).not.toBeNull()
    expect(container?.querySelector("[data-testid='license-submit-button']")?.textContent).toBe("\u6fc0\u6d3b")
    expect(card?.getAttribute("aria-labelledby")).toBe("license-activation-heading-edit")
  })

  it("switches from edit state to activated state when isLicensed becomes true", async () => {
    await renderLicenseActivation({
      licenseKey: "TVLT-1234-5678-ABCD",
      isLicensed: false
    })

    expect(container?.textContent).toContain("Activate TabVault")

    await renderLicenseActivation({
      licenseKey: "TVLT-1234-5678-ABCD",
      isLicensed: true
    })

    expect(container?.textContent).toContain("Activated")
    expect(container?.querySelector("[data-testid='license-key-input']")).toBeNull()
  })

  it("returns to edit state and calls onEdit when clicking Change license key", async () => {
    const onEdit = vi.fn()
    await renderLicenseActivation({
      licenseKey: "TVLT-1234-5678-ABCD",
      isLicensed: true,
      onEdit
    })

    const changeButton = container?.querySelector("[data-testid='license-change-button']") as HTMLButtonElement

    await act(async () => {
      changeButton.click()
    })

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(container?.textContent).toContain("Activate TabVault")
    expect(container?.querySelector("[data-testid='license-key-input']")).not.toBeNull()
  })

  it("calls onSubmit when clicking Activate", async () => {
    const onSubmit = vi.fn()
    await renderLicenseActivation({
      licenseKey: "TVLT-1234-5678-ABCD",
      onSubmit
    })

    const button = container?.querySelector("[data-testid='license-submit-button']") as HTMLButtonElement

    await act(async () => {
      button.click()
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("renders outer card with style hook test id", async () => {
    await renderLicenseActivation({ licenseKey: "TVLT-1234-5678-ABCD" })

    const card = container?.querySelector("[data-testid='license-activation-card']") as HTMLDivElement
    expect(card).not.toBeNull()
    expect(card.style.borderRadius).not.toBe("")
  })
})
