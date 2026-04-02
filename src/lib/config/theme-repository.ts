import type { ThemeName } from "../../types/settings"

export type ThemeOverride = ThemeName | undefined

const THEME_KEY = "themeOverride"

const NAMED_THEMES: ThemeName[] = ["cloud", "obsidian", "sage", "breeze", "taro", "vanilla"]

export interface ThemeRepository {
  getTheme(): Promise<ThemeOverride>
  setTheme(theme: ThemeName): Promise<void>
}

export class ChromeThemeRepository implements ThemeRepository {
  async getTheme(): Promise<ThemeOverride> {
    const result = await chrome.storage.local.get(THEME_KEY)
    const value = result[THEME_KEY] as string | undefined
    return NAMED_THEMES.includes(value as ThemeName) ? (value as ThemeName) : undefined
  }

  async setTheme(theme: ThemeName): Promise<void> {
    await chrome.storage.local.set({ [THEME_KEY]: theme })
  }
}
