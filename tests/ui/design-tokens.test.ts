import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const globalsCss = readFileSync(new URL("../../src/styles/globals.css", import.meta.url), "utf8")
const tailwindConfig = readFileSync(new URL("../../tailwind.config.js", import.meta.url), "utf8")

describe("semantic theme system", () => {
  it("defines all six supported data-theme datasets", () => {
    expect(globalsCss).toContain('[data-theme="cloud"]')
    expect(globalsCss).toContain('[data-theme="obsidian"]')
    expect(globalsCss).toContain('[data-theme="sage"]')
    expect(globalsCss).toContain('[data-theme="breeze"]')
    expect(globalsCss).toContain('[data-theme="taro"]')
    expect(globalsCss).toContain('[data-theme="vanilla"]')
  })

  it("defines the required semantic CSS variables in each theme", () => {
    for (const varName of [
      "--bg-base",
      "--bg-surface",
      "--text-primary",
      "--text-secondary",
      "--border-subtle",
      "--accent-primary",
      "--accent-hover",
      "--accent-muted"
    ]) {
      expect(globalsCss).toContain(varName)
    }
  })

  it("maps tailwind semantic colors to CSS variables", () => {
    expect(tailwindConfig).toContain("accent-primary")
    expect(tailwindConfig).toContain("var(--bg-base)")
    expect(tailwindConfig).toContain("var(--accent-primary)")
  })

  it("defines a default theme on :root", () => {
    expect(globalsCss).toMatch(/:root[\s\S]*?--bg-base/)
  })

  it("includes shared utility styles for no-scrollbar", () => {
    expect(globalsCss).toContain("no-scrollbar")
  })
})
