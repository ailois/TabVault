import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { spacing } from "../../ui/design-tokens"
import { useThemeContext } from "../../ui/theme-context"
import { DashboardAskBox } from "./dashboard-ask-box"
import { EditableSummaryCard } from "./editable-summary-card"
import { EditableTagsCard } from "./editable-tags-card"

type DashboardAiSidebarProps = {
  bookmark: BookmarkRecord | null
  onSaveSummary?: (summary: string) => Promise<void>
  onSaveTags?: (aiTags: string[], userTags: string[]) => Promise<void>
}

export function DashboardAiSidebar({ bookmark, onSaveSummary = async () => {}, onSaveTags = async () => {} }: DashboardAiSidebarProps) {
  const theme = useThemeContext()

  return (
    <aside
      data-testid="dashboard-ai-sidebar"
      style={{
        width: "320px",
        borderLeft: `1px solid ${theme.border}`,
        backgroundColor: theme.surface,
        padding: spacing.md,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: spacing.md
      }}
    >
      <EditableSummaryCard summary={bookmark?.summary} onSave={onSaveSummary} />
      <EditableTagsCard aiTags={bookmark?.aiTags ?? []} userTags={bookmark?.userTags ?? []} onSave={onSaveTags} />
      <DashboardAskBox bookmark={bookmark} />
    </aside>
  )
}
