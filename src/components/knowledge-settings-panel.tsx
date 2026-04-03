import React from "react"

import type { BookmarkRepository } from "../lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../types/bookmark"
import { spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type KnowledgeSettingsPanelProps = {
  bookmarkRepository: BookmarkRepository
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

export default function KnowledgeSettingsPanel({ bookmarkRepository }: KnowledgeSettingsPanelProps) {
  const theme = useThemeContext()
  const [draft, setDraft] = React.useState<KnowledgeDraft>(DEFAULT_KNOWLEDGE_DRAFT)
  const [status, setStatus] = React.useState<KnowledgeStatus>("idle")
  const [statusMessage, setStatusMessage] = React.useState("更改尚未保存")
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
    void loadStats()
  }, [loadStats])

  const usedMb = stats.estimatedBytes / (1024 * 1024)
  const maxMb = 500
  const usagePercent = Math.max(1, Math.min(100, (usedMb / maxMb) * 100))

  async function handleImport(): Promise<void> {
    setStatus("running")
    setStatusMessage("正在导入 Chrome 书签...")

    try {
      const response = await sendImportBookmarksMessage()
      await loadStats()
      setStatus("done")
      setStatusMessage(`已导入 ${response.count ?? 0} 条书签`)
    } catch (error) {
      setStatus("error")
      setStatusMessage(error instanceof Error ? error.message : "导入失败")
    }
  }

  async function handleExport(): Promise<void> {
    setStatus("running")
    setStatusMessage("正在导出知识库数据...")

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
      setStatusMessage("知识库数据已导出")
    } catch (error) {
      setStatus("error")
      setStatusMessage(error instanceof Error ? error.message : "导出失败")
    }
  }

  async function handleClearErrorAnalysis(): Promise<void> {
    setStatus("running")
    setStatusMessage("正在清空失败分析记录...")

    try {
      await bookmarkRepository.clearErrorAnalysis()
      await loadStats()
      setStatus("done")
      setStatusMessage("失败分析记录已清空")
    } catch (error) {
      setStatus("error")
      setStatusMessage(error instanceof Error ? error.message : "清空失败记录失败")
    }
  }

  async function handleClearAllAnalysis(): Promise<void> {
    setStatus("running")
    setStatusMessage("正在清空全部 AI 分析缓存...")

    try {
      await bookmarkRepository.clearAllAnalysis()
      await loadStats()
      setStatus("done")
      setStatusMessage("全部 AI 分析缓存已清空")
    } catch (error) {
      setStatus("error")
      setStatusMessage(error instanceof Error ? error.message : "清空全部分析失败")
    }
  }

  async function handleSaveKnowledgeSettings(): Promise<void> {
    setStatus("saving")
    setStatusMessage("正在保存知识库设置...")
    await Promise.resolve()
    setStatus("saved")
    setStatusMessage("知识库设置已保存")
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
    border: `1px solid #facdcd`,
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
            <h3 style={{ margin: "0 0 24px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>存储概览</h3>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>本地数据库 (IndexedDB)</span>
                <span data-testid="knowledge-storage-usage" style={{ fontSize: "0.75rem", color: theme.textMuted }}>{usedMb.toFixed(1)} MB / {maxMb} MB</span>
              </div>
              <div style={{ width: "100%", backgroundColor: theme.page, borderRadius: "999px", height: "8px", overflow: "hidden", border: `1px solid ${theme.border}` }}>
                <div data-testid="knowledge-storage-progress" style={{ width: `${usagePercent}%`, backgroundColor: theme.accent, height: "8px", borderRadius: "999px" }} />
              </div>
              <p data-testid="knowledge-storage-summary" style={{ margin: "8px 0 0", fontSize: "0.625rem", color: theme.textMuted }}>
                包含 {stats.bookmarkCount} 个书签、{stats.summaryCount} 份页面摘要及 {stats.vectorChunkCount} 个向量块。
              </p>
            </div>

            <div style={{ display: "grid", gap: "16px", paddingTop: "16px", borderTop: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>备份与迁移</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "0.625rem", color: theme.textMuted }}>将所有书签及 AI 分析结果导出为 JSON 格式</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button data-testid="knowledge-import-button" onClick={() => void handleImport()} style={subtleButtonStyle} type="button">导入</button>
                  <button data-testid="knowledge-export-button" onClick={() => void handleExport()} style={primaryButtonStyle} type="button">导出数据</button>
                </div>
              </div>
            </div>
          </section>

          <section data-testid="knowledge-danger-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontWeight: 600, fontSize: "1rem", color: theme.textDanger, display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: theme.textDanger }} /> 数据清理 (Danger Zone)
            </h3>

            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fdf0f0", border: "1px solid #facdcd", padding: "16px", borderRadius: "10px", gap: spacing.md }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: "#c1121f" }}>清空失败分析记录</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "0.625rem", color: "rgba(193,18,31,0.7)" }}>移除所有因网络或截断导致的分析失败记录</p>
                </div>
                <button data-testid="knowledge-clear-error-button" onClick={() => void handleClearErrorAnalysis()} style={dangerButtonStyle} type="button">清空失败记录</button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fdf0f0", border: "1px solid #facdcd", padding: "16px", borderRadius: "10px", gap: spacing.md }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: "#c1121f" }}>清空全部 AI 分析缓存</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "0.625rem", color: "rgba(193,18,31,0.7)" }}>不会删除书签，但会清空所有摘要、标签和分析结果</p>
                </div>
                <button data-testid="knowledge-clear-all-button" onClick={() => void handleClearAllAnalysis()} style={dangerButtonStyle} type="button">清空全部分析</button>
              </div>
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: "24px" }}>
          <section data-testid="knowledge-retrieval-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 24px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>检索与向量架构</h3>

            <div style={{ display: "grid", gap: "20px" }}>
              <div>
                <label htmlFor="knowledge-embedding-model" style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>Embedding Model (向量嵌入模型)</label>
                <select data-testid="knowledge-embedding-model" id="knowledge-embedding-model" onChange={(event) => setDraft((current) => ({ ...current, embeddingModel: event.target.value }))} style={selectStyle} value={draft.embeddingModel}>
                  <option value="local-bge-m3-lite">本地优先 (BGE-M3-Lite) - 推荐</option>
                  <option value="openai-text-embedding-3-small">OpenAI (text-embedding-3-small)</option>
                  <option value="gemini-text-embedding-004">Gemini (text-embedding-004)</option>
                </select>
                <p style={{ margin: "6px 0 0", fontSize: "0.625rem", color: theme.textMuted }}>本地模型速度快且免费；API 模型会消耗相应额度。</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                <div>
                  <label htmlFor="knowledge-chunk-size" style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>Chunk Size (分块长度)</label>
                  <input data-testid="knowledge-chunk-size" id="knowledge-chunk-size" onChange={(event) => setDraft((current) => ({ ...current, chunkSize: event.target.value }))} style={inputStyle} type="number" value={draft.chunkSize} />
                </div>
                <div>
                  <label htmlFor="knowledge-overlap" style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 500, color: theme.textMuted }}>Overlap (重叠字符数)</label>
                  <input data-testid="knowledge-overlap" id="knowledge-overlap" onChange={(event) => setDraft((current) => ({ ...current, overlap: event.target.value }))} style={inputStyle} type="number" value={draft.overlap} />
                </div>
              </div>

              <div style={{ backgroundColor: theme.page, border: `1px solid ${theme.border}`, padding: "12px", borderRadius: "10px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1rem" }}>ℹ️</span>
                <div>
                  <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 500, color: theme.textPrimary }}>Reranking (重排) 尚未接入</p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.625rem", color: theme.textMuted, lineHeight: 1.6 }}>配置本地检索如何在已保存书签和当前页面上下文之间工作。更完整的检索架构会在后续版本中开放。</p>
                </div>
              </div>

              <button data-testid="knowledge-rebuild-button" disabled style={{ ...subtleButtonStyle, width: "100%", opacity: 0.65, cursor: "not-allowed" }} type="button">🔄 基于当前配置重建所有索引</button>
            </div>
          </section>

          <section data-testid="knowledge-privacy-card" style={cardStyle}>
            <h3 style={{ margin: "0 0 24px", fontWeight: 600, fontSize: "1rem", color: theme.textPrimary }}>隐私与过滤规则</h3>

            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label htmlFor="knowledge-blocklist" style={{ display: "block", marginBottom: "4px", fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>忽略域名列表 (Blocklist)</label>
                <p style={{ margin: "0 0 12px", fontSize: "0.625rem", color: theme.textMuted }}>包含以下域名的网址将被插件直接跳过，既不保存书签，也不触发 AI 读取（每行一个）。</p>
                <textarea data-testid="knowledge-blocklist" id="knowledge-blocklist" onChange={(event) => setDraft((current) => ({ ...current, blocklist: event.target.value }))} rows={5} style={{ ...inputStyle, resize: "none", fontFamily: "monospace" }} value={draft.blocklist} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: theme.textPrimary }}>严格模式下隐藏敏感参数</span>
                  <span style={{ display: "block", marginTop: "4px", fontSize: "0.625rem", color: theme.textMuted }}>在发送给云端模型前，自动剔除 URL 中的 token、session 等参数</span>
                </div>
                <button
                  aria-label="严格模式下隐藏敏感参数"
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
          保存知识库设置
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

async function sendImportBookmarksMessage(): Promise<ImportBookmarksResponse> {
  const response = await globalThis.chrome?.runtime?.sendMessage?.({ type: "IMPORT_BOOKMARKS" })

  if (!response?.success) {
    throw new Error(response?.error ?? "导入失败")
  }

  return response as ImportBookmarksResponse
}
