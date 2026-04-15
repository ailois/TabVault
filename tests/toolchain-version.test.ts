import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("toolchain version pinning", () => {
  it("pins vitest to the known-good exact version for fresh installs", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as {
      devDependencies?: Record<string, string>
    }

    expect(packageJson.devDependencies?.vitest).toBe("4.0.18")
  })
})
