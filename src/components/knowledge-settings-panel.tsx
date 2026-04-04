import React from "react"

import type { DisplayLanguage } from "../types/settings"
import type { BookmarkRepository } from "../lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../types/bookmark"
import { spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type KnowledgeSettingsPanelProps = {
  bookmarkRepository: BookmarkRepository
  language?: DisplayLanguage
}

type KnowledgeStatus = "idle" | "saving" | "saved" | "running" | "done" | "error"

type ImportBookmarksResponse = {
  success?: boolean
  count?: number
  error?: string
}

type KnowledgeDraft = {
  embeddingModel: string
  chunkSize: string
  overlap: string
  blocklist: string
  strictUrlSanitization: boolean
}

const DEFAULT_KNOWLEDGE_DRAFT: KnowledgeDraft = {
  embeddingModel: "local-bge-m3-lite",
  chunkSize: "1000",
  overlap: "200",
  blocklist: "localhost\n127.0.0.1\n192.168.*\n*.bank.com",
  strictUrlSanitization: true
}

type KnowledgeCopy = {
  statusReady: string
  statusImporting: string
  statusImported: (count: number) => string
  statusExporting: string
  statusExported: string
  statusExportFailed: string
  statusImportFailed: string
  statusClearingErrors: string
  statusClearedErrors: string
  statusClearErrorsFailed: string
  statusClearingAll: string
  statusClearedAll: string
  statusClearAllFailed: string
  statusSaving: string
  statusSaved: string
  storageTitle: string
  storageLabel: string
  storageSummary: (bookmarkCount: number, summaryCount: number, chunkCount: number) => string
  importExportTitle: string
  importExportDescription: string
  importButton: string
  exportButton: string
  dangerTitle: string
  clearErrorsTitle: string
  clearErrorsDescription: string
  clearErrorsButton: string
  clearAllTitle: string
  clearAllDescription: string
  clearAllButton: string
  retrievalTitle: string
  embeddingLabel: string
  embeddingLocal: string
  embeddingOpenAi: string
  embeddingGemini: string
  embeddingDescription: string
  chunkSizeLabel: string
  overlapLabel: string
  rerankingTitle: string
  rerankingDescription: string
  rebuildButton: string
  privacyTitle: string
  blocklistLabel: string
  blocklistDescription: string
  sanitizationLabel: string
  sanitizationDescription: string
  saveButton: string
}

const KNOWLEDGE_COPY: Record<DisplayLanguage, Partial<KnowledgeCopy>> = {
  en: {
    statusReady: "Ready to save knowledge settings",
    statusImporting: "Importing Chrome bookmarks...",
    statusImported: (count) => `Imported ${count} bookmarks`,
    statusExporting: "Exporting knowledge base data...",
    statusExported: "Knowledge base exported",
    statusExportFailed: "Failed to export knowledge base",
    statusImportFailed: "Import failed",
    statusClearingErrors: "Clearing failed analysis records...",
    statusClearedErrors: "Failed analysis cleared",
    statusClearErrorsFailed: "Failed to clear failed analysis",
    statusClearingAll: "Clearing all AI analysis...",
    statusClearedAll: "All AI analysis cleared",
    statusClearAllFailed: "Failed to clear analysis",
    statusSaving: "Saving knowledge settings...",
    statusSaved: "Knowledge settings saved",
    storageTitle: "Storage Overview",
    storageLabel: "Local storage (IndexedDB)",
    storageSummary: (bookmarkCount, summaryCount, chunkCount) => `${bookmarkCount} bookmarks \u00b7 ${summaryCount} summaries \u00b7 ${chunkCount} vector chunks`,
    importExportTitle: "Import & export",
    importExportDescription: "Sync bookmarks from Chrome, or export your local TabVault library as JSON for backup.",
    importButton: "Import",
    exportButton: "Export library",
    dangerTitle: "Data cleanup (Danger Zone)",
    clearErrorsTitle: "Clear failed analysis records",
    clearErrorsDescription: "Remove only bookmarks whose latest AI analysis ended in an error state.",
    clearErrorsButton: "Clear failed analysis",
    clearAllTitle: "Clear all AI analysis",
    clearAllDescription: "Keep saved bookmarks, but remove all generated summaries, tags, and analysis metadata.",
    clearAllButton: "Clear all analysis",
    retrievalTitle: "Retrieval & Vector Architecture",
    embeddingLabel: "Embedding model",
    embeddingLocal: "Local only (BGE-M3-Lite) - recommended",
    embeddingOpenAi: "OpenAI (text-embedding-3-small)",
    embeddingGemini: "Gemini (text-embedding-004)",
    embeddingDescription: "Local embedding avoids sending bookmark content to remote APIs before retrieval is fully finalized.",
    chunkSizeLabel: "Chunk size",
    overlapLabel: "Overlap",
    rerankingTitle: "Reranking is planned but not active",
    rerankingDescription: "This screen preserves the planned retrieval architecture, but reranking and rebuild controls are not yet wired to production behavior.",
    rebuildButton: "Rebuild retrieval index (coming soon)",
    privacyTitle: "Privacy & Filtering Rules",
    blocklistLabel: "Blocklist",
    blocklistDescription: "URLs matching these rules should be excluded from import, indexing, and AI analysis. One rule per line.",
    sanitizationLabel: "Strict URL sanitization",
    sanitizationDescription: "Strip query strings, tokens, and session-style parameters before saving or indexing URLs.",
    saveButton: "Save knowledge settings"
  },
  zh: {
    statusReady: "可以保存知识库设置",
    statusImporting: "正在导入 Chrome 书签...",
    statusImported: (count) => `已导入 ${count} 条书签`,
    statusExporting: "正在导出知识库数据...",
    statusExported: "知识库已导出",
    statusExportFailed: "导出知识库失败",
    statusImportFailed: "导入失败",
    statusClearingErrors: "正在清理失败分析记录...",
    statusClearedErrors: "失败分析已清理",
    statusClearErrorsFailed: "清理失败分析失败",
    statusClearingAll: "正在清空全部 AI 分析...",
    statusClearedAll: "全部 AI 分析已清空",
    statusClearAllFailed: "清空分析失败",
    statusSaving: "正在保存知识库设置...",
    statusSaved: "知识库设置已保存",
    storageTitle: "存储概览",
    storageLabel: "本地存储（IndexedDB）",
    storageSummary: (bookmarkCount, summaryCount, chunkCount) => `${bookmarkCount} \u6761\u4e66\u7b7e \u00b7 ${summaryCount} \u6761\u6458\u8981 \u00b7 ${chunkCount} \u4e2a\u5411\u91cf\u5206\u5757`,
    importExportTitle: "导入与导出",
    importExportDescription: "从 Chrome 同步书签，或将本地 TabVault 知识库导出为 JSON 备份。",
    importButton: "导入",
    exportButton: "导出知识库",
    dangerTitle: "数据清理（危险区）",
    clearErrorsTitle: "清理失败分析记录",
    clearErrorsDescription: "仅移除最近一次 AI 分析处于失败状态的书签分析记录。",
    clearErrorsButton: "清理失败分析",
    clearAllTitle: "清空全部 AI 分析",
    clearAllDescription: "保留已保存书签，但移除所有生成的摘要、标签和分析元数据。",
    clearAllButton: "清空全部分析",
    retrievalTitle: "检索与向量架构",
    embeddingLabel: "Embedding 模型",
    embeddingLocal: "仅本地（BGE-M3-Lite）- 推荐",
    embeddingDescription: "在检索链路完全定型前，本地 embedding 可避免把书签内容提前发送到远程 API。",
    chunkSizeLabel: "分块大小",
    overlapLabel: "重叠长度",
    rerankingTitle: "Reranking 已规划但尚未启用",
    rerankingDescription: "此页面保留了规划中的检索架构，但 reranking 与重建控件尚未接入正式功能。",
    rebuildButton: "重建检索索引（即将支持）",
    privacyTitle: "隐私与过滤规则",
    blocklistLabel: "屏蔽列表",
    blocklistDescription: "命中这些规则的 URL 不应被导入、索引或发送到 AI 分析。每行一条规则。",
    sanitizationLabel: "严格 URL 清洗",
    sanitizationDescription: "在保存或索引 URL 前，移除查询参数、令牌和会话类字段。",
    saveButton: "保存知识库设置"
  }
}

const LOCALIZED_KNOWLEDGE_COPY: Record<DisplayLanguage, KnowledgeCopy> = {
  en: KNOWLEDGE_COPY.en as KnowledgeCopy,
  zh: {
    statusReady: "\u53ef\u4ee5\u4fdd\u5b58\u77e5\u8bc6\u5e93\u8bbe\u7f6e",
    statusImporting: "\u6b63\u5728\u5bfc\u5165 Chrome \u4e66\u7b7e...",
    statusImported: (count) => `\u5df2\u5bfc\u5165 ${count} \u6761\u4e66\u7b7e`,
    statusExporting: "\u6b63\u5728\u5bfc\u51fa\u77e5\u8bc6\u5e93\u6570\u636e...",
    statusExported: "\u77e5\u8bc6\u5e93\u5df2\u5bfc\u51fa",
    statusExportFailed: "\u5bfc\u51fa\u77e5\u8bc6\u5e93\u5931\u8d25",
    statusImportFailed: "\u5bfc\u5165\u5931\u8d25",
    statusClearingErrors: "\u6b63\u5728\u6e05\u7406\u5931\u8d25\u5206\u6790\u8bb0\u5f55...",
    statusClearedErrors: "\u5931\u8d25\u5206\u6790\u5df2\u6e05\u7406",
    statusClearErrorsFailed: "\u6e05\u7406\u5931\u8d25\u5206\u6790\u5931\u8d25",
    statusClearingAll: "\u6b63\u5728\u6e05\u7a7a\u5168\u90e8 AI \u5206\u6790...",
    statusClearedAll: "\u5168\u90e8 AI \u5206\u6790\u5df2\u6e05\u7a7a",
    statusClearAllFailed: "\u6e05\u7a7a\u5206\u6790\u5931\u8d25",
    statusSaving: "\u6b63\u5728\u4fdd\u5b58\u77e5\u8bc6\u5e93\u8bbe\u7f6e...",
    statusSaved: "\u77e5\u8bc6\u5e93\u8bbe\u7f6e\u5df2\u4fdd\u5b58",
    storageTitle: "\u5b58\u50a8\u6982\u89c8",
    storageLabel: "\u672c\u5730\u5b58\u50a8\uff08IndexedDB\uff09",
    storageSummary: (bookmarkCount, summaryCount, chunkCount) => `${bookmarkCount} \u6761\u4e66\u7b7e \u00b7 ${summaryCount} \u6761\u6458\u8981 \u00b7 ${chunkCount} \u4e2a\u5411\u91cf\u5206\u5757`,
    importExportTitle: "\u5bfc\u5165\u4e0e\u5bfc\u51fa",
    importExportDescription: "\u4ece Chrome \u540c\u6b65\u4e66\u7b7e\uff0c\u6216\u5c06\u672c\u5730 TabVault \u77e5\u8bc6\u5e93\u5bfc\u51fa\u4e3a JSON \u5907\u4efd\u3002",
    importButton: "\u5bfc\u5165",
    exportButton: "\u5bfc\u51fa\u77e5\u8bc6\u5e93",
    dangerTitle: "\u6570\u636e\u6e05\u7406\uff08\u5371\u9669\u533a\uff09",
    clearErrorsTitle: "\u6e05\u7406\u5931\u8d25\u5206\u6790\u8bb0\u5f55",
    clearErrorsDescription: "\u4ec5\u79fb\u9664\u6700\u8fd1\u4e00\u6b21 AI \u5206\u6790\u5904\u4e8e\u5931\u8d25\u72b6\u6001\u7684\u4e66\u7b7e\u5206\u6790\u8bb0\u5f55\u3002",
    clearErrorsButton: "\u6e05\u7406\u5931\u8d25\u5206\u6790",
    clearAllTitle: "\u6e05\u7a7a\u5168\u90e8 AI \u5206\u6790",
    clearAllDescription: "\u4fdd\u7559\u5df2\u4fdd\u5b58\u4e66\u7b7e\uff0c\u4f46\u79fb\u9664\u6240\u6709\u751f\u6210\u7684\u6458\u8981\u3001\u6807\u7b7e\u548c\u5206\u6790\u5143\u6570\u636e\u3002",
    clearAllButton: "\u6e05\u7a7a\u5168\u90e8\u5206\u6790",
    retrievalTitle: "\u68c0\u7d22\u4e0e\u5411\u91cf\u67b6\u6784",
    embeddingLabel: "Embedding \u6a21\u578b",
    embeddingLocal: "\u4ec5\u672c\u5730\uff08BGE-M3-Lite\uff09- \u63a8\u8350",
    embeddingOpenAi: "OpenAI\uff08text-embedding-3-small\uff09",
    embeddingGemini: "Gemini\uff08text-embedding-004\uff09",
    embeddingDescription: "\u5728\u68c0\u7d22\u94fe\u8def\u5b8c\u5168\u5b9a\u578b\u524d\uff0c\u672c\u5730 embedding \u53ef\u907f\u514d\u628a\u4e66\u7b7e\u5185\u5bb9\u63d0\u524d\u53d1\u9001\u5230\u8fdc\u7a0b API\u3002",
    chunkSizeLabel: "\u5206\u5757\u5927\u5c0f",
    overlapLabel: "\u91cd\u53e0\u957f\u5ea6",
    rerankingTitle: "Reranking \u5df2\u89c4\u5212\u4f46\u5c1a\u672a\u542f\u7528",
    rerankingDescription: "\u6b64\u9875\u9762\u4fdd\u7559\u4e86\u89c4\u5212\u4e2d\u7684\u68c0\u7d22\u67b6\u6784\uff0c\u4f46 reranking \u4e0e\u91cd\u5efa\u63a7\u4ef6\u5c1a\u672a\u63a5\u5165\u6b63\u5f0f\u529f\u80fd\u3002",
    rebuildButton: "\u91cd\u5efa\u68c0\u7d22\u7d22\u5f15\uff08\u5373\u5c06\u652f\u6301\uff09",
    privacyTitle: "\u9690\u79c1\u4e0e\u8fc7\u6ee4\u89c4\u5219",
    blocklistLabel: "\u5c4f\u853d\u5217\u8868",
    blocklistDescription: "\u547d\u4e2d\u8fd9\u4e9b\u89c4\u5219\u7684 URL \u4e0d\u5e94\u88ab\u5bfc\u5165\u3001\u7d22\u5f15\u6216\u53d1\u9001\u5230 AI \u5206\u6790\u3002\u6bcf\u884c\u4e00\u6761\u89c4\u5219\u3002",
    sanitizationLabel: "\u4e25\u683c URL \u6e05\u6d17",
    sanitizationDescription: "\u5728\u4fdd\u5b58\u6216\u7d22\u5f15 URL \u524d\uff0c\u79fb\u9664\u67e5\u8be2\u53c2\u6570\u3001\u4ee4\u724c\u548c\u4f1a\u8bdd\u7c7b\u5b57\u6bb5\u3002",
    saveButton: "\u4fdd\u5b58\u77e5\u8bc6\u5e93\u8bbe\u7f6e"
  }
}

export default function KnowledgeSettingsPanel({
  bookmarkRepository,
  language = "en"
}: KnowledgeSettingsPanelProps) {
  const theme = useThemeContext()
  const copy = LOCALIZED_KNOWLEDGE_COPY[language]
  const [draft, setDraft] = React.useState<KnowledgeDraft>(DEFAULT_KNOWLEDGE_DRAFT)
  const [status, setStatus] = React.useState<KnowledgeStatus>("idle")
  const [statusMessage, setStatusMessage] = React.useState(copy.statusReady)
  const [stats, setStats] = React.useState({
    bookmarkCount: 0,
    summaryCount: 0,
    vectorChunkCount: 0,
    estimatedBytes: 0
  })

  const loadStats = React.useCallback(async () => {
    const bookmarks = await bookmarkRepository.list()
    setStats(buildKnowledgeStats(bookmarks, Number.parseInt(draft.chunkSize, 10) || 1000))
  }, [bookmarkRepository, draft.chunkSize])

  React.useEffect(() => {
    setStatusMessage((current) => status === "idle" ? copy.statusReady : current)
  }, [copy.statusReady, status])

  React.useEffect(() => {
    void loadStats()
  }, [loadStats])

  const usedMb = stats.estimatedBytes / (1024 * 1024)
  const maxMb = 500
  const usagePercent = Math.max(1, Math.min(100, (usedMb / maxMb) * 100))

  async function handleImport(): Promise<void> {
    setStatus("running")
    setStatusMessage(copy.statusImporting)

    try {
      const response = await sendImportBookmarksMessage(copy.statusImportFailed)
      await loadStats()
      setStatus("done")
      setStatusMessage(copy.statusImported(response.count ?? 0))
    } catch (error) {
      setStatus("error")
      setStatusMessage(getKnowledgeErrorMessage(error, copy.statusImportFailed))
    }
  }

  async function handleExport(): Promise<void> {
    setStatus("running")
    setStatusMessage(copy.statusExporting)

    try {
      const bookmarks = await bookmarkRepository.list()
      const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "tabvault-knowledge-export.json"
      link.click()
      URL.revokeObjectURL(url)
      setStatus("done")
      setStatusMessage(copy.statusExported)
    } catch (error) {
      setStatus("error")
      setStatusMessage(getKnowledgeErrorMessage(error, copy.statusExportFailed))
    }
  }

  async function handleClearErrorAnalysis(): Promise<void> {
    setStatus("running")
    setStatusMessage(copy.statusClearingErrors)

    try {
      await bookmarkRepository.clearErrorAnalysis()
      await loadStats()
      setStatus("done")
      setStatusMessage(copy.statusClearedErrors)
    } catch (error) {
      setStatus("error")
      setStatusMessage(getKnowledgeErrorMessage(error, copy.statusClearErrorsFailed))
    }
  }

  async function handleClearAllAnalysis(): Promise<void> {
    setStatus("running")
    setStatusMessage(copy.statusClearingAll)

    try {
      await bookmarkRepository.clearAllAnalysis()
      await loadStats()
      setStatus("done")
      setStatusMessage(copy.statusClearedAll)
    } catch (error) {
      setStatus("error")
      setStatusMessage(getKnowledgeErrorMessage(error, copy.statusClearAllFailed))
    }
  }

  async function handleSaveKnowledgeSettings(): Promise<void> {
    setStatus("saving")
    setStatusMessage(copy.statusSaving)
    await Promise.resolve()
    setStatus("saved")
    setStatusMessage(copy.statusSaved)
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
    padding: "24px"
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: `1px solid ${theme.border}`,
    borderRadius: "10px",
    backgroundColor: theme.page,
    color: theme.textPrimary,
    fontSize: "0.875rem"
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg fill='%237A8A7D' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>\")",
    backgroundRepeat: "no-repeat",
    backgroundPositionX: "98%",
    backgroundPositionY: "50%"
  }

  const subtleButtonStyle: React.CSSProperties = {
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.surface,
    color: theme.textPrimary,
    fontSize: "0.75rem",
    fontWeight: 500,
    padding: "8px 16px",
    borderRadius: "10px",
    cursor: "pointer"
  }

  const primaryButtonStyle: React.CSSProperties = {
    border: "none",
    backgroundColor: theme.accent,
    color: "#ffffff",
    fontSize: "0.75rem",
    fontWeight: 500,
    padding: "8px 16px",
    borderRadius: "10px",
    cursor: "pointer"
  }

  const dangerButtonStyle: React.CSSProperties = {
    border: "1px solid #facdcd",
    backgroundColor: theme.surface,
    color: theme.textDanger,
    fontSize: "0.75rem",
    fontWeight: 500,
    padding: "8px 16px",
    borderRadius: "10px",
    cursor: "pointer"
  }

  return (
    <div data-testid="knowledge-settings-shell" style={{ display: "grid", gap: "32px", minWidth: 0 }}>
      <div data-testid="knowledge-settings-workspace" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "32px", alignItems: "start", paddingBottom: "48px" }}>
        <div style={{ display: "grid", gap: "24px" }}>
          <section data-testid="knowledge-storage-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 24px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>{copy.storageTitle}</h3>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>{copy.storageLabel}</span>
                <span data-testid="knowledge-storage-usage" style={{ fontSize: "0.75rem", color: theme.textMuted }}>{usedMb.toFixed(1)} MB / {maxMb} MB</span>
              </div>
              <div style={{ width: "100%", backgroundColor: theme.page, borderRadius: "999px", height: "8px", overflow: "hidden", border: `1px solid ${theme.border}` }}>
                <div data-testid="knowledge-storage-progress" style={{ width: `${usagePercent}%`, backgroundColor: theme.accent, height: "8px", borderRadius: "999px" }} />
              </div>
              <p data-testid="knowledge-storage-summary" style={{ margin: "8px 0 0", fontSize: "0.625rem", color: theme.textMuted }}>
                {copy.storageSummary(stats.bookmarkCount, stats.summaryCount, stats.vectorChunkCount)}
              </p>
            </div>

            <div style={{ display: "grid", gap: "16px", paddingTop: "16px", borderTop: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>{copy.importExportTitle}</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "0.625rem", color: theme.textMuted }}>{copy.importExportDescription}</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button data-testid="knowledge-import-button" onClick={() => void handleImport()} style={subtleButtonStyle} type="button">{copy.importButton}</button>
                  <button data-testid="knowledge-export-button" onClick={() => void handleExport()} style={primaryButtonStyle} type="button">{copy.exportButton}</button>
                </div>
              </div>
            </div>
          </section>

          <section data-testid="knowledge-danger-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontWeight: 600, fontSize: "1rem", color: theme.textDanger, display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: theme.textDanger }} /> {copy.dangerTitle}
            </h3>

            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fdf0f0", border: "1px solid #facdcd", padding: "16px", borderRadius: "10px", gap: spacing.md }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: "#c1121f" }}>{copy.clearErrorsTitle}</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "0.625rem", color: "rgba(193,18,31,0.7)" }}>{copy.clearErrorsDescription}</p>
                </div>
                <button data-testid="knowledge-clear-error-button" onClick={() => void handleClearErrorAnalysis()} style={dangerButtonStyle} type="button">{copy.clearErrorsButton}</button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fdf0f0", border: "1px solid #facdcd", padding: "16px", borderRadius: "10px", gap: spacing.md }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: "#c1121f" }}>{copy.clearAllTitle}</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "0.625rem", color: "rgba(193,18,31,0.7)" }}>{copy.clearAllDescription}</p>
                </div>
                <button data-testid="knowledge-clear-all-button" onClick={() => void handleClearAllAnalysis()} style={dangerButtonStyle} type="button">{copy.clearAllButton}</button>
              </div>
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: "24px" }}>
          <section data-testid="knowledge-retrieval-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 24px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>{copy.retrievalTitle}</h3>

            <div style={{ display: "grid", gap: "20px" }}>
              <div>
                <label htmlFor="knowledge-embedding-model" style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>{copy.embeddingLabel}</label>
                <select data-testid="knowledge-embedding-model" id="knowledge-embedding-model" onChange={(event) => setDraft((current) => ({ ...current, embeddingModel: event.target.value }))} style={selectStyle} value={draft.embeddingModel}>
                  <option value="local-bge-m3-lite">{copy.embeddingLocal}</option>
                  <option value="openai-text-embedding-3-small">{copy.embeddingOpenAi}</option>
                  <option value="gemini-text-embedding-004">{copy.embeddingGemini}</option>
                </select>
                <p style={{ margin: "6px 0 0", fontSize: "0.625rem", color: theme.textMuted }}>{copy.embeddingDescription}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                <div>
                  <label htmlFor="knowledge-chunk-size" style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>{copy.chunkSizeLabel}</label>
                  <input data-testid="knowledge-chunk-size" id="knowledge-chunk-size" onChange={(event) => setDraft((current) => ({ ...current, chunkSize: event.target.value }))} style={inputStyle} type="number" value={draft.chunkSize} />
                </div>
                <div>
                  <label htmlFor="knowledge-overlap" style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>{copy.overlapLabel}</label>
                  <input data-testid="knowledge-overlap" id="knowledge-overlap" onChange={(event) => setDraft((current) => ({ ...current, overlap: event.target.value }))} style={inputStyle} type="number" value={draft.overlap} />
                </div>
              </div>

              <div style={{ backgroundColor: theme.page, border: `1px solid ${theme.border}`, padding: "12px", borderRadius: "10px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ fontSize: "1rem" }}>i</span>
                <div>
                  <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 500, color: theme.textPrimary }}>{copy.rerankingTitle}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.625rem", color: theme.textMuted, lineHeight: 1.6 }}>{copy.rerankingDescription}</p>
                </div>
              </div>

              <button data-testid="knowledge-rebuild-button" disabled style={{ ...subtleButtonStyle, width: "100%", opacity: 0.65, cursor: "not-allowed" }} type="button">{copy.rebuildButton}</button>
            </div>
          </section>

          <section data-testid="knowledge-privacy-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 24px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>{copy.privacyTitle}</h3>

            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label htmlFor="knowledge-blocklist" style={{ display: "block", marginBottom: "4px", fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>{copy.blocklistLabel}</label>
                <p style={{ margin: "0 0 12px", fontSize: "0.625rem", color: theme.textMuted }}>{copy.blocklistDescription}</p>
                <textarea data-testid="knowledge-blocklist" id="knowledge-blocklist" onChange={(event) => setDraft((current) => ({ ...current, blocklist: event.target.value }))} rows={5} style={{ ...inputStyle, resize: "none", fontFamily: "monospace" }} value={draft.blocklist} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>{copy.sanitizationLabel}</span>
                  <span style={{ display: "block", marginTop: "4px", fontSize: "0.625rem", color: theme.textMuted }}>{copy.sanitizationDescription}</span>
                </div>
                <button
                  aria-checked={draft.strictUrlSanitization}
                  aria-label={copy.sanitizationLabel}
                  data-testid="knowledge-privacy-toggle"
                  onClick={() => setDraft((current) => ({ ...current, strictUrlSanitization: !current.strictUrlSanitization }))}
                  role="switch"
                  style={{
                    position: "relative",
                    width: "44px",
                    height: "24px",
                    border: "none",
                    borderRadius: "999px",
                    backgroundColor: draft.strictUrlSanitization ? theme.accent : theme.border,
                    cursor: "pointer"
                  }}
                  type="button"
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: draft.strictUrlSanitization ? "22px" : "2px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "999px",
                      backgroundColor: "#ffffff",
                      transition: "left 0.15s ease"
                    }}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section
        data-testid="knowledge-save-actions"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
          padding: "16px 32px",
          borderTop: `1px solid ${theme.border}`,
          backgroundColor: theme.surface,
          boxShadow: "0 -2px 10px rgba(0,0,0,0.02)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: status === "error" ? theme.textDanger : theme.accent, boxShadow: status === "error" ? `0 0 4px ${theme.textDanger}` : "0 0 4px rgba(107,142,115,0.5)" }} />
          <p aria-live="polite" data-testid="knowledge-save-status" role="status" style={{ margin: 0, fontSize: "0.875rem", color: theme.textMuted }}>
            {statusMessage}
          </p>
        </div>

        <button data-testid="knowledge-save-button" onClick={() => void handleSaveKnowledgeSettings()} style={{ ...primaryButtonStyle, padding: "10px 32px", fontSize: "0.875rem" }} type="button">
          {copy.saveButton}
        </button>
      </section>
    </div>
  )
}

function buildKnowledgeStats(bookmarks: BookmarkRecord[], chunkSize: number) {
  const summaryCount = bookmarks.filter((bookmark) => Boolean(bookmark.summary)).length
  const estimatedBytes = new Blob([JSON.stringify(bookmarks)]).size
  const safeChunkSize = Math.max(1, chunkSize)
  const vectorChunkCount = bookmarks.reduce((total, bookmark) => total + Math.max(0, Math.ceil((bookmark.extractedText ?? "").length / safeChunkSize)), 0)

  return {
    bookmarkCount: bookmarks.length,
    summaryCount,
    vectorChunkCount,
    estimatedBytes
  }
}

function getKnowledgeErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof Error)) {
    return fallbackMessage
  }

  const internalMessages = new Set([
    "Import failed",
    "Failed to export knowledge base",
    "Failed to clear failed analysis",
    "Failed to clear analysis",
    "Failed to open bookmark database",
    "IndexedDB request failed",
    "IndexedDB transaction failed",
    "IndexedDB transaction aborted"
  ])

  return internalMessages.has(error.message) ? fallbackMessage : error.message
}

async function sendImportBookmarksMessage(fallbackMessage: string): Promise<ImportBookmarksResponse> {
  const response = await globalThis.chrome?.runtime?.sendMessage?.({ type: "IMPORT_BOOKMARKS" })

  if (!response?.success) {
    throw new Error(response?.error ?? fallbackMessage)
  }

  return response as ImportBookmarksResponse
}
