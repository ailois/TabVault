import { useEffect, useState } from "react"

import { darkTokens, lightTokens, shadow, type ThemeTokens } from "./design-tokens"
import type { ThemeName } from "../types/settings"
import type { ThemeOverride, ThemeRepository } from "../lib/config/theme-repository"
import { ChromeThemeRepository } from "../lib/config/theme-repository"

export type Theme = ThemeTokens & {
  name: ThemeName
  shadow: string
  isDark: boolean
}

const THEME_TOKEN_MAP: Record<ThemeName, Theme> = {
  cloud: {
    ...lightTokens,
    name: "cloud",
    shadow: shadow.light,
    isDark: false
  },
  obsidian: {
    ...darkTokens,
    name: "obsidian",
    shadow: shadow.dark,
    isDark: true
  },
  sage: {
    ...lightTokens,
    name: "sage",
    page: "#F4F7F4",
    surface: "#FFFFFF",
    surfaceElevated: "#F4F7F4",
    surfaceSubtle: "#F4F7F4",
    surfaceHover: "#EEF3EF",
    border: "#E8ECE8",
    borderMuted: "#E8ECE8",
    borderStrong: "#C9D5CB",
    borderFocus: "#6B8E73",
    accent: "#6B8E73",
    accentHover: "#5A7A61",
    accentSoft: "rgba(107,142,115,0.10)",
    textPrimary: "#2A332C",
    textSecondary: "#7A8A7D",
    textMuted: "#7A8A7D",
    shadow: shadow.light,
    isDark: false
  },
  breeze: {
    ...lightTokens,
    name: "breeze",
    page: "#F4F6F9",
    surface: "#FFFFFF",
    surfaceElevated: "#F4F6F9",
    surfaceSubtle: "#F4F6F9",
    surfaceHover: "#EDF2F7",
    border: "#E2E8F0",
    borderMuted: "#E2E8F0",
    borderStrong: "#B8C5D2",
    borderFocus: "#5B7C99",
    accent: "#5B7C99",
    accentHover: "#4A6782",
    accentSoft: "rgba(91,124,153,0.10)",
    textPrimary: "#2C353D",
    textSecondary: "#798A9C",
    textMuted: "#798A9C",
    shadow: shadow.light,
    isDark: false
  },
  taro: {
    ...lightTokens,
    name: "taro",
    page: "#F8F6F9",
    surface: "#FFFFFF",
    surfaceElevated: "#F8F6F9",
    surfaceSubtle: "#F8F6F9",
    surfaceHover: "#F3EFF5",
    border: "#EAE6EE",
    borderMuted: "#EAE6EE",
    borderStrong: "#CCBED8",
    borderFocus: "#9D8CBA",
    accent: "#9D8CBA",
    accentHover: "#8573A1",
    accentSoft: "rgba(157,140,186,0.10)",
    textPrimary: "#352E3D",
    textSecondary: "#8D7B9C",
    textMuted: "#8D7B9C",
    shadow: shadow.light,
    isDark: false
  },
  vanilla: {
    ...lightTokens,
    name: "vanilla",
    page: "#FDFBF7",
    surface: "#FFFFFF",
    surfaceElevated: "#FDFBF7",
    surfaceSubtle: "#FDFBF7",
    surfaceHover: "#F8F3ED",
    border: "#F5F2E9",
    borderMuted: "#F5F2E9",
    borderStrong: "#E7D9C7",
    borderFocus: "#D4A373",
    accent: "#D4A373",
    accentHover: "#C39362",
    accentSoft: "rgba(212,163,115,0.10)",
    textPrimary: "#3A3530",
    textSecondary: "#8C857E",
    textMuted: "#8C857E",
    shadow: shadow.light,
    isDark: false
  }
}

const FALLBACK_THEME: ThemeName = "sage"
const defaultRepo = new ChromeThemeRepository()

export function buildThemeFromOverride(override: ThemeOverride): Theme {
  if (!override) {
    return THEME_TOKEN_MAP[FALLBACK_THEME]
  }

  return THEME_TOKEN_MAP[override] ?? THEME_TOKEN_MAP[FALLBACK_THEME]
}

export type ThemeWithToggle = Theme & {
  setTheme: (theme: ThemeName) => void
  toggle: () => void
}

export function useTheme(repo: ThemeRepository = defaultRepo): ThemeWithToggle {
  const [override, setOverride] = useState<ThemeOverride>(undefined)

  useEffect(() => {
    void repo.getTheme().then((stored) => {
      setOverride(stored)
    })
  }, [repo])

  useEffect(() => {
    const activeTheme = buildThemeFromOverride(override)
    document.documentElement.dataset.theme = activeTheme.name
  }, [override])

  useEffect(() => {
    const listener = (message: { type?: string; theme?: ThemeName }) => {
      if (message?.type === "THEME_CHANGED" && message.theme && THEME_TOKEN_MAP[message.theme]) {
        setOverride(message.theme)
      }
    }

    globalThis.chrome?.runtime?.onMessage?.addListener(listener)
    return () => globalThis.chrome?.runtime?.onMessage?.removeListener(listener)
  }, [])

  const currentTheme = buildThemeFromOverride(override)

  function applyTheme(theme: ThemeName): void {
    setOverride(theme)
    void repo.setTheme(theme)
    globalThis.chrome?.runtime?.sendMessage({ type: "THEME_CHANGED", theme })
  }

  function toggle(): void {
    applyTheme(currentTheme.isDark ? "sage" : "obsidian")
  }

  return {
    ...currentTheme,
    setTheme: applyTheme,
    toggle
  }
}
