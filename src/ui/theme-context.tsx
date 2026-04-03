import React, { createContext, useContext } from "react"
import type { ThemeWithToggle } from "./use-theme"
import { lightTokens, shadow } from "./design-tokens"

const fallbackTheme: ThemeWithToggle = {
  ...lightTokens,
  name: "sage",
  shadow: shadow.light,
  isDark: false,
  setTheme: () => {},
  setCustomAccentColor: () => {},
  toggle: () => {}
}

export const ThemeContext = createContext<ThemeWithToggle>(fallbackTheme)

export function useThemeContext(): ThemeWithToggle {
  return useContext(ThemeContext)
}

type ThemeProviderProps = {
  theme: ThemeWithToggle
  children: React.ReactNode
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
