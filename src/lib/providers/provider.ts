import type { SummaryLanguage } from "../../types/settings"

export type AnalyzeInput = {
  title: string
  url: string
  content: string
  summaryLanguage?: SummaryLanguage
}

export type AnalyzeResult = {
  summary: string
  tags: string[]
}

export interface AiProvider {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>
}
