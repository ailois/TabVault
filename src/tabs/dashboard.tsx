import "../styles/globals.css"
import React from "react"
import ReactDOM from "react-dom/client"

import { DashboardShell } from "../features/dashboard/dashboard-shell"
import { ChromeThemeRepository } from "../lib/config/theme-repository"
import { ThemeProvider } from "../ui/theme-context"
import { useGlobalStyles } from "../ui/use-global-styles"
import { useTheme } from "../ui/use-theme"

const themeRepository = new ChromeThemeRepository()

function DashboardApp() {
  const theme = useTheme(themeRepository)
  useGlobalStyles(theme)

  return (
    <ThemeProvider theme={theme}>
      <DashboardShell />
    </ThemeProvider>
  )
}

const rootElement = document.getElementById("root") ?? document.body.appendChild(document.createElement("div"))
ReactDOM.createRoot(rootElement).render(<DashboardApp />)
