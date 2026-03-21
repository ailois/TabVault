// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TrialBanner, type TrialBannerProps } from "../../src/components/trial-banner"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("TrialBanner", () => {
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

  async function renderBanner(props: Partial<TrialBannerProps> = {}) {
    if (!container) {
      container = document.createElement("div")
      document.body.appendChild(container)
    }

    if (!root) {
      root = createRoot(container)
    }

    const mergedProps: TrialBannerProps = {
      status: "trial",
      message: "You have 13 days left in your trial.",
      ctaLabel: "Activate license",
      ...props
    }

    await act(async () => {
      root?.render(<TrialBanner {...mergedProps} />)
    })
  }

  it("renders trial default title and message", async () => {
    await renderBanner({ status: "trial", message: "Trial is active now." })

    expect(container?.textContent).toContain("Trial active")
    expect(container?.textContent).toContain("Trial is active now.")
  })

  it("renders expired default title and message", async () => {
    await renderBanner({ status: "expired", message: "Your trial has ended." })

    expect(container?.textContent).toContain("Trial expired")
    expect(container?.textContent).toContain("Your trial has ended.")
  })

  it("overrides default title when custom title is provided", async () => {
    await renderBanner({ status: "trial", title: "Welcome back", message: "Custom title should render." })

    expect(container?.textContent).toContain("Welcome back")
    expect(container?.textContent).not.toContain("Trial active")
  })

  it("renders detail text when detail is provided", async () => {
    await renderBanner({ detail: "Upgrade to unlock all features." })

    expect(container?.textContent).toContain("Upgrade to unlock all features.")
  })

  it("calls onCtaClick when CTA button is clicked", async () => {
    const onCtaClick = vi.fn()
    await renderBanner({ onCtaClick })

    const button = container?.querySelector<HTMLButtonElement>("[data-testid='trial-banner-cta']")

    await act(async () => {
      button?.click()
    })

    expect(onCtaClick).toHaveBeenCalledTimes(1)
  })

  it("disables CTA button when onCtaClick is not provided", async () => {
    await renderBanner({ onCtaClick: undefined })

    const button = container?.querySelector<HTMLButtonElement>("[data-testid='trial-banner-cta']")
    expect(button?.disabled).toBe(true)
  })

  it("renders stable data testid hooks", async () => {
    await renderBanner()

    const banner = container?.querySelector<HTMLElement>("[data-testid='trial-banner']")
    const cta = container?.querySelector<HTMLElement>("[data-testid='trial-banner-cta']")

    expect(banner).not.toBeNull()
    expect(cta).not.toBeNull()
  })

  it("reuses a single mounted banner when rerendering in the same test", async () => {
    await renderBanner({ status: "trial" })
    await renderBanner({ status: "expired" })

    expect(document.querySelectorAll("[data-testid='trial-banner']")).toHaveLength(1)
  })

  it("exposes semantic status hook for trial and expired states", async () => {
    await renderBanner({ status: "trial" })
    let banner = container?.querySelector<HTMLElement>("[data-testid='trial-banner']")
    expect(banner?.getAttribute("data-trial-status")).toBe("trial")

    await renderBanner({ status: "expired" })
    banner = container?.querySelector<HTMLElement>("[data-testid='trial-banner']")
    expect(banner?.getAttribute("data-trial-status")).toBe("expired")
  })

  it("renders content area and CTA at the same time", async () => {
    await renderBanner({
      status: "expired",
      message: "Your trial expired.",
      ctaLabel: "Buy now"
    })

    const banner = container?.querySelector<HTMLElement>("[data-testid='trial-banner']")
    const button = container?.querySelector<HTMLButtonElement>("[data-testid='trial-banner-cta']")

    expect(banner?.textContent).toContain("Your trial expired.")
    expect(button?.textContent).toBe("Buy now")
  })
})
