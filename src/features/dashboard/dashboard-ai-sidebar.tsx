import React from "react"

import type { BookmarkRecord } from "../../types/bookmark"
import { spacing } from "../../ui/design-tokens"
import { DashboardAskBox } from "./dashboard-ask-box"
import { EditableSummaryCard } from "./editable-summary-card"
import { EditableTagsCard } from "./editable-tags-card"

type DashboardAiSidebarProps = {
  bookmark: BookmarkRecord | null
  onSaveSummary?: (summary: string) => Promise<void>
  onSaveTags?: (aiTags: string[], userTags: string[]) => Promise<void>
}

export function DashboardAiSidebar({ bookmark, onSaveSummary = async () => {}, onSaveTags = async () => {} }: DashboardAiSidebarProps) {
  return (
    <div
      data-testid="dashboard-ai-sidebar"
      style={{
        display: "grid",
        gap: spacing.md,
        alignContent: "start"
      }}
    >
      <EditableTagsCard aiTags={bookmark?.aiTags ?? []} userTags={bookmark?.userTags ?? []} onSave={onSaveTags} />
      <EditableSummaryCard summary={bookmark?.summary} onSave={onSaveSummary} />
      <DashboardAskBox bookmark={bookmark} />
    </div>
  )
}
