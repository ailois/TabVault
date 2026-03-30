# Side Panel Hybrid Retrieval Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个以 Side Panel 为主入口的本地优先混合检索闭环，让用户在单输入框中同时检索当前页面与已保存书签，并在统一结果流中完成搜索、动作选择与引用式回答。

**Architecture:** 保留现有 `BookmarkRecord` 与 IndexedDB 书签存储作为事实来源，在 feature/service 层新增一套本地 hybrid retrieval 流程：将已保存书签派生成 searchable documents，将当前页面组装为 ephemeral document，再通过统一排序与命中原因生成器合并结果。`src/sidepanel.tsx` 从“书签树 + 搜索列表”页面收敛为“上下文条 + 结果流 + 统一输入框”的编排层，问答能力先做本地检索驱动的引用式解释，不强依赖外部模型。

**Tech Stack:** TypeScript, React, Vitest, IndexedDB, Chrome Extension APIs

---

### Task 1: 为 hybrid retrieval 建立纯逻辑模型与意图判断

**Files:**
- Create: `src/features/hybrid-retrieval/query-intent.ts`
- Create: `src/features/hybrid-retrieval/query-normalization.ts`
- Create: `src/features/hybrid-retrieval/hybrid-types.ts`
- Test: `tests/hybrid-retrieval/query-intent.test.ts`
- Test: `tests/hybrid-retrieval/query-normalization.test.ts`

**Step 1: Write the failing test**

在 `tests/hybrid-retrieval/query-intent.test.ts` 中先定义最小意图规则：

```ts
import { describe, expect, it } from "vitest"
import { detectQueryIntent } from "../../src/features/hybrid-retrieval/query-intent"

describe("detectQueryIntent", () => {
  it("returns retrieve for short keyword queries", () => {
    expect(detectQueryIntent("react compiler memoization")).toBe("retrieve")
  })

  it("returns answer for natural-language questions", () => {
    expect(detectQueryIntent("这篇文章对 useMemo 的结论是什么？")).toBe("answer")
  })

  it("returns mixed for ambiguous descriptive prompts", () => {
    expect(detectQueryIntent("compare current page with my saved react notes")).toBe("mixed")
  })
})
```

在 `tests/hybrid-retrieval/query-normalization.test.ts` 中定义规范化行为：

```ts
import { describe, expect, it } from "vitest"
import { normalizeQuery, tokenizeQuery } from "../../src/features/hybrid-retrieval/query-normalization"

describe("normalizeQuery", () => {
  it("trims and lowercases the query", () => {
    expect(normalizeQuery("  React Compiler  ")).toBe("react compiler")
  })
})

describe("tokenizeQuery", () => {
  it("splits normalized query into non-empty tokens", () => {
    expect(tokenizeQuery("react compiler memoization")).toEqual(["react", "compiler", "memoization"])
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/hybrid-retrieval/query-intent.test.ts tests/hybrid-retrieval/query-normalization.test.ts
```

Expected: FAIL，模块尚不存在。

**Step 3: Write minimal implementation**

在 `src/features/hybrid-retrieval/hybrid-types.ts` 中定义基础类型：

```ts
export type QueryIntent = "retrieve" | "answer" | "mixed"
```

在 `src/features/hybrid-retrieval/query-normalization.ts` 中实现：

```ts
export function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase()
}

export function tokenizeQuery(query: string): string[] {
  return normalizeQuery(query).split(/\s+/).filter(Boolean)
}
```

在 `src/features/hybrid-retrieval/query-intent.ts` 中实现最小规则：

```ts
import type { QueryIntent } from "./hybrid-types"
import { normalizeQuery } from "./query-normalization"

const QUESTION_MARKERS = ["?", "？", "什么", "为什么", "how", "what", "why"]
const MIXED_MARKERS = ["compare", "对比", "结合", "across", "with my saved"]

export function detectQueryIntent(query: string): QueryIntent {
  const normalized = normalizeQuery(query)

  if (!normalized) {
    return "retrieve"
  }

  if (MIXED_MARKERS.some((marker) => normalized.includes(marker))) {
    return "mixed"
  }

  if (QUESTION_MARKERS.some((marker) => normalized.includes(marker))) {
    return "answer"
  }

  return "retrieve"
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/hybrid-retrieval/query-intent.test.ts tests/hybrid-retrieval/query-normalization.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/hybrid-retrieval/query-intent.ts src/features/hybrid-retrieval/query-normalization.ts src/features/hybrid-retrieval/hybrid-types.ts tests/hybrid-retrieval/query-intent.test.ts tests/hybrid-retrieval/query-normalization.test.ts
git commit -m "feat(sidepanel): add hybrid query intent primitives"
```

---

### Task 2: 建立 searchable document 与当前页 ephemeral document 适配层

**Files:**
- Create: `src/features/hybrid-retrieval/search-documents.ts`
- Create: `src/features/hybrid-retrieval/current-page-context.ts`
- Modify: `src/types/bookmark.ts`
- Test: `tests/hybrid-retrieval/search-documents.test.ts`
- Test: `tests/hybrid-retrieval/current-page-context.test.ts`

**Step 1: Write the failing test**

在 `tests/hybrid-retrieval/search-documents.test.ts` 中定义书签到 searchable document 的派生：

```ts
import { describe, expect, it } from "vitest"
import { buildBookmarkSearchDocument } from "../../src/features/hybrid-retrieval/search-documents"
import type { BookmarkRecord } from "../../src/types/bookmark"

const bookmark: BookmarkRecord = {
  id: "bm-1",
  title: "React Compiler Deep Dive",
  url: "https://react.dev/compiler",
  summary: "Compiler removes manual memoization burden",
  extractedText: "React Compiler can optimize components automatically",
  aiTags: ["react", "compiler"],
  userTags: ["memoization"],
  status: "done",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z"
}

describe("buildBookmarkSearchDocument", () => {
  it("builds weighted text fields from a bookmark", () => {
    const doc = buildBookmarkSearchDocument(bookmark)

    expect(doc.sourceType).toBe("saved-bookmark")
    expect(doc.bookmarkId).toBe("bm-1")
    expect(doc.tagsText).toContain("react")
    expect(doc.bodyText).toContain("optimize components")
    expect(doc.combinedText).toContain("Compiler removes manual memoization burden")
  })
})
```

在 `tests/hybrid-retrieval/current-page-context.test.ts` 中定义当前页临时文档：

```ts
import { describe, expect, it } from "vitest"
import { buildCurrentPageDocument } from "../../src/features/hybrid-retrieval/current-page-context"

describe("buildCurrentPageDocument", () => {
  it("returns null when page text is empty", () => {
    expect(buildCurrentPageDocument({ title: "Example", url: "https://example.com", extractedText: "" })).toBeNull()
  })

  it("builds an ephemeral current-page document", () => {
    const doc = buildCurrentPageDocument({
      title: "Current React Article",
      url: "https://example.com/react",
      extractedText: "React 19 compiler removes useMemo boilerplate"
    })

    expect(doc?.sourceType).toBe("current-page")
    expect(doc?.title).toBe("Current React Article")
    expect(doc?.bodyText).toContain("useMemo")
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/hybrid-retrieval/search-documents.test.ts tests/hybrid-retrieval/current-page-context.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

在 `src/types/bookmark.ts` 中保持现有字段不变，不新增破坏性字段。

在 `src/features/hybrid-retrieval/search-documents.ts` 中定义：

```ts
import type { BookmarkRecord } from "../../types/bookmark"

export type SearchDocument = {
  sourceType: "saved-bookmark" | "current-page"
  bookmarkId?: string
  title: string
  url: string
  summary?: string
  tagsText: string
  bodyText: string
  combinedText: string
  updatedAt: string
}

export function buildBookmarkSearchDocument(bookmark: BookmarkRecord): SearchDocument {
  const tagsText = [...bookmark.aiTags, ...bookmark.userTags].join(" ")
  const bodyText = bookmark.extractedText ?? ""
  const combinedText = [bookmark.title, bookmark.url, bookmark.summary ?? "", tagsText, bodyText]
    .filter(Boolean)
    .join(" ")

  return {
    sourceType: "saved-bookmark",
    bookmarkId: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    summary: bookmark.summary,
    tagsText,
    bodyText,
    combinedText,
    updatedAt: bookmark.updatedAt
  }
}
```

在 `src/features/hybrid-retrieval/current-page-context.ts` 中定义：

```ts
import { normalizeQuery } from "./query-normalization"
import type { SearchDocument } from "./search-documents"

export function buildCurrentPageDocument(input: {
  title?: string | null
  url?: string | null
  extractedText?: string | null
}): SearchDocument | null {
  const title = input.title?.trim()
  const url = input.url?.trim()
  const bodyText = input.extractedText?.trim()

  if (!title || !url || !bodyText) {
    return null
  }

  return {
    sourceType: "current-page",
    title,
    url,
    summary: undefined,
    tagsText: "",
    bodyText,
    combinedText: normalizeQuery(`${title} ${url} ${bodyText}`),
    updatedAt: new Date().toISOString()
  }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/hybrid-retrieval/search-documents.test.ts tests/hybrid-retrieval/current-page-context.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/hybrid-retrieval/search-documents.ts src/features/hybrid-retrieval/current-page-context.ts src/types/bookmark.ts tests/hybrid-retrieval/search-documents.test.ts tests/hybrid-retrieval/current-page-context.test.ts
git commit -m "feat(sidepanel): add local search document adapters"
```

---

### Task 3: 实现本地加权检索与命中原因生成

**Files:**
- Create: `src/features/hybrid-retrieval/rank-hybrid-results.ts`
- Modify: `src/features/bookmarks/search-bookmarks.ts`
- Test: `tests/hybrid-retrieval/rank-hybrid-results.test.ts`
- Modify: `tests/bookmarks/search-bookmarks.test.ts`
- Modify: `tests/bookmarks/search-bookmarks-with-reasons.test.ts`

**Step 1: Write the failing test**

在 `tests/hybrid-retrieval/rank-hybrid-results.test.ts` 中定义最小排序规则：

```ts
import { describe, expect, it } from "vitest"
import { rankHybridResults } from "../../src/features/hybrid-retrieval/rank-hybrid-results"
import type { SearchDocument } from "../../src/features/hybrid-retrieval/search-documents"

const docs: SearchDocument[] = [
  {
    sourceType: "saved-bookmark",
    bookmarkId: "bm-title",
    title: "React Compiler Notes",
    url: "https://example.com/notes",
    summary: "",
    tagsText: "frontend",
    bodyText: "",
    combinedText: "react compiler notes frontend",
    updatedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    sourceType: "saved-bookmark",
    bookmarkId: "bm-body",
    title: "Some page",
    url: "https://example.com/body",
    summary: "",
    tagsText: "",
    bodyText: "compiler details in body text",
    combinedText: "some page compiler details in body text",
    updatedAt: "2026-03-01T00:00:00.000Z"
  }
]

describe("rankHybridResults", () => {
  it("prefers title matches over body matches", () => {
    const results = rankHybridResults(docs, "react compiler")
    expect(results[0].document.bookmarkId).toBe("bm-title")
    expect(results[0].matchReason).toBe("title")
  })
})
```

同时修改 `tests/bookmarks/search-bookmarks.test.ts`，新增对 `extractedText` 的召回测试：

```ts
it("returns bookmarks matching extractedText", () => {
  const bookmark = createBookmark({ extractedText: "Rust async cancellation details" })
  expect(searchBookmarks([bookmark], "cancellation")).toEqual([bookmark])
})
```

修改 `tests/bookmarks/search-bookmarks-with-reasons.test.ts`，新增正文命中原因：

```ts
it("matches extracted text and returns reason containing 'extracted text'", () => {
  const bookmark = makeBookmark({ extractedText: "Rust cancellation explained" })
  const results = searchBookmarksWithReasons([bookmark], "cancellation")

  expect(results).toHaveLength(1)
  expect(results[0].matchReason).toContain("extracted text")
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/hybrid-retrieval/rank-hybrid-results.test.ts tests/bookmarks/search-bookmarks.test.ts tests/bookmarks/search-bookmarks-with-reasons.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

在 `src/features/hybrid-retrieval/rank-hybrid-results.ts` 中实现加权排序：

```ts
import { normalizeQuery, tokenizeQuery } from "./query-normalization"
import type { SearchDocument } from "./search-documents"

export type RankedHybridResult = {
  document: SearchDocument
  score: number
  matchReason: "current page" | "title" | "tag" | "AI summary" | "extracted text" | "URL"
}

export function rankHybridResults(documents: SearchDocument[], query: string): RankedHybridResult[] {
  const normalized = normalizeQuery(query)
  if (!normalized) return []

  const tokens = tokenizeQuery(query)

  return documents
    .map((document) => {
      const titleHit = tokens.some((token) => document.title.toLocaleLowerCase().includes(token))
      const tagHit = tokens.some((token) => document.tagsText.toLocaleLowerCase().includes(token))
      const summaryHit = tokens.some((token) => (document.summary ?? "").toLocaleLowerCase().includes(token))
      const bodyHit = tokens.some((token) => document.bodyText.toLocaleLowerCase().includes(token))
      const urlHit = tokens.some((token) => document.url.toLocaleLowerCase().includes(token))

      if (!(titleHit || tagHit || summaryHit || bodyHit || urlHit)) {
        return null
      }

      let score = 0
      let matchReason: RankedHybridResult["matchReason"] = "URL"

      if (document.sourceType === "current-page" && (titleHit || bodyHit)) {
        score += 120
        matchReason = "current page"
      }
      if (titleHit) {
        score += 100
        matchReason = document.sourceType === "current-page" ? "current page" : "title"
      } else if (tagHit) {
        score += 80
        matchReason = "tag"
      } else if (summaryHit) {
        score += 60
        matchReason = "AI summary"
      } else if (bodyHit) {
        score += 40
        matchReason = document.sourceType === "current-page" ? "current page" : "extracted text"
      } else if (urlHit) {
        score += 20
        matchReason = "URL"
      }

      return { document, score, matchReason }
    })
    .filter((result): result is RankedHybridResult => result !== null)
    .sort((left, right) => right.score - left.score)
}
```

在 `src/features/bookmarks/search-bookmarks.ts` 中最小改动：
- `createSearchText()` 默认模式加入 `bookmark.extractedText`
- `searchBookmarksWithReasons()` 在 URL 之前新增 `bookmark.extractedText` 判断并返回 `extracted text`

目标片段：

```ts
return [bookmark.title, bookmark.url, bookmark.summary, allTags, bookmark.extractedText]
  .filter((v): v is string => Boolean(v))
  .join(" ")
  .toLocaleLowerCase()
```

```ts
} else if (bookmark.extractedText?.toLowerCase().includes(q)) {
  results.push({ bookmark, matchReason: "extracted text" })
} else if (bookmark.url.toLowerCase().includes(q)) {
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/hybrid-retrieval/rank-hybrid-results.test.ts tests/bookmarks/search-bookmarks.test.ts tests/bookmarks/search-bookmarks-with-reasons.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/hybrid-retrieval/rank-hybrid-results.ts src/features/bookmarks/search-bookmarks.ts tests/hybrid-retrieval/rank-hybrid-results.test.ts tests/bookmarks/search-bookmarks.test.ts tests/bookmarks/search-bookmarks-with-reasons.test.ts
git commit -m "feat(search): add local weighted hybrid ranking"
```

---

### Task 4: 编排当前页 + 已保存书签统一召回服务

**Files:**
- Create: `src/features/hybrid-retrieval/retrieve-hybrid-results.ts`
- Modify: `src/lib/storage/bookmark-repository.ts`
- Test: `tests/hybrid-retrieval/retrieve-hybrid-results.test.ts`
- Modify: `tests/storage/bookmark-repository.test.ts`

**Step 1: Write the failing test**

在 `tests/hybrid-retrieval/retrieve-hybrid-results.test.ts` 中定义统一召回行为：

```ts
import { describe, expect, it, vi } from "vitest"
import { retrieveHybridResults } from "../../src/features/hybrid-retrieval/retrieve-hybrid-results"

const bookmarks = [
  {
    id: "bm-1",
    title: "React Compiler Notes",
    url: "https://example.com/react",
    summary: "About compiler",
    extractedText: "compiler removes memoization burden",
    aiTags: ["react"],
    userTags: [],
    status: "done",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z"
  }
]

describe("retrieveHybridResults", () => {
  it("returns current page and saved bookmarks in one ranked list", async () => {
    const listBookmarks = vi.fn(async () => bookmarks)

    const results = await retrieveHybridResults({
      query: "react compiler",
      currentPage: {
        title: "Current React Page",
        url: "https://example.com/current",
        extractedText: "react compiler and memoization"
      },
      listBookmarks
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.some((result) => result.document.sourceType === "current-page")).toBe(true)
    expect(results.some((result) => result.document.sourceType === "saved-bookmark")).toBe(true)
  })
})
```

在 `tests/storage/bookmark-repository.test.ts` 中新增一个不需要接口变更的回归断言，确保 `list()` 仍按 `createdAt` 倒序返回。

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/hybrid-retrieval/retrieve-hybrid-results.test.ts tests/storage/bookmark-repository.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

在 `src/lib/storage/bookmark-repository.ts` 中不增加新接口，保持 `list()` 为统一事实来源。

在 `src/features/hybrid-retrieval/retrieve-hybrid-results.ts` 中实现：

```ts
import type { BookmarkRecord } from "../../types/bookmark"
import { buildCurrentPageDocument } from "./current-page-context"
import { rankHybridResults } from "./rank-hybrid-results"
import { buildBookmarkSearchDocument } from "./search-documents"

export async function retrieveHybridResults(input: {
  query: string
  currentPage: {
    title?: string | null
    url?: string | null
    extractedText?: string | null
  }
  listBookmarks: () => Promise<BookmarkRecord[]>
}) {
  const bookmarks = await input.listBookmarks()
  const savedDocuments = bookmarks.map(buildBookmarkSearchDocument)
  const currentPageDocument = buildCurrentPageDocument(input.currentPage)
  const allDocuments = currentPageDocument ? [currentPageDocument, ...savedDocuments] : savedDocuments

  return rankHybridResults(allDocuments, input.query)
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/hybrid-retrieval/retrieve-hybrid-results.test.ts tests/storage/bookmark-repository.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/hybrid-retrieval/retrieve-hybrid-results.ts src/lib/storage/bookmark-repository.ts tests/hybrid-retrieval/retrieve-hybrid-results.test.ts tests/storage/bookmark-repository.test.ts
git commit -m "feat(search): unify current page and saved bookmark retrieval"
```

---

### Task 5: 构建引用式回答块与动作卡模型

**Files:**
- Create: `src/features/hybrid-retrieval/build-answer-block.ts`
- Create: `src/features/hybrid-retrieval/build-action-cards.ts`
- Test: `tests/hybrid-retrieval/build-answer-block.test.ts`
- Test: `tests/hybrid-retrieval/build-action-cards.test.ts`

**Step 1: Write the failing test**

在 `tests/hybrid-retrieval/build-action-cards.test.ts` 中定义动作卡：

```ts
import { describe, expect, it } from "vitest"
import { buildActionCards } from "../../src/features/hybrid-retrieval/build-action-cards"

describe("buildActionCards", () => {
  it("offers ask-current-page and ask-top-matches actions when both sources are present", () => {
    const actions = buildActionCards({ hasCurrentPage: true, hasSavedMatches: true })

    expect(actions.map((action) => action.id)).toEqual([
      "ask-current-page",
      "ask-top-matches",
      "open-dashboard"
    ])
  })
})
```

在 `tests/hybrid-retrieval/build-answer-block.test.ts` 中定义引用式回答：

```ts
import { describe, expect, it } from "vitest"
import { buildAnswerBlock } from "../../src/features/hybrid-retrieval/build-answer-block"

describe("buildAnswerBlock", () => {
  it("creates an answer with citations from ranked results", () => {
    const answer = buildAnswerBlock({
      query: "这篇文章对 useMemo 的结论是什么？",
      rankedResults: [
        {
          score: 120,
          matchReason: "current page",
          document: {
            sourceType: "current-page",
            title: "Current React Page",
            url: "https://example.com/current",
            summary: undefined,
            tagsText: "",
            bodyText: "React Compiler removes useMemo boilerplate.",
            combinedText: "",
            updatedAt: "2026-03-01T00:00:00.000Z"
          }
        }
      ]
    })

    expect(answer.text).toContain("Current React Page")
    expect(answer.citations).toHaveLength(1)
    expect(answer.citations[0].sourceType).toBe("current-page")
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/hybrid-retrieval/build-answer-block.test.ts tests/hybrid-retrieval/build-action-cards.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

在 `src/features/hybrid-retrieval/build-action-cards.ts` 中实现：

```ts
export type ActionCard = {
  id: "ask-current-page" | "ask-top-matches" | "open-dashboard"
  label: string
}

export function buildActionCards(input: { hasCurrentPage: boolean; hasSavedMatches: boolean }): ActionCard[] {
  const actions: ActionCard[] = []

  if (input.hasCurrentPage) {
    actions.push({ id: "ask-current-page", label: "Ask current page" })
  }

  if (input.hasSavedMatches) {
    actions.push({ id: "ask-top-matches", label: "Ask top matches" })
  }

  actions.push({ id: "open-dashboard", label: "Open in dashboard" })
  return actions
}
```

在 `src/features/hybrid-retrieval/build-answer-block.ts` 中实现本地解释式回答：

```ts
import type { RankedHybridResult } from "./rank-hybrid-results"

export type AnswerCitation = {
  sourceType: "current-page" | "saved-bookmark"
  title: string
  url: string
  matchReason: string
}

export type AnswerBlock = {
  text: string
  citations: AnswerCitation[]
}

export function buildAnswerBlock(input: {
  query: string
  rankedResults: RankedHybridResult[]
}): AnswerBlock {
  const citations = input.rankedResults.slice(0, 3).map((result) => ({
    sourceType: result.document.sourceType,
    title: result.document.title,
    url: result.document.url,
    matchReason: result.matchReason
  }))

  const text = citations.length > 0
    ? `Based on ${citations.map((citation) => citation.title).join(", ")}, here are the most relevant local results for: ${input.query}`
    : `No local results found for: ${input.query}`

  return { text, citations }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/hybrid-retrieval/build-answer-block.test.ts tests/hybrid-retrieval/build-action-cards.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/hybrid-retrieval/build-answer-block.ts src/features/hybrid-retrieval/build-action-cards.ts tests/hybrid-retrieval/build-answer-block.test.ts tests/hybrid-retrieval/build-action-cards.test.ts
git commit -m "feat(sidepanel): add local answer and action card builders"
```

---

### Task 6: 重构 Side Panel 状态，接入 hybrid retrieval 结果流

**Files:**
- Modify: `src/sidepanel.tsx`
- Create: `src/components/hybrid-query-stream.tsx`
- Create: `src/components/hybrid-context-bar.tsx`
- Test: `tests/ui/sidepanel.test.tsx`

**Step 1: Write the failing test**

在 `tests/ui/sidepanel.test.tsx` 中新增 3 个场景：

1. 输入关键词后展示统一结果流，而不是旧的紧凑列表
2. 当前页存在时展示上下文条
3. 输入问句后展示 answer block 与 citations

示例测试片段：

```ts
it("renders the hybrid context bar when current page context is available", async () => {
  const services = createServices({
    queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
    extractPage: vi.fn(async () => "React compiler removes useMemo boilerplate")
  })

  await renderSidePanel(services)

  expect(container?.textContent).toContain("Current page")
  expect(container?.textContent).toContain("Current React Page")
})
```

```ts
it("renders hybrid retrieval cards for a keyword query", async () => {
  const services = createServices({
    bookmarkRepository: createBookmarkRepository({
      list: vi.fn(async () => [createBookmark({ id: "1", title: "React Compiler Notes", extractedText: "memoization details" })])
    }),
    queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
    extractPage: vi.fn(async () => "react compiler and useMemo")
  })

  await renderSidePanel(services)

  const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    setter?.call(searchInput, "react compiler")
    searchInput.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await act(async () => { await Promise.resolve() })

  expect(container?.textContent).toContain("Current page match")
  expect(container?.textContent).toContain("Saved bookmarks")
  expect(container?.textContent).toContain("React Compiler Notes")
})
```

```ts
it("renders an answer block with citations for question queries", async () => {
  const services = createServices({
    bookmarkRepository: createBookmarkRepository({
      list: vi.fn(async () => [createBookmark({ id: "1", title: "React Compiler Notes", extractedText: "Compiler removes useMemo boilerplate" })])
    }),
    queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
    extractPage: vi.fn(async () => "Compiler removes useMemo boilerplate")
  })

  await renderSidePanel(services)

  const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    setter?.call(searchInput, "这篇文章对 useMemo 的结论是什么？")
    searchInput.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await act(async () => { await Promise.resolve() })

  expect(container?.textContent).toContain("Based on")
  expect(container?.textContent).toContain("Current React Page")
})
```

同时保留现有 trial banner、theme toggle、analyze spinner 测试不删，确保回归覆盖。

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

Expected: FAIL，当前 sidepanel 仍是旧的书签树 / 搜索列表布局。

**Step 3: Write minimal implementation**

在 `src/components/hybrid-context-bar.tsx` 中渲染顶部上下文条：

```tsx
import React from "react"

type HybridContextBarProps = {
  currentPageTitle?: string
  indexedBookmarkCount: number
}

export function HybridContextBar({ currentPageTitle, indexedBookmarkCount }: HybridContextBarProps) {
  return (
    <section aria-label="Hybrid retrieval context">
      <div>Current page: {currentPageTitle ?? "Unavailable"}</div>
      <div>Library: {indexedBookmarkCount} bookmarks indexed</div>
      <div>Hybrid local search enabled</div>
    </section>
  )
}
```

在 `src/components/hybrid-query-stream.tsx` 中渲染统一结果流：

```tsx
import React from "react"
import type { ActionCard } from "../features/hybrid-retrieval/build-action-cards"
import type { AnswerBlock } from "../features/hybrid-retrieval/build-answer-block"
import type { RankedHybridResult } from "../features/hybrid-retrieval/rank-hybrid-results"

export function HybridQueryStream(input: {
  query: string
  rankedResults: RankedHybridResult[]
  actions: ActionCard[]
  answer?: AnswerBlock | null
  onOpenBookmark?: (bookmarkId: string) => void
}) {
  const currentPageResults = input.rankedResults.filter((result) => result.document.sourceType === "current-page")
  const savedBookmarkResults = input.rankedResults.filter((result) => result.document.sourceType === "saved-bookmark")

  return (
    <section aria-label="Hybrid query stream">
      <div>{input.query}</div>
      {currentPageResults.length > 0 ? <div>Current page match</div> : null}
      {currentPageResults.map((result) => <div key={`${result.document.url}-current`}>{result.document.title}</div>)}
      {savedBookmarkResults.length > 0 ? <div>Saved bookmarks</div> : null}
      {savedBookmarkResults.map((result) => (
        <button key={result.document.bookmarkId} onClick={() => result.document.bookmarkId && input.onOpenBookmark?.(result.document.bookmarkId)} type="button">
          {result.document.title}
        </button>
      ))}
      {input.actions.map((action) => <div key={action.id}>{action.label}</div>)}
      {input.answer ? (
        <article>
          <p>{input.answer.text}</p>
          {input.answer.citations.map((citation) => <div key={citation.url}>{citation.title}</div>)}
        </article>
      ) : null}
    </section>
  )
}
```

在 `src/sidepanel.tsx` 中做以下最小重构：

- services 增加：
  - `extractPage`（默认使用 `defaultExtractPage`）
  - `queryActiveTab`（仿照 `src/popup.tsx:39-60` 的实现）
- 新增状态：
  - `currentPageContext`
  - `rankedResults`
  - `actionCards`
  - `answerBlock`
- `useEffect` 初始时获取当前页并抽取文本
- `useMemo` / `useEffect` 基于 `searchQuery`：
  - `detectQueryIntent(searchQuery)`
  - `retrieveHybridResults(...)`
  - `buildActionCards(...)`
  - 若意图为 `answer` 或 `mixed`，调用 `buildAnswerBlock(...)`
- 当 `searchQuery` 非空时，不再渲染 `BookmarkList compact`，改为渲染 `HybridQueryStream`
- 当 `searchQuery` 为空时，保留现有 Library / BookmarkTree 视图，避免一次性推翻所有旧功能

同时更新顶部副标题，使其更贴近新方案，例如：

```tsx
<p style={subtitleStyle}>Search the current page and your saved library.</p>
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/sidepanel.tsx src/components/hybrid-query-stream.tsx src/components/hybrid-context-bar.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat(sidepanel): add hybrid retrieval query stream"
```

---

### Task 7: 为 Side Panel 动作卡补最小交互闭环

**Files:**
- Modify: `src/components/hybrid-query-stream.tsx`
- Modify: `src/sidepanel.tsx`
- Test: `tests/ui/sidepanel.test.tsx`

**Step 1: Write the failing test**

在 `tests/ui/sidepanel.test.tsx` 中新增两个交互：

1. 点击某个已保存书签结果，会打开现有 `BookmarkDrawer`
2. 点击 `Ask current page` / `Ask top matches` 动作卡，会刷新 answer block

示例：

```ts
it("opens the drawer when a saved-bookmark hybrid result is selected", async () => {
  const bookmark = createBookmark({ id: "1", title: "Drawer article", extractedText: "React compiler details" })
  const services = createServices({
    bookmarkRepository: createBookmarkRepository({ list: vi.fn(async () => [bookmark]) }),
    queryActiveTab: vi.fn(async () => ({ id: 1, title: "Current React Page", url: "https://example.com/current" })),
    extractPage: vi.fn(async () => "react compiler")
  })

  await renderSidePanel(services)

  const searchInput = container?.querySelector("#sidepanel-search") as HTMLInputElement
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    setter?.call(searchInput, "react compiler")
    searchInput.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await act(async () => { await Promise.resolve() })

  const resultButton = Array.from(container?.querySelectorAll("button") ?? []).find((btn) => btn.textContent?.includes("Drawer article"))
  await act(async () => { resultButton?.click() })

  expect(container?.querySelector("[data-testid='bookmark-drawer']")?.textContent).toContain("Drawer article")
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

Expected: FAIL

**Step 3: Write minimal implementation**

在 `src/components/hybrid-query-stream.tsx` 中：
- 将动作卡渲染为 button
- 暴露 `onAction(actionId)` 回调

目标片段：

```tsx
{input.actions.map((action) => (
  <button key={action.id} onClick={() => input.onAction?.(action.id)} type="button">
    {action.label}
  </button>
))}
```

在 `src/sidepanel.tsx` 中：
- 点击已保存书签结果时，通过 `bookmark.id` 找到原 bookmark，并复用现有 `setSelectedBookmark()` 打开 `BookmarkDrawer`
- 点击动作卡时：
  - `ask-current-page` → 用仅当前页相关结果重新构造 `answerBlock`
  - `ask-top-matches` → 用前 3 个结果重新构造 `answerBlock`
  - `open-dashboard` → 先调用 `chrome.runtime.openOptionsPage?.()`；若没有 API，则忽略

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/hybrid-query-stream.tsx src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat(sidepanel): connect hybrid actions to drawer and answer flow"
```

---

### Task 8: 做回归验证并整理实现边界

**Files:**
- Modify: `docs/plans/2026-03-29-sidepanel-hybrid-retrieval-design.md`
- Test: `tests/ui/sidepanel.test.tsx`
- Test: `tests/bookmarks/search-bookmarks.test.ts`
- Test: `tests/bookmarks/search-bookmarks-with-reasons.test.ts`
- Test: `tests/hybrid-retrieval/*.test.ts`

**Step 1: Write the failing test**

此任务不新增新功能测试，而是整理最终回归命令，确保所有新增测试都被纳入。

**Step 2: Run test to verify it fails**

先运行全套相关测试：

Run:
```bash
npx vitest run tests/ui/sidepanel.test.tsx tests/bookmarks/search-bookmarks.test.ts tests/bookmarks/search-bookmarks-with-reasons.test.ts tests/hybrid-retrieval/*.test.ts
```

Expected: 若仍有未收束问题则 FAIL；否则 PASS。

**Step 3: Write minimal implementation**

根据失败结果修补最小问题，不增加范围外能力。随后更新设计文档末尾，增加一段“Implementation Notes”，注明：

```md
## Implementation Notes

- 第一阶段回答块是本地检索驱动的引用式解释，不是完整 LLM 对话系统。
- 当前页只作为 ephemeral context 使用，不会自动写入 bookmark store。
- 旧的 BookmarkTree 视图在 searchQuery 为空时保留，降低迁移风险。
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run tests/ui/sidepanel.test.tsx tests/bookmarks/search-bookmarks.test.ts tests/bookmarks/search-bookmarks-with-reasons.test.ts tests/hybrid-retrieval/*.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add docs/plans/2026-03-29-sidepanel-hybrid-retrieval-design.md tests/ui/sidepanel.test.tsx tests/bookmarks/search-bookmarks.test.ts tests/bookmarks/search-bookmarks-with-reasons.test.ts tests/hybrid-retrieval
git commit -m "test(sidepanel): verify hybrid retrieval MVP"
```
