# SSE Support for OpenAI-Compatible Provider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `OpenAiCompatibleProvider` 中检测 SSE 流式响应并自动解析，兼容总是返回 `text/event-stream` 的第三方 API（如 callflow.top）。

**Architecture:** 在成功响应后，检查 `Content-Type` header 是否包含 `text/event-stream`。若是，读取响应文本，按 `data:` 行分割，将每个 chunk 的 `choices[0].delta.content` 拼接成完整文本；否则走原有 `response.json()` 路径。两条路径最终都交给同一个 `parseAnalyzeResult` 处理。

**Tech Stack:** TypeScript, Vitest

---

### Task 1: 扩展 FetchLike 类型以支持读取 header 和 text()

**Files:**
- Modify: `src/lib/providers/openai-compatible-provider.ts`

目前 `FetchLike` 返回类型只有 `ok`、`status`、`json()`，需要增加 `headers` 和 `text()` 以便检测 SSE。

**Step 1: 写一个失败的测试，验证 SSE 响应被正确解析**

在 `tests/providers/openai-compatible-provider.test.ts` 末尾，追加：

```typescript
it("parses summary and tags from an SSE streaming response", async () => {
  const sseBody = [
    'data: {"id":"1","object":"chat.completion.chunk","choices":[{"delta":{"content":\'{"summary":"SSE summary","tags":["sse","stream"]}\'}}]}',
    "",
    "data: [DONE]",
    ""
  ].join("\n")

  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === "content-type" ? "text/event-stream" : null) },
    text: async () => sseBody,
    json: async () => { throw new Error("should not call json()") }
  }))

  const provider = new OpenAiCompatibleProvider({
    apiKey: "test-key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    fetchImpl: fetchMock as any
  })

  const result = await provider.analyze({
    title: "Example",
    url: "https://example.com",
    content: "Example content"
  })

  expect(result.summary).toBe("SSE summary")
  expect(result.tags).toEqual(["sse", "stream"])
})
```

**Step 2: 运行测试，确认失败**

```bash
npx vitest run tests/providers/openai-compatible-provider.test.ts
```

预期：FAIL，`TypeError: response.headers is undefined` 或 `response.text is not a function`

**Step 3: 扩展 FetchLike 返回类型**

在 `src/lib/providers/openai-compatible-provider.ts` 中，将：

```typescript
type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
}>
```

替换为：

```typescript
type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<{
  ok: boolean
  status: number
  headers: { get(name: string): string | null }
  text(): Promise<string>
  json(): Promise<unknown>
}>
```

**Step 4: 运行测试，确认仍然失败（但错误变化）**

```bash
npx vitest run tests/providers/openai-compatible-provider.test.ts
```

预期：FAIL，因为实现还没处理 SSE 分支

---

### Task 2: 实现 SSE 解析函数

**Files:**
- Modify: `src/lib/providers/openai-compatible-provider.ts`

**Step 1: 添加 `parseSseText` 函数**

在 `openai-compatible-provider.ts` 文件末尾（`getErrorMessage` 函数之后）添加：

```typescript
type SseChunk = {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
}

function parseSseText(text: string): string {
  const lines = text.split("\n")
  let content = ""

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("data:")) continue
    const payload = trimmed.slice("data:".length).trim()
    if (payload === "[DONE]") continue

    let chunk: SseChunk
    try {
      chunk = JSON.parse(payload) as SseChunk
    } catch {
      continue
    }

    const delta = chunk.choices?.[0]?.delta?.content
    if (delta) {
      content += delta
    }
  }

  if (!content) {
    throw normalizeProviderError(new Error("SSE stream contained no content"), {
      code: "bad_model_output",
      message: "OpenAI-compatible returned no text output"
    })
  }

  return content
}
```

**Step 2: 在 `analyze` 方法中检测 SSE 并分派**

将 `analyze` 方法中读取响应体的部分，从：

```typescript
    let data: OpenAiCompatibleResponse
    try {
      data = (await response.json()) as OpenAiCompatibleResponse
    } catch (jsonError) {
      throw normalizeProviderError(jsonError, {
        code: "invalid_response",
        message: "OpenAI-compatible returned invalid JSON (possible CORS or network error)"
      })
    }
    const text = extractTextContent(data)

    return parseAnalyzeResult(text)
```

替换为：

```typescript
    const contentType = response.headers.get("content-type") ?? ""
    let text: string

    if (contentType.includes("text/event-stream")) {
      let rawText: string
      try {
        rawText = await response.text()
      } catch (textError) {
        throw normalizeProviderError(textError, {
          code: "invalid_response",
          message: "OpenAI-compatible returned invalid SSE stream"
        })
      }
      text = parseSseText(rawText)
    } else {
      let data: OpenAiCompatibleResponse
      try {
        data = (await response.json()) as OpenAiCompatibleResponse
      } catch (jsonError) {
        throw normalizeProviderError(jsonError, {
          code: "invalid_response",
          message: "OpenAI-compatible returned invalid JSON (possible CORS or network error)"
        })
      }
      text = extractTextContent(data)
    }

    return parseAnalyzeResult(text)
```

**Step 3: 运行所有 provider 测试**

```bash
npx vitest run tests/providers/openai-compatible-provider.test.ts
```

预期：所有测试 PASS

**Step 4: 运行全套测试，确认无回归**

```bash
npx vitest run
```

预期：全部 PASS

**Step 5: Commit**

```bash
git add src/lib/providers/openai-compatible-provider.ts tests/providers/openai-compatible-provider.test.ts
git commit -m "feat(providers): add SSE streaming response support to OpenAI-compatible provider"
```

---

### Task 3: 修复现有测试中 fetchMock 缺少 headers 和 text 字段的问题

**Files:**
- Modify: `tests/providers/openai-compatible-provider.test.ts`

扩展 `FetchLike` 类型后，现有测试的 `fetchMock` 返回值不再满足类型要求（缺少 `headers` 和 `text()`）。需要为每个 mock 补全这两个字段。

**Step 1: 提取公共 mock helper**

在测试文件顶部（`describe` 块外）添加：

```typescript
function makeJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (_name: string) => "application/json" },
    text: async () => JSON.stringify(body),
    json: async () => body
  }
}
```

**Step 2: 更新所有现有 fetchMock 使用 `makeJsonResponse`**

将所有形如：
```typescript
vi.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [...] })
}))
```

替换为：
```typescript
vi.fn(async () => makeJsonResponse({ choices: [...] }))
```

将所有 HTTP 错误 mock 形如：
```typescript
vi.fn(async () => ({
  ok: false,
  status,
  json: async () => ({})
}))
```

替换为：
```typescript
vi.fn(async () => makeJsonResponse({}, status))
```

**Step 3: 运行测试确认全部通过**

```bash
npx vitest run tests/providers/openai-compatible-provider.test.ts
```

预期：全部 PASS

**Step 4: Commit**

```bash
git add tests/providers/openai-compatible-provider.test.ts
git commit -m "test(providers): update fetchMock to include headers and text() for FetchLike compliance"
```

---

### Task 4: 增加 SSE 边界情况测试

**Files:**
- Modify: `tests/providers/openai-compatible-provider.test.ts`

**Step 1: 添加空内容的 SSE 测试**

```typescript
it("throws bad_model_output when SSE stream has no content", async () => {
  const sseBody = "data: [DONE]\n"

  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === "content-type" ? "text/event-stream" : null) },
    text: async () => sseBody,
    json: async () => { throw new Error("should not call json()") }
  }))

  const provider = new OpenAiCompatibleProvider({
    apiKey: "test-key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    fetchImpl: fetchMock as any
  })

  await expect(
    provider.analyze({ title: "Example", url: "https://example.com", content: "Example content" })
  ).rejects.toMatchObject({
    name: "ProviderError",
    code: "bad_model_output",
    message: "OpenAI-compatible returned no text output"
  })
})
```

**Step 2: 添加多 chunk 拼接的 SSE 测试**

```typescript
it("concatenates multiple SSE chunks into a single result", async () => {
  const sseBody = [
    'data: {"choices":[{"delta":{"content":"{\\"summary\\":"}}]}',
    'data: {"choices":[{"delta":{"content":"\\"hello\\","}}]}',
    'data: {"choices":[{"delta":{"content":"\\"tags\\":[\\"a\\"]}"}}]}',
    "data: [DONE]",
    ""
  ].join("\n")

  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === "content-type" ? "text/event-stream" : null) },
    text: async () => sseBody,
    json: async () => { throw new Error("should not call json()") }
  }))

  const provider = new OpenAiCompatibleProvider({
    apiKey: "test-key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    fetchImpl: fetchMock as any
  })

  const result = await provider.analyze({
    title: "Example",
    url: "https://example.com",
    content: "Example content"
  })

  expect(result.summary).toBe("hello")
  expect(result.tags).toEqual(["a"])
})
```

**Step 3: 运行全套测试**

```bash
npx vitest run
```

预期：全部 PASS

**Step 4: Commit**

```bash
git add tests/providers/openai-compatible-provider.test.ts
git commit -m "test(providers): add SSE edge case tests for streaming response parsing"
```
