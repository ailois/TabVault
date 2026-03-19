import { useEffect } from "react"
import { buildGlobalStyles } from "./design-tokens"
import type { Theme } from "./use-theme"

/**
 * Custom hook to inject global styles and manage body background color based on the current theme.
 * This ensures the entire viewport has the correct background color and theme-specific global styles (like scrollbars and focus rings).
 */
export function useGlobalStyles(theme: Theme): void {
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = buildGlobalStyles(theme)
    document.head.appendChild(style)
    document.documentElement.style.backgroundColor = theme.page
    document.body.style.backgroundColor = theme.page

    return () => {
      style.remove()
      document.documentElement.style.backgroundColor = ""
      document.body.style.backgroundColor = ""
    }
  }, [theme])
}
