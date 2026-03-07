export type AnalyzeInput = {
  title: string
  url: string
  content: string
}

export type AnalyzeResult = {
  summary: string
  tags: string[]
}

export interface AiProvider {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>
}
