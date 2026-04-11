import React from "react"

import type { GhostreaderBookmarkAddedPayload } from "../../features/ghostreader-session/ghostreader-bookmark-events"
import type { ChromeGhostreaderSessionStore } from "../../features/ghostreader-session/ghostreader-session-store"
import type { SettingsRepository } from "../../lib/config/settings-repository"
import { getMessage } from "../../lib/i18n/messages"
import type { AiProvider } from "../../lib/providers/provider"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage, ProviderConfig } from "../../types/settings"
import { spacing } from "../../ui/design-tokens"
import { DashboardAskBox } from "./dashboard-ask-box"

type DashboardAiSidebarProps = {
  bookmark: BookmarkRecord | null
  bookmarks?: BookmarkRecord[]
  language?: DisplayLanguage
  settingsRepository?: SettingsRepository
  createProvider?: (config: ProviderConfig) => AiProvider
  onOpenBookmark?: (bookmarkId: string) => void
  ghostreaderSessionStore?: Pick<ChromeGhostreaderSessionStore, "loadSessions" | "saveSessions" | "clearActiveSession">
  latestGhostreaderBookmarkEvent?: GhostreaderBookmarkAddedPayload | null
}

export function DashboardAiSidebar({
  bookmark,
  bookmarks,
  language = "en",
  settingsRepository,
  createProvider,
  onOpenBookmark,
  ghostreaderSessionStore,
  latestGhostreaderBookmarkEvent
}: DashboardAiSidebarProps) {
  const t = (key: Parameters<typeof getMessage>[1]) => getMessage(language, key)

  return (
    <aside
      aria-label={t("dashboard.aiSidebar.label")}
      data-testid="dashboard-ai-sidebar"
      style={{
        display: "grid",
        gap: spacing.md,
        alignContent: "start"
      }}
    >
      <DashboardAskBox
        bookmark={bookmark}
        bookmarks={bookmarks}
        createProvider={createProvider}
        language={language}
        onOpenBookmark={onOpenBookmark}
        settingsRepository={settingsRepository}
        ghostreaderSessionStore={ghostreaderSessionStore}
        latestGhostreaderBookmarkEvent={latestGhostreaderBookmarkEvent}
      />
    </aside>
  )
}
