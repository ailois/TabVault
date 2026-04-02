import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import packageJson from "../../package.json"

const popupSource = readFileSync(new URL("../../src/popup.tsx", import.meta.url), "utf8")
const optionsSource = readFileSync(new URL("../../src/options.tsx", import.meta.url), "utf8")
const sidepanelSource = readFileSync(new URL("../../src/sidepanel.tsx", import.meta.url), "utf8")
const dashboardSource = readFileSync(new URL("../../src/tabs/dashboard.tsx", import.meta.url), "utf8")

describe("extension manifest configuration", () => {
  it("declares popup save permissions in package.json manifest overrides", () => {
    const packageJsonWithManifest = packageJson as typeof packageJson & {
      manifest?: {
        permissions?: string[]
      }
    }

    expect(packageJsonWithManifest.manifest?.permissions).toEqual([
      "storage",
      "activeTab",
      "scripting",
      "sidePanel",
      "bookmarks"
    ])
  })

  it("declares the tailwind toolchain in devDependencies", () => {
    expect(packageJson.devDependencies).toMatchObject({
      tailwindcss: expect.any(String),
      postcss: expect.any(String),
      autoprefixer: expect.any(String)
    })
  })

  it("imports the shared global stylesheet in every app entry surface", () => {
    for (const source of [popupSource, optionsSource, sidepanelSource, dashboardSource]) {
      expect(source).toContain("styles/globals.css")
    }
  })
})
