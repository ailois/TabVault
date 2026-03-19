import { useEffect, useState } from "react"
import { darkTokens, lightTokens, shadow, type ThemeTokens } from "./design-tokens"
import type { ThemeOverride, ThemeRepository } from "../lib/config/theme-repository"
import { ChromeThemeRepository } from "../lib/config/theme-repository"

export type Theme = ThemeTokens & {
  shadow: string
  isDark: boolean
}

// Exported for unit testing
export function buildThemeFromOverride(override: ThemeOverride, osDark = false): Theme {
  const dark = override !== undefined ? override === "dark" : osDark
  const tokens = dark ? darkTokens : lightTokens
  return {
    ...tokens,
    shadow: dark ? shadow.dark : shadow.light,
    isDark: dark
  }
}

function prefersDark(): boolean {
  if (typeof window === "undefined") return false
  if (typeof window.matchMedia !== "function") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

const defaultRepo = new ChromeThemeRepository()

export type ThemeWithToggle = Theme & {
  toggle: () => void
}

export function useTheme(repo: ThemeRepository = defaultRepo): ThemeWithToggle {
  const [override, setOverride] = useState<ThemeOverride>(undefined)
  const [osDark, setOsDark] = useState(prefersDark)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void repo.getTheme().then((stored) => {
      setOverride(stored)
      setReady(true)
    })
  }, [repo])

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => setOsDark(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    const listener = (message: any) => {
      if (message?.type === "THEME_CHANGED" && (message.theme === "light" || message.theme === "dark")) {
        setOverride(message.theme as "light" | "dark")
      }
    }
    globalThis.chrome?.runtime?.onMessage?.addListener(listener)
    return () => globalThis.chrome?.runtime?.onMessage?.removeListener(listener)
  }, [])

  const currentTheme = buildThemeFromOverride(ready ? override : undefined, osDark)

  function toggle(): void {
    const next: "light" | "dark" = currentTheme.isDark ? "light" : "dark"
    // Optimistic update — takes effect immediately in this page
    setOverride(next)
    // Persist to storage
    void repo.setTheme(next)
    // Notify other open extension pages (sidepanel, etc.)
    globalThis.chrome?.runtime?.sendMessage({ type: "THEME_CHANGED", theme: next })
  }

  return { ...currentTheme, toggle }
}
