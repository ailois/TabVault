import type { AppSettings } from "../../types/settings"

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultProvider: "openai",
  autoAnalyzeOnSave: false,
  summaryLanguage: "auto"
}
