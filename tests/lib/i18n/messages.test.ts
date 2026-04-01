import { describe, expect, it } from "vitest"
import { getMessage, type MessageKey } from "../../../src/lib/i18n/messages"

describe("getMessage", () => {
  it("returns English string for en locale", () => {
    expect(getMessage("en", "settings.title")).toBe("Architecture Settings")
  })

  it("returns Chinese string for zh locale", () => {
    expect(getMessage("zh", "settings.title")).toBe("架构配置")
  })

  it("falls back to English when locale is unknown", () => {
    expect(getMessage("en", "settings.title")).toBe("Architecture Settings")
  })

  it("returns English for all known keys without throwing", () => {
    const keys: MessageKey[] = [
      "settings.title",
      "settings.subtitle",
      "settings.nav.settings",
      "settings.sidebar.tagline",
      "settings.tab.agent",
      "settings.tab.retrieval",
      "settings.section.provider",
      "settings.section.retrieval",
      "settings.section.experience",
      "settings.section.license",
      "settings.displayLanguage.label",
      "settings.displayLanguage.option.en",
      "settings.displayLanguage.option.zh",
      "settings.summaryLanguage.label",
      "settings.summaryLanguage.option.auto",
      "settings.summaryLanguage.option.zh",
      "settings.summaryLanguage.option.en",
      "settings.summaryLanguage.option.ja",
      "settings.summaryLanguage.option.ko",
      "settings.summaryLanguage.option.fr",
      "settings.summaryLanguage.option.de",
      "settings.summaryLanguage.option.es",
      "settings.defaultProvider.label",
      "settings.defaultProvider.badge",
      "settings.autoAnalyzeOnSave.label",
      "settings.autoRetryOnError.label",
      "settings.autoFollowContent.label",
      "settings.retrieval.description",
      "settings.retrieval.placeholder",
      "settings.retrieval.clearAll",
      "settings.retrieval.clearErrors",
      "settings.save.title",
      "settings.save.button",
      "settings.save.status.loading",
      "settings.save.status.loadError",
      "settings.save.status.saving",
      "settings.save.status.saved",
      "settings.save.status.saveError",
      "settings.save.status.ready",
      "popup.currentPage.label",
      "popup.currentPage.loading",
      "popup.currentPage.unavailable",
      "popup.actions.openSidepanel",
      "popup.actions.openDashboard",
      "popup.actions.openSettings",
      "popup.primary.save",
      "popup.primary.saving",
      "popup.primary.analyzing",
      "popup.status.ready",
      "popup.status.saving",
      "popup.status.savedPrefix",
      "popup.status.analyzing",
      "popup.error.apiKeyMissing",
      "popup.error.saveFallback",
      "popup.error.saveUnavailableMetadata",
      "popup.error.analyzeFallback",
    ]
    for (const key of keys) {
      expect(typeof getMessage("en", key)).toBe("string")
      expect(typeof getMessage("zh", key)).toBe("string")
    }
  })
})
