# OpenAI Auto-Routed Responses API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 移除独立的 Responses provider UI，把 `/v1/responses` 作为 OpenAI-compatible provider 内部自动路由能力，并在测试连接与真实分析中共享同一套判定与回退逻辑。

**Architecture:** 保持 UI 只有 `openai`、`claude`、`gemini` 三类 provider。`OpenAiCompatibleProvider` 内部拆分 chat completions 与 responses 两条调用路径，通过 `shouldPreferResponsesApi(model)` 做第一层选择，并通过 `shouldFallbackToResponses(error)` 在可识别的协议/端点不匹配场景下从 chat 自动回退到 responses。Responses 解析逻辑保留为 OpenAI provider 内部 helper，不再作为独立 provider 对外暴露。

**Tech Stack:** TypeScript, React, Vitest

---

### Task 1: 回退 settings 类型与 UI，移除独立 Responses provider 暴露

**Files:**
- Modify: `src/types/settings.ts`
- Modify: `src/features/settings/provider-form-state.ts`
- Modify: `src/components/provider-settings-form.tsx`
- Modify: `src/options.tsx:650-920`
- Test: `tests/settings/provider-form-state.test.ts`
- Test: `tests/ui/options-save-state.test.tsx`
- Test: `tests/ui/options.test.tsx`

**Step 1: 先写/更新失败测试，明确 UI 只剩 3 个 provider**

在 `tests/settings/provider-form-state.test.ts` 中，把固定 provider 断言从 4 项改回 3 项：

```typescript
it("returns fixed rows for openai, claude, and gemini in order", () => {
  const state = buildProviderFormState([])

  expect(state).toEqual([
    {
      provider: "openai",
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      enabled: false
    },
    {
      provider: "claude",
      apiKey: "",
      model: "claude-sonnet-4-5",
      enabled: false
    },
    {
      provider: "gemini",
      apiKey: "",
      model: "gemini-1.5-flash",
      enabled: false
    }
  ])
})
```

同时把第二个测试中的 `responses` 默认项从预期中删除。

在 `tests/ui/options-save-state.test.tsx` 中，把两个 `saveProviders(...toHaveBeenCalledWith(...))` 断言中的 `responses` 项删除。

在 `tests/ui/options.test.tsx` 中新增一个断言：页面中不应出现 `Responses API` 文案。

```typescript
expect(screen.queryByText("Responses API")).toBeNull()
```

**Step 2: 运行相关测试，确认失败**

Run:
```bash
npx vitest run tests/settings/provider-form-state.test.ts tests/ui/options-save-state.test.tsx tests/ui/options.test.tsx
```

Expected: FAIL，当前实现仍包含 `responses` provider。

**Step 3: 删除 `responses` 作为对外 provider 类型**

在 `src/types/settings.ts` 中，将：

```typescript
export type ProviderType = "openai" | "claude" | "gemini" | "responses"
```

改回：

```typescript
export type ProviderType = "openai" | "claude" | "gemini"
```

**Step 4: 回退 provider form state**

在 `src/features/settings/provider-form-state.ts` 中：
- 删除 `responses` 默认配置块
- 将 `PROVIDER_ORDER` 改回 `['openai', 'claude', 'gemini']`
- 把 `if (provider === "openai" || provider === "responses")` 改回只处理 `openai`

目标状态：

```typescript
const PROVIDER_ORDER: ProviderType[] = ["openai", "claude", "gemini"]

if (provider === "openai") {
  return {
    ...defaults,
    ...stored,
    baseUrl: stored.baseUrl ?? defaults.baseUrl
  }
}
```

**Step 5: 回退 provider form UI**

在 `src/components/provider-settings-form.tsx` 中：
- 删除 `responses` label / description / color / base URL default
- Base URL 区块恢复为只覆盖 `openai | claude | gemini`
- “optional” 提示恢复为只对非 openai 生效

目标片段：

```typescript
const PROVIDER_LABELS = {
  openai: "OpenAI-compatible",
  claude: "Claude",
  gemini: "Gemini"
}
```

```typescript
{(value.provider === "openai" || value.provider === "claude" || value.provider === "gemini") ? (
```

```typescript
{value.provider !== "openai" ? (
```

**Step 6: 调整 provider rail 副标题，移除突兀的 `Edit configuration`**

在 `src/options.tsx:857-862` 附近，将：

```typescript
<span style={{ fontSize: "0.75rem", color: isActive ? theme.accent : theme.textMuted }}>
  {isDefault ? "Default provider" : "Edit configuration"}
</span>
```

替换为更中性的形式，例如：

```typescript
{isDefault ? (
  <span style={{ fontSize: "0.75rem", color: isActive ? theme.accent : theme.textMuted }}>
    Default provider
  </span>
) : null}
```

这样非默认项不再显示多余副标题。

**Step 7: 运行 UI / settings 测试，确认通过**

Run:
```bash
npx vitest run tests/settings/provider-form-state.test.ts tests/ui/options-save-state.test.tsx tests/ui/options.test.tsx
```

Expected: PASS

**Step 8: Commit**

```bash
git add src/types/settings.ts src/features/settings/provider-form-state.ts src/components/provider-settings-form.tsx src/options.tsx tests/settings/provider-form-state.test.ts tests/ui/options-save-state.test.tsx tests/ui/options.test.tsx
git commit -m "refactor(settings): remove standalone responses provider from UI"
```

---

### Task 2: 让 OpenAI-compatible provider 支持 Responses API 自动路由

**Files:**
- Modify: `src/lib/providers/openai-compatible-provider.ts`
- Modify: `src/lib/providers/provider-factory.ts`
- Test: `tests/providers/openai-compatible-provider.test.ts`
- Test: `tests/providers/provider-factory.test.ts`

**Step 1: 先写失败测试，定义自动路由行为**

在 `tests/providers/openai-compatible-provider.test.ts` 中新增 4 个测试：

1. 普通 model 走 `/chat/completions`
2. `gpt-5.4-mini` 优先走 `/responses`
3. chat 返回 `bad_model_output` 时自动回退到 `/responses`
4. chat 返回 `auth_error` 时不回退

示例测试：

```typescript
it("prefers responses API for gpt-5 models", async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    expect(String(input)).toBe("https://callflow.top/v1/responses")
    return makeJsonResponse({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '{"summary":"Short","tags":["one"]}' }]
        }
      ]
    })
  })

  const provider = new OpenAiCompatibleProvider({
    apiKey: "test-key",
    baseUrl: "https://callflow.top/v1",
    model: "gpt-5.4-mini",
    fetchImpl: fetchMock as any
  })

  const result = await provider.analyze({
    title: "Example",
    url: "https://example.com",
    content: "Example content"
  })

  expect(result.summary).toBe("Short")
  expect(result.tags).toEqual(["one"])
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
```

```typescript
it("falls back from chat completions to responses API for endpoint-mismatch style failures", async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    if (url.endsWith("/chat/completions")) {
      return makeJsonResponse({ choices: [{ message: {} }] })
    }

    return makeJsonResponse({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '{"summary":"Recovered","tags":["fallback"]}' }]
        }
      ]
    })
  })

  const provider = new OpenAiCompatibleProvider({
    apiKey: "test-key",
    baseUrl: "https://callflow.top/v1",
    model: "custom-model",
    fetchImpl: fetchMock as any
  })

  const result = await provider.analyze({
    title: "Example",
    url: "https://example.com",
    content: "Example content"
  })

  expect(result.summary).toBe("Recovered")
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(String(fetchMock.mock.calls[0][0])).toBe("https://callflow.top/v1/chat/completions")
  expect(String(fetchMock.mock.calls[1][0])).toBe("https://callflow.top/v1/responses")
})
```

```typescript
it("does not fall back to responses API for auth failures", async () => {
  const fetchMock = vi.fn(async () => makeJsonResponse({}, 401))

  const provider = new OpenAiCompatibleProvider({
    apiKey: "test-key",
    baseUrl: "https://callflow.top/v1",
    model: "custom-model",
    fetchImpl: fetchMock as any
  })

  await expect(
    provider.analyze({ title: "Example", url: "https://example.com", content: "Example content" })
  ).rejects.toMatchObject({
    code: "auth_error"
  })

  expect(fetchMock).toHaveBeenCalledTimes(1)
})
```

**Step 2: 运行 provider 测试，确认失败**

Run:
```bash
npx vitest run tests/providers/openai-compatible-provider.test.ts tests/providers/provider-factory.test.ts
```

Expected: FAIL，当前实现只有 chat 路径，且 factory 仍有独立 responses case。

**Step 3: 在 OpenAI provider 内部添加 Responses API 支持**

在 `src/lib/providers/openai-compatible-provider.ts` 中重构 `analyze`：

新增响应类型：

```typescript
type ResponsesApiResponse = {
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}
```

将 `analyze` 改为类似：

```typescript
async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
  if (shouldPreferResponsesApi(this.config.model)) {
    const text = await analyzeViaResponsesApi(this.config, input, this.fetchImpl, this.timeoutMs)
    return parseAnalyzeResult(text)
  }

  try {
    const text = await analyzeViaChatCompletions(this.config, input, this.fetchImpl, this.timeoutMs)
    return parseAnalyzeResult(text)
  } catch (error) {
    if (!shouldFallbackToResponses(error)) {
      throw error
    }

    const text = await analyzeViaResponsesApi(this.config, input, this.fetchImpl, this.timeoutMs)
    return parseAnalyzeResult(text)
  }
}
```

新增 helper：

```typescript
function shouldPreferResponsesApi(model: string): boolean {
  const normalized = model.trim().toLowerCase()
  return normalized === "gpt-5" || normalized.startsWith("gpt-5-") || normalized.startsWith("gpt-5.")
}
```

```typescript
function shouldFallbackToResponses(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const code = (error as { code?: unknown }).code
  if (code === "auth_error" || code === "rate_limit_error" || code === "server_error" || code === "network_error") {
    return false
  }
  return code === "bad_model_output" || code === "invalid_response" || code === "invalid_request_error"
}
```

把当前 chat 请求逻辑抽成：

```typescript
async function analyzeViaChatCompletions(
  config: OpenAiCompatibleProviderConfig,
  input: AnalyzeInput,
  fetchImpl: FetchLike,
  timeoutMs: number
): Promise<string>
```

把 `/v1/responses` 路径加入同一文件：

```typescript
async function analyzeViaResponsesApi(
  config: OpenAiCompatibleProviderConfig,
  input: AnalyzeInput,
  fetchImpl: FetchLike,
  timeoutMs: number
): Promise<string>
```

其请求体使用：

```typescript
const body = JSON.stringify({
  model: config.model,
  input: buildPrompt(input)
})
```

响应提取逻辑：

```typescript
function extractResponsesTextContent(data: ResponsesApiResponse): string {
  const text = data.output
    ?.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text?.trim() ?? "")
    .filter((item) => item.length > 0)
    .join("\n")

  if (!text) {
    throw normalizeProviderError(new Error("Responses API output contained no text"), {
      code: "bad_model_output",
      message: "OpenAI-compatible returned no text output"
    })
  }

  return text
}
```

注意：Responses 路径返回的“无文本”也统一成 OpenAI-compatible 的错误文案，避免 UI 暴露内部实现细节。

**Step 4: 删除独立 responses factory 分支**

在 `src/lib/providers/provider-factory.ts` 中：
- 删除 `import { ResponsesApiProvider } ...`
- 删除 `case "responses"`
- 保持 `openai` 仍返回 `OpenAiCompatibleProvider`

最终 switch 应只剩：`openai` / `claude` / `gemini`

**Step 5: 更新 factory 测试**

在 `tests/providers/provider-factory.test.ts` 中保留三项 provider 创建测试，不再包含 responses。

可补一个说明性测试名，但不需要额外新类型断言。

**Step 6: 运行 provider 测试，确认通过**

Run:
```bash
npx vitest run tests/providers/openai-compatible-provider.test.ts tests/providers/provider-factory.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/lib/providers/openai-compatible-provider.ts src/lib/providers/provider-factory.ts tests/providers/openai-compatible-provider.test.ts tests/providers/provider-factory.test.ts
git commit -m "feat(providers): auto-route OpenAI requests between chat and responses APIs"
```

---

### Task 3: 清理独立 Responses provider 文件与测试，并验证全局行为一致

**Files:**
- Delete: `src/lib/providers/responses-api-provider.ts`
- Delete: `tests/providers/responses-api-provider.test.ts`
- Modify: `tests/ui/options-load-state.test.tsx`
- Modify: `tests/ui/options-save-state.test.tsx`
- Modify: `tests/ui/options.test.tsx`
- Modify: `tests/providers/openai-compatible-provider.test.ts`
- Test: `tests/ui/options-load-state.test.tsx`
- Test: `tests/ui/options-save-state.test.tsx`
- Test: `tests/ui/options.test.tsx`
- Test: `tests/providers/openai-compatible-provider.test.ts`

**Step 1: 删除独立 responses provider 文件与测试文件**

删除：
- `src/lib/providers/responses-api-provider.ts`
- `tests/providers/responses-api-provider.test.ts`

**Step 2: 增加一条 UI 一致性测试**

在 `tests/ui/options-load-state.test.tsx` 或 `tests/ui/options.test.tsx` 中新增断言：

```typescript
expect(screen.queryByText("Responses API")).toBeNull()
```

并确认 provider rail 数量仍为 3。

**Step 3: 运行局部测试，确认通过**

Run:
```bash
npx vitest run tests/ui/options-load-state.test.tsx tests/ui/options-save-state.test.tsx tests/ui/options.test.tsx tests/providers/openai-compatible-provider.test.ts
```

Expected: PASS

**Step 4: 运行全量测试，确认没有回归**

Run:
```bash
npx vitest run
```

Expected: PASS

**Step 5: Commit**

```bash
git add src tests
git commit -m "refactor(openai): hide responses API behind automatic endpoint routing"
```

---

### Task 4: 手工验证 callflow.top 的实际行为

**Files:**
- Reference: `src/options.tsx`
- Reference: `src/lib/providers/openai-compatible-provider.ts`

**Step 1: 使用 reasoning model 验证优先走 responses**

手工在 UI 中设置：
- Provider: `OpenAI-compatible`
- Base URL: `https://callflow.top/v1`
- Model: `gpt-5.4-mini`

点击 `Test connection`。

Expected:
- 显示 `Connected`
- 不需要单独选择 `Responses API`

**Step 2: 使用普通 OpenAI-compatible model 验证仍走 chat**

使用一个已知支持 `/chat/completions` 的模型或代理，验证普通模型仍能成功连接。

**Step 3: 验证 Claude / Gemini UI 不显示 Responses 文案**

切换 provider rail 到 Claude 和 Gemini：
- 不应看到 `Responses API`
- 不应看到单独的 responses 入口
- provider rail 卡片不再显示突兀的 `Edit configuration`

**Step 4: 记录结果（无需改代码）**

把手工验证结果整理在最终汇报中即可。

---

### Task 5: 如有需要，再补一条回退策略回归测试

**Files:**
- Modify: `tests/providers/openai-compatible-provider.test.ts`

如果在 Task 2 实现后发现 `invalid_request_error` 的回退条件过宽，容易误把真实 4xx 当成 endpoint mismatch，可追加一个更严格的测试，用于锁定策略：

```typescript
it("does not fall back when invalid_request_error clearly indicates a real client error", async () => {
  const fetchMock = vi.fn(async () => makeJsonResponse({}, 400))

  const provider = new OpenAiCompatibleProvider({
    apiKey: "test-key",
    baseUrl: "https://callflow.top/v1",
    model: "custom-model",
    fetchImpl: fetchMock as any
  })

  await expect(provider.analyze(defaultInput)).rejects.toMatchObject({
    code: "invalid_request_error"
  })

  expect(fetchMock).toHaveBeenCalledTimes(1)
})
```

只有在实现时发现回退边界不够清晰时才加这个任务；否则跳过，保持 YAGNI。
