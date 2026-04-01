import type { DisplayLanguage } from "../../types/settings"

export type MessageKey =
  | "settings.title"
  | "settings.subtitle"
  | "settings.nav.settings"
  | "settings.sidebar.tagline"
  | "settings.tab.agent"
  | "settings.tab.retrieval"
  | "settings.section.provider"
  | "settings.section.retrieval"
  | "settings.section.experience"
  | "settings.section.license"
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
  | "sidepanel.header.tagline"
  | "sidepanel.search.placeholder"
  | "sidepanel.input.placeholder"
  | "sidepanel.import.button"
  | "sidepanel.import.syncing"
  | "sidepanel.import.success"
  | "sidepanel.welcome.prompt"
  | "sidepanel.welcome.chip.summarize"
  | "sidepanel.welcome.chip.codeSnippets"
  | "sidepanel.bookmarks.connectedPrefix"
  | "sidepanel.bookmarks.loading"
  | "sidepanel.apiKeyMissing"

type Messages = Record<MessageKey, string>

const en: Messages = {
  "settings.title": "Architecture Settings",
  "settings.subtitle": "Configure provider protocols, retrieval architecture, experience behavior, and licensing.",
  "settings.nav.settings": "Settings",
  "settings.sidebar.tagline": "Local-first bookmark workspace",
  "settings.tab.agent": "Agent Companion Engine",
  "settings.tab.retrieval": "Lightweight Hybrid Retrieval",
  "settings.section.provider": "Provider & Protocol",
  "settings.section.retrieval": "Retrieval Architecture",
  "settings.section.experience": "Experience & Automation",
  "settings.section.license": "Trial & License",
  "settings.displayLanguage.label": "Display language",
  "settings.displayLanguage.option.en": "English",
  "settings.displayLanguage.option.zh": "中文",
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
  "settings.defaultProvider.badge": "Default provider",
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
  "sidepanel.header.tagline": "Ask about the current page and your saved knowledge.",
  "sidepanel.search.placeholder": "Search bookmarks...",
  "sidepanel.input.placeholder": "Ask Ghostreader...",
  "sidepanel.import.button": "Sync Bookmarks",
  "sidepanel.import.syncing": "Syncing...",
  "sidepanel.import.success": "Imported {count} bookmarks",
  "sidepanel.welcome.prompt": "I've read the current page{title}. What would you like to know?",
  "sidepanel.welcome.chip.summarize": "Summarize key points",
  "sidepanel.welcome.chip.codeSnippets": "List related code snippets",
  "sidepanel.bookmarks.connectedPrefix": "Connected {count} saved bookmarks, ask or search freely.",
  "sidepanel.bookmarks.loading": "Loading bookmarks...",
  "sidepanel.apiKeyMissing": "Add an API key in Settings to enable analysis.",
}

const zh: Messages = {
  "settings.title": "架构配置",
  "settings.subtitle": "配置 Provider 协议、检索架构、体验行为和许可证。",
  "settings.nav.settings": "设置",
  "settings.sidebar.tagline": "本地优先的书签工作台",
  "settings.tab.agent": "Agent 伴读引擎",
  "settings.tab.retrieval": "轻量级混合检索",
  "settings.section.provider": "Provider 与协议",
  "settings.section.retrieval": "检索架构",
  "settings.section.experience": "体验与自动化",
  "settings.section.license": "试用与许可证",
  "settings.displayLanguage.label": "界面语言",
  "settings.displayLanguage.option.en": "英文",
  "settings.displayLanguage.option.zh": "中文",
  "settings.summaryLanguage.label": "摘要语言",
  "settings.summaryLanguage.option.auto": "自动跟随内容",
  "settings.summaryLanguage.option.zh": "中文",
  "settings.summaryLanguage.option.en": "英文",
  "settings.summaryLanguage.option.ja": "日文",
  "settings.summaryLanguage.option.ko": "韩文",
  "settings.summaryLanguage.option.fr": "法文",
  "settings.summaryLanguage.option.de": "德文",
  "settings.summaryLanguage.option.es": "西班牙文",
  "settings.defaultProvider.label": "默认 Provider",
  "settings.defaultProvider.badge": "默认 Provider",
  "settings.autoAnalyzeOnSave.label": "保存时自动分析",
  "settings.autoRetryOnError.label": "分析失败时自动重试",
  "settings.autoFollowContent.label": "自动跟随内容",
  "settings.retrieval.description": "配置本地检索如何在已保存书签和当前页面上下文之间工作。",
  "settings.retrieval.placeholder": "Reranking 和架构路由相关控件尚未接入。",
  "settings.retrieval.clearAll": "清空全部分析",
  "settings.retrieval.clearErrors": "清空失败分析",
  "settings.save.title": "保存设置",
  "settings.save.button": "保存设置",
  "settings.save.status.loading": "正在加载设置...",
  "settings.save.status.loadError": "加载设置失败",
  "settings.save.status.saving": "正在保存...",
  "settings.save.status.saved": "设置已保存",
  "settings.save.status.saveError": "保存设置失败",
  "settings.save.status.ready": "就绪",
  "popup.currentPage.label": "正在浏览",
  "popup.currentPage.loading": "正在加载当前页面...",
  "popup.currentPage.unavailable": "当前页面不可用",
  "popup.actions.openSidepanel": "打开侧边栏",
  "popup.actions.openDashboard": "控制台",
  "popup.actions.openSettings": "打开设置",
  "popup.primary.save": "保存当前页面",
  "popup.primary.saving": "正在保存...",
  "popup.primary.analyzing": "分析中...",
  "popup.status.ready": "准备保存当前页面。",
  "popup.status.saving": "正在保存当前页面...",
  "popup.status.savedPrefix": "已保存：",
  "popup.status.analyzing": "正在分析已保存书签...",
  "popup.error.apiKeyMissing": "请先在设置中添加 API key 以启用自动分析。",
  "popup.error.saveFallback": "保存当前页面失败",
  "popup.error.saveUnavailableMetadata": "当前标签页缺少标题或 URL，无法保存。",
  "popup.error.analyzeFallback": "分析书签失败",
  "sidepanel.header.tagline": "询问当前页面与已保存知识库。",
  "sidepanel.search.placeholder": "搜索书签...",
  "sidepanel.input.placeholder": "向 Ghostreader 提问...",
  "sidepanel.import.button": "同步书签",
  "sidepanel.import.syncing": "正在同步...",
  "sidepanel.import.success": "已导入 {count} 条书签",
  "sidepanel.welcome.prompt": "我已阅读当前页面{title}。你想了解什么？",
  "sidepanel.welcome.chip.summarize": "总结核心观点",
  "sidepanel.welcome.chip.codeSnippets": "列出相关代码片段",
  "sidepanel.bookmarks.connectedPrefix": "已连接 {count} 条已保存书签，可直接提问或搜索。",
  "sidepanel.bookmarks.loading": "正在加载书签...",
  "sidepanel.apiKeyMissing": "请先在设置中添加 API key 以启用分析。",
}

const MESSAGES: Record<DisplayLanguage, Messages> = { en, zh }

export function getMessage(language: DisplayLanguage, key: MessageKey): string {
  return MESSAGES[language]?.[key] ?? MESSAGES.en[key]
}
