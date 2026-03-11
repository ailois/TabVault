import { describe, expect, it } from "vitest"
import packageJson from "../../package.json"

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
})
