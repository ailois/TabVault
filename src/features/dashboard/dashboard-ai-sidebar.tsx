import React from "react"

import type { SettingsRepository } from "../../lib/config/settings-repository"
import { getMessage } from "../../lib/i18n/messages"
import type { AiProvider } from "../../lib/providers/provider"
import type { BookmarkRecord } from "../../types/bookmark"
import type { DisplayLanguage, ProviderConfig } from "../../types/settings"
import { spacing } from "../../ui/design-tokens"
import { DashboardAskBox } from "./dashboard-ask-box"
import { EditableSummaryCard } from "./editable-summary-card"
import { EditableTagsCard } from "./editable-tags-card"

type DashboardAiSidebarProps = {
  bookmark: BookmarkRecord | null
  bookmarks?: BookmarkRecord[]
  language?: DisplayLanguage
  onSaveSummary?: (summary: string) => Promise<void>
  onSaveTags?: (aiTags: string[], userTags: string[]) => Promise<void>
  settingsRepository?: SettingsRepository
  createProvider?: (config: ProviderConfig) => AiProvider
  onOpenBookmark?: (bookmarkId: string) => void
}

export function DashboardAiSidebar({
  bookmark,
  bookmarks,
  language = "en",
  onSaveSummary = async () => {},
  onSaveTags = async () => {},
  settingsRepository,
  createProvider,
  onOpenBookmark
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
      <EditableTagsCard aiTags={bookmark?.aiTags ?? []} language={language} userTags={bookmark?.userTags ?? []} onSave={onSaveTags} />
      <EditableSummaryCard language={language} summary={bookmark?.summary} onSave={onSaveSummary} />
      <DashboardAskBox
        bookmark={bookmark}
        bookmarks={bookmarks}
        createProvider={createProvider}
        language={language}
        onOpenBookmark={onOpenBookmark}
        settingsRepository={settingsRepository}
      />
    </aside>
  )
}
