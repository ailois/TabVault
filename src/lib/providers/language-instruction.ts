import type { SummaryLanguage } from "../../types/settings"

const LANGUAGE_NAMES: Record<Exclude<SummaryLanguage, "auto">, string> = {
  zh: "Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish"
}

export function buildLanguageInstruction(language: SummaryLanguage | undefined): string {
  if (!language || language === "auto") return ""
  return ` Please respond in ${LANGUAGE_NAMES[language]}.`
}
