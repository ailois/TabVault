import "./styles/globals.css"
import React, { useEffect, useMemo, useState } from "react"

import { ErrorBanner } from "./components/error-banner"
import { analyzeBookmark as defaultAnalyzeBookmark } from "./features/ai/analyze-bookmark"
import { saveCurrentPage as defaultSaveCurrentPage } from "./features/bookmarks/save-current-page"
import { ChromeSettingsRepository } from "./lib/config/chrome-settings-repository"
import type { SettingsRepository } from "./lib/config/settings-repository"
import { ChromeThemeRepository } from "./lib/config/theme-repository"
import type { ThemeRepository } from "./lib/config/theme-repository"
import { extractPage as defaultExtractPage } from "./lib/extraction/extract-page"
import { getMessage } from "./lib/i18n/messages"
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

function formatSavedStatus(title: string, t: (key: Parameters<typeof getMessage>[1]) => string): string {
  return `${t("popup.status.savedPrefix")}${title}`
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

  const [displayLanguage, setDisplayLanguage] = useState<"en" | "zh">("en")
  const t = useMemo(() => (key: Parameters<typeof getMessage>[1]) => getMessage(displayLanguage, key), [displayLanguage])
  const [statusMessage, setStatusMessage] = useState(() => getMessage("en", "popup.status.ready"))
  const [statusTone, setStatusTone] = useState<"info" | "success">("info")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentPageTitle, setCurrentPageTitle] = useState(() => getMessage("en", "popup.currentPage.loading"))
  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null)

  useEffect(() => {
    void popupServices.settingsRepository.getAppSettings().then((settings) => {
      setDisplayLanguage(settings.displayLanguage)
      setStatusMessage(getMessage(settings.displayLanguage, "popup.status.ready"))
    })
  }, [popupServices])

  useEffect(() => {
    async function loadCurrentPage(): Promise<void> {
      try {
        const activeTab = await popupServices.queryActiveTab()
        setCurrentPageTitle(activeTab?.title?.trim() || t("popup.currentPage.unavailable"))
        setCurrentPageUrl(activeTab?.url?.trim() || null)
      } catch {
        setCurrentPageTitle(t("popup.currentPage.unavailable"))
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
    setStatusMessage(t("popup.status.saving"))

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
      setStatusMessage(formatSavedStatus(savedBookmark.title, t))
      await maybeAnalyzeBookmark(savedBookmark)
    } catch (error) {
      setErrorMessage(getSaveErrorMessage(error, t))
      setStatusTone("info")
      setStatusMessage(t("popup.status.ready"))
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
      setErrorMessage(t("popup.error.apiKeyMissing"))
      return
    }

    setIsAnalyzing(true)
    setStatusTone("info")
    setStatusMessage(t("popup.status.analyzing"))

    try {
      await popupServices.analyzeBookmark({
        bookmark,
        provider: popupServices.createProvider(selectedProvider),
        bookmarkRepository: popupServices.bookmarkRepository
      })
      setStatusTone("success")
      setStatusMessage(formatSavedStatus(bookmark.title, t))
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t("popup.error.analyzeFallback")))
      setStatusTone("success")
      setStatusMessage(formatSavedStatus(bookmark.title, t))
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
    flexDirection: "column",
    padding: spacing.md
  }

  const shellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    minHeight: "100%",
    backgroundColor: theme.page,
    gap: spacing.md
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
    padding: spacing.md,
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: radius.xl,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: spacing.sm
  }

  const launchButtonStyle: React.CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: radius.medium,
    backgroundColor: theme.surface,
    color: theme.textSecondary,
    fontSize: "0.875rem",
    padding: `${spacing.sm} ${spacing.md}`,
    cursor: "pointer",
    minHeight: "40px"
  }

  const statusTextStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.8125rem",
    color: theme.textSuccess,
    paddingBottom: spacing.xs
  }

  const stickyFooterStyle: React.CSSProperties = {
    marginTop: "auto"
  }

  const primaryActionButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}`,
    border: "none",
    borderRadius: radius.medium,
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontWeight: 500,
    fontSize: "0.875rem",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    minHeight: "40px"
  }

  return (
    <ThemeProvider theme={theme}>
      <main aria-labelledby="popup-title" style={pageStyle}>
        <div data-testid="popup-shell" style={shellStyle}>
          <header style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: spacing.xs
          }}>
            <h1 id="popup-title" style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: theme.textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                aria-hidden="true"
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: theme.accent,
                  borderRadius: radius.small,
                  transform: "rotate(45deg)",
                  display: "inline-block"
                }}
              />
              TabVault
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
                aria-label={t("popup.actions.openSettings")}
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
              {t("popup.currentPage.label")}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm, marginBottom: spacing.sm }}>
            <button
              data-testid="popup-open-sidepanel"
              onClick={() => void openCurrentTabSidePanel()}
              style={launchButtonStyle}
              type="button"
            >
              {t("popup.actions.openSidepanel")}
            </button>
            <button
              data-testid="popup-open-dashboard"
              onClick={() => void openDashboardTab()}
              style={launchButtonStyle}
              type="button"
            >
              {t("popup.actions.openDashboard")}
            </button>
          </div>

          {errorMessage ? <div style={{ paddingBottom: spacing.sm }}><ErrorBanner message={errorMessage} /></div> : null}
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
              {isAnalyzing ? t("popup.primary.analyzing") : isSaving ? t("popup.primary.saving") : t("popup.primary.save")}
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

function getSaveErrorMessage(error: unknown, t: (key: Parameters<typeof getMessage>[1]) => string): string {
  const message = getErrorMessage(error, t("popup.error.saveFallback"))

  if (message === "Active tab title is required" || message === "Active tab URL is required") {
    return t("popup.error.saveUnavailableMetadata")
  }

  return message
}

export default Popup
