import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import Options from "../../src/options"

describe("Options", () => {
  it("renders a minimal settings placeholder", () => {
    const markup = renderToStaticMarkup(<Options />)

    expect(markup).toContain("TabVault Settings")
    expect(markup).toContain("Default provider")
    expect(markup).toContain("Settings UI coming soon")
  })
})
