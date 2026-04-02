import { describe, expect, it, vi, beforeEach } from "vitest"
import { ChromeThemeRepository } from "../../../src/lib/config/theme-repository"

describe("ChromeThemeRepository", () => {
  beforeEach(() => {
    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn(async (_key: string) => ({})),
          set: vi.fn(async () => {})
        }
      }
    } as any
  })

  it("returns undefined when no override is stored", async () => {
    const repo = new ChromeThemeRepository()
    const result = await repo.getTheme()
    expect(result).toBeUndefined()
  })

  it("returns a stored named design theme", async () => {
    ;(chrome.storage.local.get as any).mockResolvedValue({ themeOverride: "obsidian" })
    const repo = new ChromeThemeRepository()
    expect(await repo.getTheme()).toBe("obsidian")
  })

  it("writes named design theme values to chrome.storage.local", async () => {
    const repo = new ChromeThemeRepository()
    await repo.setTheme("sage")
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ themeOverride: "sage" })
  })
})
