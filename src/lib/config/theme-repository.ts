import type { ThemeName } from "../../types/settings"

export type ThemeOverride = ThemeName | undefined

const THEME_KEY = "themeOverride"
const CUSTOM_ACCENT_KEY = "customAccentColor"

const NAMED_THEMES: ThemeName[] = ["cloud", "obsidian", "sage", "breeze", "taro", "vanilla", "custom"]

export interface ThemeRepository {
  getTheme(): Promise<ThemeOverride>
  setTheme(theme: ThemeName): Promise<void>
  getCustomAccent?(): Promise<string | undefined>
  setCustomAccent?(color: string): Promise<void>
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

  async getCustomAccent(): Promise<string | undefined> {
    const result = await chrome.storage.local.get(CUSTOM_ACCENT_KEY)
    const value = result[CUSTOM_ACCENT_KEY] as string | undefined
    return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : undefined
  }

  async setCustomAccent(color: string): Promise<void> {
    await chrome.storage.local.set({ [CUSTOM_ACCENT_KEY]: color })
  }
}
