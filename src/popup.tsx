import React, { useEffect, useMemo, useState } from "react"

import { ErrorBanner } from "./components/error-banner"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { saveCurrentPage as defaultSaveCurrentPage } from "./features/bookmarks/save-current-page"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import { extractPage as defaultExtractPage } from "./lib/extraction/extract-page"
import type { AiProvider } from "./lib/providers/provider"
import { createProvider as defaultCreateProvider } from "./lib/providers/provider-factory"
import type { BookmarkRepository } from "./lib/storage/bookmark-repository"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"
import { openCurrentTabSidePanel, openDashboardTab, openSettingsPage } from "./lib/utils/navigation"
import type { BookmarkRecord } from "./types/bookmark"
import type { ProviderConfig } from "./types/settings"
import { radius, spacing } from "./ui/design-tokens"
import { ThemeProvider } from "./ui/theme-context"
import { useGlobalStyles } from "./ui/use-global-styles"
import { useTheme } from "./ui/use-theme"

type PopupProps = {
  services?: Partial<PopupServices>
}

type PopupServices = {
  bookmarkRepository: BookmarkRepository
  settingsRepository: SettingsRepository
  saveCurrentPage: typeof defaultSaveCurrentPage
  analyzeBookmark: typeof defaultAnalyzeBookmark
  extractPage: typeof defaultExtractPage
  queryActiveTab: () => Promise<ChromeTab | undefined>
  createProvider: (config: ProviderConfig) => AiProvider
  themeRepository: ThemeRepository
}

type ChromeTab = {
  id?: number
  title?: string | null
  url?: string | null
}

const DEFAULT_POPUP_SERVICES: PopupServices = {
  bookmarkRepository: new IndexedDbBookmarkRepository(),
  settingsRepository: new ChromeSettingsRepository(),
  saveCurrentPage: defaultSaveCurrentPage,
  analyzeBookmark: defaultAnalyzeBookmark,
  extractPage: defaultExtractPage,
  queryActiveTab: async () => {
    const [activeTab] = await (globalThis.chrome?.tabs?.query({
      active: true,
      currentWindow: true
    }) ?? Promise.resolve([]))

    return activeTab
  },
  createProvider: defaultCreateProvider,
  themeRepository: new ChromeThemeRepository()
}

function Popup({ services }: PopupProps) {
  const popupServices = useMemo(() => ({ ...DEFAULT_POPUP_SERVICES, ...services }), [services])
  const theme = useTheme(popupServices.themeRepository)
  useGlobalStyles(theme)

  const [statusMessage, setStatusMessage] = useState("Ready to save the current page.")
  const [statusTone, setStatusTone] = useState<"info" | "success">("info")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentPageTitle, setCurrentPageTitle] = useState("Loading current page...")
  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null)

  useEffect(() => {
    async function loadCurrentPage(): Promise<void> {
      try {
        const activeTab = await popupServices.queryActiveTab()
        setCurrentPageTitle(activeTab?.title?.trim() || "Current page unavailable")
        setCurrentPageUrl(activeTab?.url?.trim() || null)
      } catch {
        setCurrentPageTitle("Current page unavailable")
        setCurrentPageUrl(null)
      }
    }

    void loadCurrentPage()
  }, [popupServices])

  async function handleSaveCurrentPage(): Promise<void> {
    setIsSaving(true)
    setIsAnalyzing(false)
    setErrorMessage(null)
    setStatusTone("info")
    setStatusMessage("Saving current page...")

    try {
      const activeTab = await popupServices.queryActiveTab()
      const extractedText = typeof activeTab?.id === "number"
        ? await popupServices.extractPage(activeTab.id)
        : undefined
      const savedBookmark = await popupServices.saveCurrentPage({
        activeTab: activeTab ?? {},
        extractedText,
        bookmarkRepository: popupServices.bookmarkRepository
      })

      setCurrentPageTitle(savedBookmark.title)
      setCurrentPageUrl(savedBookmark.url)
      setStatusTone("success")
      setStatusMessage(`Saved: ${savedBookmark.title}`)
      await maybeAnalyzeBookmark(savedBookmark)
    } catch (error) {
      setErrorMessage(getSaveErrorMessage(error))
      setStatusTone("info")
      setStatusMessage("Ready to save the current page.")
    } finally {
      setIsSaving(false)
    }
  }

  async function maybeAnalyzeBookmark(bookmark: BookmarkRecord): Promise<void> {
    const settings = await popupServices.settingsRepository.getAppSettings()

    if (!settings.autoAnalyzeOnSave) {
      return
    }

    const providers = await popupServices.settingsRepository.getProviders()
    const selectedProvider = providers.find(
      (provider) => provider.enabled && provider.provider === settings.defaultProvider
    )

    if (!selectedProvider?.apiKey.trim()) {
      setErrorMessage("Add an API key in Settings to enable automatic analysis.")
      return
    }

    setIsAnalyzing(true)
    setStatusTone("info")
    setStatusMessage("Analyzing saved bookmark...")

    try {
      await popupServices.analyzeBookmark({
        bookmark,
        provider: popupServices.createProvider(selectedProvider),
        bookmarkRepository: popupServices.bookmarkRepository
      })
      setStatusTone("success")
      setStatusMessage(`Saved: ${bookmark.title}`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to analyze bookmark"))
      setStatusTone("success")
      setStatusMessage(`Saved: ${bookmark.title}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const pageStyle: React.CSSProperties = {
    width: "320px",
    minHeight: "320px",
    overflow: "hidden",
    backgroundColor: theme.page,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column"
  }

  const shellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    minHeight: "100%",
    backgroundColor: theme.page
  }

  const iconButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    color: theme.textMuted,
    padding: "4px",
    borderRadius: radius.small,
    lineHeight: 1,
    transition: "color 0.15s ease"
  }

  const currentPageCardStyle: React.CSSProperties = {
    margin: `${spacing.md} ${spacing.md} ${spacing.sm}`,
    padding: spacing.md,
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: radius.large,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
  }

  const launchButtonStyle: React.CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: radius.medium,
    backgroundColor: theme.surface,
    color: theme.textSecondary,
    fontSize: "0.875rem",
    padding: `${spacing.sm} ${spacing.md}`,
    cursor: "pointer"
  }

  const statusTextStyle: React.CSSProperties = {
    margin: `0 ${spacing.md}`,
    fontSize: "0.8125rem",
    color: theme.textSuccess,
    padding: `0 0 ${spacing.xs}`
  }

  const stickyFooterStyle: React.CSSProperties = {
    marginTop: "auto",
    padding: spacing.md,
    borderTop: `1px solid ${theme.border}`,
    backgroundColor: theme.surface,
    boxShadow: theme.shadow
  }

  const primaryActionButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}`,
    border: "none",
    borderRadius: radius.large,
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.9375rem",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(99,102,241,0.22)"
  }

  return (
    <ThemeProvider theme={theme}>
      <main aria-labelledby="popup-title" style={pageStyle}>
        <div data-testid="popup-shell" style={shellStyle}>
          <header style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${spacing.sm} ${spacing.md}`,
            borderBottom: `1px solid ${theme.borderMuted}`,
            backgroundColor: theme.surface
          }}>
            <h1 id="popup-title" style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary, display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: theme.accent }}>✦</span>
              TabVault
              <span style={{ fontSize: "0.625rem", fontWeight: 800, background: theme.accentSoft, color: theme.accent, padding: "1px 5px", borderRadius: "4px" }}>PRO</span>
            </h1>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                aria-label={theme.isDark ? "Switch to light mode" : "Switch to dark mode"}
                data-testid="theme-toggle-button"
                onClick={() => theme.toggle()}
                style={iconButtonStyle}
                type="button"
              >
                {theme.isDark ? "☀️" : "🌙"}
              </button>
              <button
                aria-label="Open settings"
                onClick={() => void openSettingsPage()}
                style={iconButtonStyle}
                type="button"
              >
                ⚙️
              </button>
            </div>
          </header>

          <section style={currentPageCardStyle}>
            <div style={{ fontSize: "0.75rem", color: theme.textMuted, marginBottom: "4px" }}>
              正在浏览
            </div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: theme.textPrimary, lineHeight: 1.4, marginBottom: currentPageUrl ? "4px" : 0 }}>
              {currentPageTitle}
            </div>
            {currentPageUrl ? (
              <div style={{ fontSize: "0.75rem", color: theme.textSecondary, lineHeight: 1.4, wordBreak: "break-all" }}>
                {currentPageUrl}
              </div>
            ) : null}
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm, margin: `0 ${spacing.md} ${spacing.sm}` }}>
            <button
              data-testid="popup-open-sidepanel"
              onClick={() => void openCurrentTabSidePanel()}
              style={launchButtonStyle}
              type="button"
            >
              打开侧边栏
            </button>
            <button
              data-testid="popup-open-dashboard"
              onClick={() => void openDashboardTab()}
              style={launchButtonStyle}
              type="button"
            >
              控制台
            </button>
          </div>

          {errorMessage ? <div style={{ padding: `0 ${spacing.md} ${spacing.sm}` }}><ErrorBanner message={errorMessage} /></div> : null}
          {statusTone === "success" ? (
            <p aria-live="polite" role="status" style={statusTextStyle}>{statusMessage}</p>
          ) : null}

          <footer style={stickyFooterStyle}>
            <button
              data-testid="popup-primary-action"
              disabled={isSaving || isAnalyzing}
              onClick={() => void handleSaveCurrentPage()}
              style={primaryActionButtonStyle}
              type="button"
            >
              {isAnalyzing ? "Analyzing..." : isSaving ? "Saving..." : "Save current page"}
            </button>
          </footer>
        </div>
      </main>
    </ThemeProvider>
  )
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function getSaveErrorMessage(error: unknown): string {
  const message = getErrorMessage(error, "Failed to save current page")

  if (message === "Active tab title is required" || message === "Active tab URL is required") {
    return "Current tab can't be saved because its title or URL is unavailable."
  }

  return message
}

export default Popup
