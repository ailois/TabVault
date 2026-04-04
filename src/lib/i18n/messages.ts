import type { DisplayLanguage } from "../../types/settings"

export type MessageKey =
  | "settings.title"
  | "settings.subtitle"
  | "settings.knowledge.title"
  | "settings.knowledge.subtitle"
  | "settings.nav.settings"
  | "settings.nav.architecture"
  | "settings.nav.knowledge"
  | "settings.sidebar.tagline"
  | "settings.tab.agent"
  | "settings.tab.retrieval"
  | "settings.section.provider"
  | "settings.section.retrieval"
  | "settings.section.experience"
  | "settings.section.license"
  | "settings.provider.heading"
  | "settings.provider.connectionFailed"
  | "settings.theme.label"
  | "settings.knowledge.card.title"
  | "settings.knowledge.card.description"
  | "settings.license.unavailable"
  | "settings.displayLanguage.label"
  | "settings.displayLanguage.option.en"
  | "settings.displayLanguage.option.zh"
  | "settings.summaryLanguage.label"
  | "settings.summaryLanguage.option.auto"
  | "settings.summaryLanguage.option.zh"
  | "settings.summaryLanguage.option.en"
  | "settings.summaryLanguage.option.ja"
  | "settings.summaryLanguage.option.ko"
  | "settings.summaryLanguage.option.fr"
  | "settings.summaryLanguage.option.de"
  | "settings.summaryLanguage.option.es"
  | "settings.defaultProvider.label"
  | "settings.defaultProvider.badge"
  | "settings.autoAnalyzeOnSave.label"
  | "settings.autoRetryOnError.label"
  | "settings.autoFollowContent.label"
  | "settings.retrieval.description"
  | "settings.retrieval.placeholder"
  | "settings.retrieval.clearAll"
  | "settings.retrieval.clearErrors"
  | "settings.save.title"
  | "settings.save.button"
  | "settings.save.status.loading"
  | "settings.save.status.loadError"
  | "settings.save.status.saving"
  | "settings.save.status.saved"
  | "settings.save.status.saveError"
  | "settings.save.status.ready"
  | "settings.trial.cta.activate"
  | "settings.trial.cta.unlock"
  | "settings.trial.message.try"
  | "settings.trial.message.locked"
  | "settings.trial.detail.savedAnalysis"
  | "settings.trial.detail.remaining"
  | "settings.license.invalid"
  | "settings.license.unvalidated"
  | "settings.license.saveError"
  | "trialBanner.title.trial"
  | "trialBanner.title.expired"
  | "license.heading.activate"
  | "license.description.activate"
  | "license.heading.activated"
  | "license.description.activated"
  | "license.field.label"
  | "license.button.activate"
  | "license.button.activating"
  | "license.button.change"
  | "popup.currentPage.label"
  | "popup.currentPage.loading"
  | "popup.currentPage.unavailable"
  | "popup.actions.openSidepanel"
  | "popup.actions.openDashboard"
  | "popup.actions.openSettings"
  | "popup.primary.save"
  | "popup.primary.saving"
  | "popup.primary.analyzing"
  | "popup.status.ready"
  | "popup.status.saving"
  | "popup.status.savedPrefix"
  | "popup.status.analyzing"
  | "popup.error.apiKeyMissing"
  | "popup.error.saveFallback"
  | "popup.error.saveUnavailableMetadata"
  | "popup.error.analyzeFallback"
  | "popup.synced.badge"
  | "popup.unsynced.badge"
  | "popup.unsynced.helperTitle"
  | "popup.unsynced.helperBody"
  | "sidepanel.header.tagline"
  | "sidepanel.search.label"
  | "sidepanel.search.placeholder"
  | "sidepanel.search.clear"
  | "sidepanel.input.placeholder"
  | "sidepanel.input.submit"
  | "sidepanel.import.button"
  | "sidepanel.import.syncing"
  | "sidepanel.import.success"
  | "sidepanel.welcome.prompt"
  | "sidepanel.welcome.chip.summarize"
  | "sidepanel.welcome.chip.codeSnippets"
  | "sidepanel.bookmarks.connectedPrefix"
  | "sidepanel.bookmarks.loading"
  | "sidepanel.apiKeyMissing"
  | "sidepanel.error.loadBookmarks"
  | "sidepanel.error.activateLicense"
  | "sidepanel.error.analyzeFailed"
  | "sidepanel.error.updateTags"
  | "sidepanel.error.importFailed"
  | "sidepanel.error.ghostreaderFailed"
  | "sidepanel.trial.activate"
  | "sidepanel.trial.unlock"
  | "sidepanel.trial.try"
  | "sidepanel.trial.locked"
  | "hybrid.context.ariaLabel"
  | "hybrid.context.currentPage"
  | "hybrid.context.unavailable"
  | "hybrid.context.library"
  | "hybrid.context.indexed"
  | "hybrid.context.enabled"
  | "hybrid.query.ariaLabel"
  | "hybrid.query.query"
  | "hybrid.query.currentPageMatch"
  | "hybrid.query.currentPage"
  | "hybrid.query.savedBookmarks"
  | "hybrid.query.savedBookmark"
  | "hybrid.action.askCurrentPage"
  | "hybrid.action.askTopMatches"
  | "hybrid.action.openDashboard"
  | "drawer.action.open"
  | "drawer.action.close"
  | "drawer.section.url"
  | "drawer.summary.title"
  | "drawer.summary.regenerate"
  | "drawer.tags.title"
  | "drawer.tags.edit"
  | "drawer.tags.done"
  | "drawer.tags.remove"
  | "drawer.tags.inputPlaceholder"
  | "drawer.date.saved"
  | "drawer.date.updated"
  | "drawer.button.analyze"
  | "drawer.button.clearAnalysis"
  | "drawer.status.saved"
  | "drawer.status.done"
  | "drawer.status.error"
  | "drawer.status.analyzing"
  | "dashboard.navigation.library"
  | "dashboard.navigation.allBookmarks"
  | "dashboard.navigation.recents"
  | "dashboard.navigation.highlights"
  | "dashboard.navigation.folders"
  | "dashboard.navigation.tags"
  | "dashboard.navigation.tagFrontend"
  | "dashboard.navigation.tagAi"
  | "dashboard.navigation.settings"
  | "dashboard.results.heading"
  | "dashboard.results.searchPlaceholder"
  | "dashboard.results.searchShortcut"
  | "dashboard.results.empty"
  | "dashboard.results.noSummary"
  | "dashboard.results.summaryBadge"
  | "dashboard.results.savedBadge"
  | "dashboard.reading.empty"
  | "dashboard.reading.action.open"
  | "dashboard.reading.action.delete"
  | "dashboard.reading.tab.notes"
  | "dashboard.reading.tab.ai"
  | "dashboard.reading.section.tags"
  | "dashboard.reading.tags.empty"
  | "dashboard.reading.section.summary"
  | "dashboard.reading.summary.empty"
  | "dashboard.reading.section.notes"
  | "dashboard.reading.notes.empty"
  | "dashboard.reading.format.bold"
  | "dashboard.reading.format.italic"
  | "dashboard.reading.format.quote"
  | "dashboard.reading.autosave"
  | "dashboard.ask.title"
  | "dashboard.ask.placeholder"
  | "dashboard.ask.submit"
  | "dashboard.ask.answer.none"
  | "dashboard.ask.answer.found"
  | "dashboard.aiSidebar.label"
  | "dashboard.summary.title"
  | "dashboard.summary.edit"
  | "dashboard.summary.editAria"
  | "dashboard.summary.inputAria"
  | "dashboard.summary.cancel"
  | "dashboard.summary.cancelAria"
  | "dashboard.summary.save"
  | "dashboard.summary.saveAria"
  | "dashboard.summary.empty"
  | "dashboard.tags.title"
  | "dashboard.tags.edit"
  | "dashboard.tags.editAria"
  | "dashboard.tags.inputAria"
  | "dashboard.tags.cancel"
  | "dashboard.tags.cancelAria"
  | "dashboard.tags.save"
  | "dashboard.tags.saveAria"
  | "dashboard.tags.empty"
  | "dashboard.tags.inputPlaceholder"
  | "dashboard.bulkEdit.placeholder"
  | "common.theme.switchToLight"
  | "common.theme.switchToDark"

type Messages = Record<MessageKey, string>

const en: Messages = {
  "settings.title": "Architecture Settings",
  "settings.subtitle": "Configure provider protocols, retrieval architecture, experience behavior, and licensing.",
  "settings.knowledge.title": "Knowledge Base",
  "settings.knowledge.subtitle": "Manage local bookmark storage, retrieval indexing, privacy filters, and cleanup tools.",
  "settings.nav.settings": "Settings",
  "settings.nav.architecture": "Architecture",
  "settings.nav.knowledge": "Knowledge Base",
  "settings.sidebar.tagline": "Local-first bookmark workspace",
  "settings.tab.agent": "Agent Companion Engine",
  "settings.tab.retrieval": "Lightweight Hybrid Retrieval",
  "settings.section.provider": "Provider & Protocol",
  "settings.section.retrieval": "Retrieval Architecture",
  "settings.section.experience": "Experience & Automation",
  "settings.section.license": "Trial & License",
  "settings.provider.heading": "Provider & Protocol",
  "settings.provider.connectionFailed": "Connection failed",
  "settings.theme.label": "Theme",
  "settings.knowledge.card.title": "Knowledge management",
  "settings.knowledge.card.description": "Use the Knowledge Base page to inspect storage usage, import browser bookmarks, clear failed analysis, and tune retrieval behavior.",
  "settings.license.unavailable": "License status is unavailable right now.",
  "settings.displayLanguage.label": "Display language",
  "settings.displayLanguage.option.en": "English",
  "settings.displayLanguage.option.zh": "Chinese",
  "settings.summaryLanguage.label": "Summary language",
  "settings.summaryLanguage.option.auto": "Auto (follow content)",
  "settings.summaryLanguage.option.zh": "Chinese",
  "settings.summaryLanguage.option.en": "English",
  "settings.summaryLanguage.option.ja": "Japanese",
  "settings.summaryLanguage.option.ko": "Korean",
  "settings.summaryLanguage.option.fr": "French",
  "settings.summaryLanguage.option.de": "German",
  "settings.summaryLanguage.option.es": "Spanish",
  "settings.defaultProvider.label": "Default provider",
  "settings.defaultProvider.badge": "Default",
  "settings.autoAnalyzeOnSave.label": "Auto analyze on save",
  "settings.autoRetryOnError.label": "Auto retry failed analysis",
  "settings.autoFollowContent.label": "Auto (follow content)",
  "settings.retrieval.description": "Configure how local retrieval works across saved bookmarks and current-page context.",
  "settings.retrieval.placeholder": "Planned controls for reranking and architecture routing are not wired yet.",
  "settings.retrieval.clearAll": "Clear all analysis",
  "settings.retrieval.clearErrors": "Clear failed analysis",
  "settings.save.title": "Save settings",
  "settings.save.button": "Save settings",
  "settings.save.status.loading": "Loading settings...",
  "settings.save.status.loadError": "Failed to load settings",
  "settings.save.status.saving": "Saving...",
  "settings.save.status.saved": "Saved settings",
  "settings.save.status.saveError": "Failed to save settings",
  "settings.save.status.ready": "Ready",
  "settings.trial.cta.activate": "Activate now",
  "settings.trial.cta.unlock": "Unlock TabVault",
  "settings.trial.message.try": "Try TabVault free for 3 days.",
  "settings.trial.message.locked": "New AI analysis is locked until you activate TabVault.",
  "settings.trial.detail.savedAnalysis": "Your saved analysis stays available.",
  "settings.trial.detail.remaining": "{days} days left \u00b7 {analyses} analyses remaining",
  "settings.license.invalid": "This license key is invalid.",
  "settings.license.unvalidated": "Could not validate right now. Try again shortly.",
  "settings.license.saveError": "Failed to save license state.",
  "trialBanner.title.trial": "Trial active",
  "trialBanner.title.expired": "Trial expired",
  "license.heading.activate": "Activate TabVault",
  "license.description.activate": "Enter your license key to unlock premium features.",
  "license.heading.activated": "Activated",
  "license.description.activated": "Your license is active on this browser profile.",
  "license.field.label": "License Key",
  "license.button.activate": "Activate",
  "license.button.activating": "Activating...",
  "license.button.change": "Change license key",
  "popup.currentPage.label": "Browsing now",
  "popup.currentPage.loading": "Loading current page...",
  "popup.currentPage.unavailable": "Current page unavailable",
  "popup.actions.openSidepanel": "Open sidepanel",
  "popup.actions.openDashboard": "Dashboard",
  "popup.actions.openSettings": "Open settings",
  "popup.primary.save": "Save current page",
  "popup.primary.saving": "Saving...",
  "popup.primary.analyzing": "Analyzing...",
  "popup.status.ready": "Ready to save the current page.",
  "popup.status.saving": "Saving current page...",
  "popup.status.savedPrefix": "Saved: ",
  "popup.status.analyzing": "Analyzing saved bookmark...",
  "popup.error.apiKeyMissing": "Add an API key in Settings to enable automatic analysis.",
  "popup.error.saveFallback": "Failed to save current page",
  "popup.error.saveUnavailableMetadata": "Current tab can't be saved because its title or URL is unavailable.",
  "popup.error.analyzeFallback": "Failed to analyze bookmark",
  "popup.synced.badge": "In library",
  "popup.unsynced.badge": "Not saved",
  "popup.unsynced.helperTitle": "Save this page to your AI bookmark library",
  "popup.unsynced.helperBody": "TabVault stores the current page locally so you can analyze it later, search it from the sidepanel, and build a private knowledge base.",
  "sidepanel.header.tagline": "Ask about the current page and your saved knowledge.",
  "sidepanel.search.label": "Search bookmarks",
  "sidepanel.search.placeholder": "Search bookmarks...",
  "sidepanel.search.clear": "Clear search",
  "sidepanel.input.placeholder": "Ask Ghostreader...",
  "sidepanel.input.submit": "Send to Ghostreader",
  "sidepanel.import.button": "Sync Bookmarks",
  "sidepanel.import.syncing": "Syncing...",
  "sidepanel.import.success": "Imported {count} bookmarks",
  "sidepanel.welcome.prompt": "I've read the current page{title}. What would you like to know?",
  "sidepanel.welcome.chip.summarize": "Summarize key points",
  "sidepanel.welcome.chip.codeSnippets": "List related code snippets",
  "sidepanel.bookmarks.connectedPrefix": "Connected {count} saved bookmarks, ask or search freely.",
  "sidepanel.bookmarks.loading": "Loading bookmarks...",
  "sidepanel.apiKeyMissing": "Add an API key in Settings to enable analysis.",
  "sidepanel.error.loadBookmarks": "Failed to load bookmarks",
  "sidepanel.error.activateLicense": "Failed to activate license",
  "sidepanel.error.analyzeFailed": "Failed to analyze bookmark",
  "sidepanel.error.updateTags": "Failed to update tags",
  "sidepanel.error.importFailed": "Import failed",
  "sidepanel.error.ghostreaderFailed": "Ghostreader failed to answer",
  "sidepanel.trial.activate": "Activate now",
  "sidepanel.trial.unlock": "Unlock TabVault",
  "sidepanel.trial.try": "Try TabVault free for 3 days.",
  "sidepanel.trial.locked": "New AI analysis is locked until you activate TabVault.",
  "hybrid.context.ariaLabel": "Hybrid retrieval context",
  "hybrid.context.currentPage": "Current page",
  "hybrid.context.unavailable": "Unavailable",
  "hybrid.context.library": "Library",
  "hybrid.context.indexed": "{count} bookmarks indexed",
  "hybrid.context.enabled": "Hybrid local search enabled",
  "hybrid.query.ariaLabel": "Hybrid query stream",
  "hybrid.query.query": "Query",
  "hybrid.query.currentPageMatch": "Current page match",
  "hybrid.query.currentPage": "Current page",
  "hybrid.query.savedBookmarks": "Saved bookmarks",
  "hybrid.query.savedBookmark": "Saved bookmark",
  "hybrid.action.askCurrentPage": "Ask current page",
  "hybrid.action.askTopMatches": "Ask top matches",
  "hybrid.action.openDashboard": "Open in dashboard",
  "drawer.action.open": "Open",
  "drawer.action.close": "Close details",
  "drawer.section.url": "URL",
  "drawer.summary.title": "AI Summary",
  "drawer.summary.regenerate": "Re-generate",
  "drawer.tags.title": "Smart Tags",
  "drawer.tags.edit": "Edit tags",
  "drawer.tags.done": "Done editing tags",
  "drawer.tags.remove": "Remove tag {tag}",
  "drawer.tags.inputPlaceholder": "+ Add custom tag...",
  "drawer.date.saved": "Saved {date}",
  "drawer.date.updated": "Updated {date}",
  "drawer.button.analyze": "Analyze",
  "drawer.button.clearAnalysis": "Clear analysis",
  "drawer.status.saved": "Saved",
  "drawer.status.done": "Analyzed",
  "drawer.status.error": "Error",
  "drawer.status.analyzing": "Analyzing",
  "dashboard.navigation.library": "Library",
  "dashboard.navigation.allBookmarks": "All bookmarks",
  "dashboard.navigation.recents": "Recents",
  "dashboard.navigation.highlights": "Highlights",
  "dashboard.navigation.folders": "Bookmark folders",
  "dashboard.navigation.tags": "Smart tags",
  "dashboard.navigation.tagFrontend": "# frontend",
  "dashboard.navigation.tagAi": "# AI tutorials",
  "dashboard.navigation.settings": "Architecture settings",
  "dashboard.results.heading": "All bookmarks",
  "dashboard.results.searchPlaceholder": "Search titles, full text, tags, or your notes...",
  "dashboard.results.searchShortcut": "Ctrl+K",
  "dashboard.results.empty": "No bookmarks match your search.",
  "dashboard.results.noSummary": "No summary yet.",
  "dashboard.results.summaryBadge": "Notes",
  "dashboard.results.savedBadge": "Saved",
  "dashboard.reading.empty": "Select a bookmark to start reading",
  "dashboard.reading.action.open": "Open in browser",
  "dashboard.reading.action.delete": "Delete bookmark",
  "dashboard.reading.tab.notes": "Notes",
  "dashboard.reading.tab.ai": "AI workspace",
  "dashboard.reading.section.tags": "Tags",
  "dashboard.reading.tags.empty": "No tags yet",
  "dashboard.reading.section.summary": "Summary",
  "dashboard.reading.summary.empty": "No summary yet. Use AI workspace to generate one.",
  "dashboard.reading.section.notes": "My notes",
  "dashboard.reading.notes.empty": "Your notes and clipped text will appear here.",
  "dashboard.reading.format.bold": "Bold",
  "dashboard.reading.format.italic": "Italic",
  "dashboard.reading.format.quote": "Quote",
  "dashboard.reading.autosave": "Autosaved",
  "dashboard.ask.title": "Ask Ghostreader",
  "dashboard.ask.placeholder": "Ask Ghostreader about this bookmark...",
  "dashboard.ask.submit": "Send question",
  "dashboard.ask.answer.none": "No local results found for: {query}",
  "dashboard.ask.answer.found": "Based on {titles}, here are the most relevant local results for: {query}",
  "dashboard.aiSidebar.label": "AI tools",
  "dashboard.summary.title": "AI Summary",
  "dashboard.summary.edit": "Edit",
  "dashboard.summary.editAria": "Edit summary",
  "dashboard.summary.inputAria": "Summary text",
  "dashboard.summary.cancel": "Cancel",
  "dashboard.summary.cancelAria": "Cancel summary edit",
  "dashboard.summary.save": "Save",
  "dashboard.summary.saveAria": "Save summary",
  "dashboard.summary.empty": "No summary yet.",
  "dashboard.tags.title": "Smart Tags",
  "dashboard.tags.edit": "Edit",
  "dashboard.tags.editAria": "Edit tags",
  "dashboard.tags.inputAria": "New tag",
  "dashboard.tags.cancel": "Cancel",
  "dashboard.tags.cancelAria": "Cancel tags edit",
  "dashboard.tags.save": "Save",
  "dashboard.tags.saveAria": "Save tags",
  "dashboard.tags.empty": "No tags yet.",
  "dashboard.tags.inputPlaceholder": "Add a tag...",
  "dashboard.bulkEdit.placeholder": "Bulk edit coming soon",
  "common.theme.switchToLight": "Switch to light mode",
  "common.theme.switchToDark": "Switch to dark mode"
}

const zh: Messages = {
  ...en,
  "settings.title": "架构设置",
  "settings.subtitle": "配置模型提供商、检索架构、体验行为与许可状态。",
  "settings.knowledge.title": "知识库",
  "settings.knowledge.subtitle": "管理本地书签存储、检索索引、隐私过滤规则和清理工具。",
  "settings.nav.settings": "设置",
  "settings.nav.architecture": "架构设置",
  "settings.nav.knowledge": "知识库",
  "settings.sidebar.tagline": "让你的书签成为可搜索的本地知识。",
  "settings.tab.agent": "Agent 设置",
  "settings.tab.retrieval": "检索与索引",
  "settings.section.provider": "模型与提供商",
  "settings.section.retrieval": "检索配置",
  "settings.section.experience": "体验与自动化",
  "settings.section.license": "许可与激活",
  "settings.provider.heading": "模型与提供商",
  "settings.provider.connectionFailed": "\u8fde\u63a5\u5931\u8d25",
  "settings.theme.label": "主题",
  "settings.knowledge.card.title": "知识库概览",
  "settings.knowledge.card.description": "管理本地书签、检索索引和隐私规则，保持 TabVault 默认本地优先。",
  "settings.license.unavailable": "当前许可状态不可用",
  "settings.displayLanguage.label": "界面语言",
  "settings.displayLanguage.option.en": "英语",
  "settings.displayLanguage.option.zh": "中文",
  "settings.summaryLanguage.label": "摘要语言",
  "settings.summaryLanguage.option.auto": "跟随问题自动选择",
  "settings.summaryLanguage.option.zh": "中文",
  "settings.summaryLanguage.option.en": "英语",
  "settings.summaryLanguage.option.ja": "日语",
  "settings.summaryLanguage.option.ko": "韩语",
  "settings.summaryLanguage.option.fr": "法语",
  "settings.summaryLanguage.option.de": "德语",
  "settings.summaryLanguage.option.es": "西班牙语",
  "settings.defaultProvider.label": "默认提供商",
  "settings.defaultProvider.badge": "默认",
  "settings.autoAnalyzeOnSave.label": "保存后自动分析",
  "settings.autoRetryOnError.label": "分析失败时自动重试",
  "settings.autoFollowContent.label": "自动跟随页面内容",
  "settings.retrieval.description": "这里会逐步开放检索链路、索引重建和实验性能力。",
  "settings.retrieval.placeholder": "Reranking 与向量检索重建功能即将上线。",
  "settings.retrieval.clearAll": "清空全部分析",
  "settings.retrieval.clearErrors": "清理失败分析",
  "settings.save.title": "保存设置",
  "settings.save.button": "保存设置",
  "settings.save.status.loading": "正在加载设置...",
  "settings.save.status.loadError": "加载设置失败",
  "settings.save.status.saving": "正在保存...",
  "settings.save.status.saved": "设置已保存",
  "settings.save.status.saveError": "保存设置失败",
  "settings.save.status.ready": "可以保存",
  "settings.trial.cta.activate": "立即激活",
  "settings.trial.cta.unlock": "解锁 TabVault",
  "settings.trial.message.try": "免费试用 TabVault 3 天。",
  "settings.trial.message.locked": "激活 TabVault 后即可继续新的 AI 分析。",
  "settings.trial.detail.savedAnalysis": "已保存的分析会继续保留。",
  "settings.trial.detail.remaining": "{days} \u5929\u5269\u4f59 \u00b7 \u8fd8\u53ef\u5206\u6790 {analyses} \u6b21",
  "settings.license.invalid": "许可密钥无效。",
  "settings.license.unvalidated": "许可尚未验证，请稍后重试。",
  "settings.license.saveError": "保存许可状态失败",
  "trialBanner.title.trial": "试用中",
  "trialBanner.title.expired": "试用已结束",
  "license.heading.activate": "激活 TabVault",
  "license.description.activate": "输入许可密钥以解锁完整功能。",
  "license.heading.activated": "已激活",
  "license.description.activated": "你的许可已激活，可以继续使用全部功能。",
  "license.field.label": "许可密钥",
  "license.button.activate": "激活",
  "license.button.activating": "激活中...",
  "license.button.change": "更换许可密钥",
  "popup.currentPage.label": "当前页面",
  "popup.currentPage.loading": "正在读取当前页面...",
  "popup.currentPage.unavailable": "当前页面不可用",
  "popup.actions.openSidepanel": "打开侧边栏",
  "popup.actions.openDashboard": "打开面板",
  "popup.actions.openSettings": "打开设置",
  "popup.primary.save": "保存当前页面",
  "popup.primary.saving": "正在保存...",
  "popup.primary.analyzing": "正在分析...",
  "popup.status.ready": "可以保存当前页面。",
  "popup.status.saving": "正在保存当前页面...",
  "popup.status.savedPrefix": "已保存：",
  "popup.status.analyzing": "正在分析已保存书签...",
  "popup.error.apiKeyMissing": "请先在设置中填写 API Key，才能启用自动分析。",
  "popup.error.saveFallback": "保存当前页面失败",
  "popup.error.saveUnavailableMetadata": "当前标签页缺少标题或 URL，无法保存。",
  "popup.error.analyzeFallback": "分析书签失败",
  "popup.synced.badge": "已在库中",
  "popup.unsynced.badge": "未保存",
  "popup.unsynced.helperTitle": "把这个页面保存到你的 AI 书签库",
  "popup.unsynced.helperBody": "TabVault 会将当前页面保存在本地，方便你稍后分析、在侧边栏搜索，并构建私有知识库。",
  "sidepanel.header.tagline": "围绕当前页面和已保存知识提问。",
  "sidepanel.search.label": "搜索书签",
  "sidepanel.search.placeholder": "搜索书签...",
  "sidepanel.search.clear": "清空搜索",
  "sidepanel.input.placeholder": "向 Ghostreader 提问...",
  "sidepanel.input.submit": "发送给 Ghostreader",
  "sidepanel.import.button": "同步书签",
  "sidepanel.import.syncing": "同步中...",
  "sidepanel.import.success": "已导入 {count} 条书签",
  "sidepanel.welcome.prompt": "我已经读完当前页面{title}。你想了解什么？",
  "sidepanel.welcome.chip.summarize": "总结重点",
  "sidepanel.welcome.chip.codeSnippets": "列出相关代码片段",
  "sidepanel.bookmarks.connectedPrefix": "已连接 {count} 条已保存书签，可直接提问或搜索。",
  "sidepanel.bookmarks.loading": "正在加载书签...",
  "sidepanel.apiKeyMissing": "请先在设置中填写 API Key，才能启用分析。",
  "sidepanel.error.loadBookmarks": "加载书签失败",
  "sidepanel.error.activateLicense": "激活许可失败",
  "sidepanel.error.analyzeFailed": "分析书签失败",
  "sidepanel.error.updateTags": "更新标签失败",
  "sidepanel.error.importFailed": "导入失败",
  "sidepanel.error.ghostreaderFailed": "Ghostreader 回答失败",
  "sidepanel.trial.activate": "立即激活",
  "sidepanel.trial.unlock": "解锁 TabVault",
  "sidepanel.trial.try": "免费试用 TabVault 3 天。",
  "sidepanel.trial.locked": "激活 TabVault 后才能继续新的 AI 分析。",
  "hybrid.context.ariaLabel": "混合检索上下文",
  "hybrid.context.currentPage": "当前页面",
  "hybrid.context.unavailable": "不可用",
  "hybrid.context.library": "知识库",
  "hybrid.context.indexed": "已索引 {count} 条书签",
  "hybrid.context.enabled": "已启用本地混合搜索",
  "hybrid.query.ariaLabel": "混合查询流",
  "hybrid.query.query": "问题",
  "hybrid.query.currentPageMatch": "当前页面匹配",
  "hybrid.query.currentPage": "当前页面",
  "hybrid.query.savedBookmarks": "已保存书签",
  "hybrid.query.savedBookmark": "已保存书签",
  "hybrid.action.askCurrentPage": "询问当前页面",
  "hybrid.action.askTopMatches": "询问最佳匹配",
  "hybrid.action.openDashboard": "在面板中打开",
  "drawer.action.open": "打开",
  "drawer.action.close": "关闭详情",
  "drawer.section.url": "链接",
  "drawer.summary.title": "AI 摘要",
  "drawer.summary.regenerate": "重新生成",
  "drawer.tags.title": "智能标签",
  "drawer.tags.edit": "编辑标签",
  "drawer.tags.done": "完成标签编辑",
  "drawer.tags.remove": "移除标签 {tag}",
  "drawer.tags.inputPlaceholder": "+ 添加自定义标签...",
  "drawer.date.saved": "保存于 {date}",
  "drawer.date.updated": "更新于 {date}",
  "drawer.button.analyze": "分析",
  "drawer.button.clearAnalysis": "清除分析",
  "drawer.status.saved": "已保存",
  "drawer.status.done": "已分析",
  "drawer.status.error": "错误",
  "drawer.status.analyzing": "分析中",
  "dashboard.navigation.library": "知识库",
  "dashboard.navigation.allBookmarks": "全部书签",
  "dashboard.navigation.recents": "最近查看",
  "dashboard.navigation.highlights": "精选内容",
  "dashboard.navigation.folders": "书签文件夹",
  "dashboard.navigation.tags": "智能标签",
  "dashboard.navigation.tagFrontend": "# 前端",
  "dashboard.navigation.tagAi": "# AI 教程",
  "dashboard.navigation.settings": "架构设置",
  "dashboard.results.heading": "全部书签",
  "dashboard.results.searchPlaceholder": "搜索标题、全文、标签或你的笔记...",
  "dashboard.results.searchShortcut": "Ctrl+K",
  "dashboard.results.empty": "没有匹配当前搜索的书签。",
  "dashboard.results.noSummary": "暂无摘要。",
  "dashboard.results.summaryBadge": "笔记",
  "dashboard.results.savedBadge": "已保存",
  "dashboard.reading.empty": "选择一个书签开始阅读",
  "dashboard.reading.action.open": "在浏览器中打开",
  "dashboard.reading.action.delete": "删除书签",
  "dashboard.reading.tab.notes": "笔记",
  "dashboard.reading.tab.ai": "AI 工作区",
  "dashboard.reading.section.tags": "标签",
  "dashboard.reading.tags.empty": "暂无标签",
  "dashboard.reading.section.summary": "摘要",
  "dashboard.reading.summary.empty": "暂无摘要，使用 AI 工作区生成一个。",
  "dashboard.reading.section.notes": "我的笔记",
  "dashboard.reading.notes.empty": "你的笔记和剪藏内容会显示在这里。",
  "dashboard.reading.format.bold": "加粗",
  "dashboard.reading.format.italic": "斜体",
  "dashboard.reading.format.quote": "引用",
  "dashboard.reading.autosave": "自动保存",
  "dashboard.ask.title": "询问 Ghostreader",
  "dashboard.ask.placeholder": "向 Ghostreader 询问这个书签...",
  "dashboard.ask.submit": "发送问题",
  "dashboard.ask.answer.none": "没有找到与 {query} 相关的本地结果。",
  "dashboard.ask.answer.found": "基于 {titles}，以下是与你的问题 {query} 最相关的本地结果。",
  "dashboard.summary.title": "AI 摘要",
  "dashboard.summary.edit": "编辑",
  "dashboard.summary.editAria": "编辑摘要",
  "dashboard.summary.cancel": "取消",
  "dashboard.summary.cancelAria": "取消编辑摘要",
  "dashboard.summary.save": "保存",
  "dashboard.summary.saveAria": "保存摘要",
  "dashboard.summary.empty": "暂无摘要。",
  "dashboard.tags.title": "智能标签",
  "dashboard.tags.edit": "编辑",
  "dashboard.tags.editAria": "编辑标签",
  "dashboard.tags.cancel": "取消",
  "dashboard.tags.cancelAria": "取消编辑标签",
  "dashboard.tags.save": "保存",
  "dashboard.tags.saveAria": "保存标签",
  "dashboard.tags.empty": "暂无标签。",
  "dashboard.tags.inputPlaceholder": "添加标签...",
  "dashboard.bulkEdit.placeholder": "批量编辑即将上线",
  "common.theme.switchToLight": "切换到浅色模式",
  "common.theme.switchToDark": "切换到深色模式",
  "dashboard.aiSidebar.label": "\u667a\u80fd\u5de5\u5177",
  "dashboard.summary.inputAria": "\u6458\u8981\u5185\u5bb9",
  "dashboard.tags.inputAria": "\u65b0\u6807\u7b7e",
}

const MESSAGES: Record<DisplayLanguage, Messages> = { en, zh }

export function getMessage(language: DisplayLanguage, key: MessageKey): string {
  return MESSAGES[language]?.[key] ?? MESSAGES.en[key]
}
