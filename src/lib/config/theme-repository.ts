export type ThemeOverride = "light" | "dark" | undefined

const THEME_KEY = "themeOverride"

export interface ThemeRepository {
  getTheme(): Promise<ThemeOverride>
  setTheme(theme: "light" | "dark"): Promise<void>
}

export class ChromeThemeRepository implements ThemeRepository {
  async getTheme(): Promise<ThemeOverride> {
    const result = await chrome.storage.local.get(THEME_KEY)
    const value = result[THEME_KEY] as string | undefined
    if (value === "light" || value === "dark") return value
    return undefined
  }

  async setTheme(theme: "light" | "dark"): Promise<void> {
    await chrome.storage.local.set({ [THEME_KEY]: theme })
  }
}
