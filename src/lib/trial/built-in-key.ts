// 内置 key 仅在 background 层使用
// 实际部署时替换为真实的 key（通过环境变量注入）
declare const process: { env: Record<string, string | undefined> }
const BUILT_IN_KEY = process.env.PLASMO_PUBLIC_BUILT_IN_KEY ?? ""

export type BuiltInKeyConfig = {
  provider: "openai"
  apiKey: string
  baseUrl: string
  model: string
  enabled: boolean
}

export function getBuiltInKeyConfig(): BuiltInKeyConfig {
  return {
    provider: "openai",
    apiKey: BUILT_IN_KEY,
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    enabled: BUILT_IN_KEY.length > 0
  }
}
