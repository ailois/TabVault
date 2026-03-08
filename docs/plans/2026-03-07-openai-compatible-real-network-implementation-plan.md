# OpenAI-Compatible Real Network Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the stubbed OpenAI-compatible provider with a real `chat/completions` network implementation while preserving the existing provider abstraction and analysis flow.

**Architecture:** Keep `OpenAiCompatibleProvider` behind the existing `AiProvider` contract. Use a minimal OpenAI-compatible request shape, parse model output through the existing `parseAnalyzeResult(...)` helper, and normalize transport/HTTP failures through `normalizeProviderError(...)` so popup and bookmark analysis code remain unchanged.

**Tech Stack:** TypeScript, Fetch API, AbortController, Vitest

---

### Task 1: Add success-path test coverage for a real OpenAI-compatible response

**Files:**
- Create: `tests/providers/openai-compatible-provider.test.ts`

**Step 1: Write the failing test**

`tests/providers/openai-compatible-provider.test.ts`
```ts
import { describe, expect, it, vi } from "vitest"
import { OpenAiCompatibleProvider } from "../../src/lib/providers/openai-compatible-provider"

describe("OpenAiCompatibleProvider", () => {
  it("parses summary and tags from a chat completions response", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"summary":"Short","tags":["one","two"]}'
            }
          }
        ]
      })
    }))

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      fetchImpl: fetchMock
    })

    const result = await provider.analyze({
      title: "Example",
      url: "https://example.com",
      content: "Example content"
    })

    expect(result.summary).toBe("Short")
    expect(result.tags).toEqual(["one", "two"])
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: FAIL because the provider is still a stub and/or does not support injected fetch-based request handling.

**Step 3: Write minimal implementation**

Do not fully finish the provider yet. Add only the minimum type support needed so the test can drive the real implementation in the next tasks.

**Step 4: Run test again**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: Still FAIL until the real request path is implemented in the next task.

**Step 5: Commit**

```bash
git add tests/providers/openai-compatible-provider.test.ts
git commit -m "test: add OpenAI-compatible provider response coverage"
```

### Task 2: Implement the real OpenAI-compatible request/response path

**Files:**
- Modify: `src/lib/providers/openai-compatible-provider.ts`
- Test: `tests/providers/openai-compatible-provider.test.ts`

**Step 1: Expand the failing test if needed**

Ensure the test also verifies the request goes to:
- `${baseUrl}/chat/completions`
- `Authorization: Bearer <apiKey>`

If needed, add a second test for base URL normalization.

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: FAIL because the provider still returns local fake output.

**Step 3: Write minimal implementation**

Update `src/lib/providers/openai-compatible-provider.ts` to:
- accept injected `fetchImpl`
- normalize `baseUrl`
- call `POST {baseUrl}/chat/completions`
- send a minimal OpenAI-compatible request body
- parse `choices[0].message.content`
- return parsed output through `parseAnalyzeResult`

Keep the prompt simple and consistent with other providers.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/providers/openai-compatible-provider.ts tests/providers/openai-compatible-provider.test.ts
git commit -m "feat: add real OpenAI-compatible completion requests"
```

### Task 3: Add HTTP error normalization coverage

**Files:**
- Modify: `tests/providers/openai-compatible-provider.test.ts`
- Modify: `src/lib/providers/openai-compatible-provider.ts`

**Step 1: Write the failing tests**

Add tests for:
- `401` / `403` -> `auth_error`
- `429` -> `rate_limit_error`
- `500` -> `server_error`
- other `4xx` -> `invalid_request_error`

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: FAIL because HTTP status mapping is incomplete or absent.

**Step 3: Write minimal implementation**

Add a small status-to-error mapping in `openai-compatible-provider.ts` and normalize non-OK responses through `normalizeProviderError(...)`.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/providers/openai-compatible-provider.ts tests/providers/openai-compatible-provider.test.ts
git commit -m "feat: normalize OpenAI-compatible HTTP failures"
```

### Task 4: Add timeout and network failure handling

**Files:**
- Modify: `src/lib/providers/openai-compatible-provider.ts`
- Modify: `tests/providers/openai-compatible-provider.test.ts`

**Step 1: Write the failing tests**

Add tests for:
- fetch rejection -> `network_error`
- aborted/timeout request -> `network_error`

If timeout testing is easier with injection, allow the provider constructor to accept a timeout override for tests.

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: FAIL because timeout/abort behavior is not implemented yet.

**Step 3: Write minimal implementation**

Use:
- `AbortController`
- `setTimeout`
- `clearTimeout` in `finally`

Normalize timeout/abort failures as `network_error`.

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/providers/openai-compatible-provider.ts tests/providers/openai-compatible-provider.test.ts
git commit -m "feat: add OpenAI-compatible timeout handling"
```

### Task 5: Add bad-model-output handling coverage

**Files:**
- Modify: `tests/providers/openai-compatible-provider.test.ts`
- Modify: `src/lib/providers/openai-compatible-provider.ts`

**Step 1: Write the failing test**

Add coverage for:
- missing `choices[0].message.content`
- non-JSON model text

Expected error code:
- `bad_model_output`

**Step 2: Run test to verify it fails**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: FAIL because missing/invalid content is not fully normalized yet.

**Step 3: Write minimal implementation**

Ensure:
- missing content becomes `bad_model_output`
- invalid JSON output is left to `parseAnalyzeResult(...)` and remains normalized

**Step 4: Run test to verify it passes**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/providers/openai-compatible-provider.ts tests/providers/openai-compatible-provider.test.ts
git commit -m "feat: handle invalid OpenAI-compatible model output"
```

### Task 6: Run full verification and update README

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Document that OpenAI-compatible now performs real network requests, while Claude and Gemini remain on their current implementation path if that is still true when this work lands.

Keep the wording precise—do not claim all three are production-complete if only OpenAI-compatible was upgraded in this phase.

**Step 2: Run provider tests**

Run:
```bash
npm exec vitest run tests/providers/openai-compatible-provider.test.ts
```

Expected: PASS.

**Step 3: Run full test suite**

Run:
```bash
npm exec vitest run
```

Expected: PASS.

**Step 4: Run typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

**Step 5: Run build**

Run:
```bash
npm run build
```

Expected: PASS.

**Step 6: Commit**

```bash
git add README.md
git commit -m "docs: describe real OpenAI-compatible request support"
```
