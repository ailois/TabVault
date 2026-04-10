# Ghostreader Chat Assistant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Ghostreader 从“只显示最后一轮问答”的界面改成完整聊天历史的知识库助手，同时保留 session 边界，并在新 session 中自动继承轻量跨会话记忆。

**Architecture:** 以现有 `GhostreaderSession.messages` 为主数据源，把 sidepanel 和 dashboard 的 Ghostreader UI 从 snapshot 模式切换为 transcript 模式。保留现有 session store、working set、follow-up memory 机制，在其上补充 transcript view helper、跨会话继承记忆构建、每轮 assistant turn 元数据和失败轮次保护。

**Tech Stack:** React, TypeScript, Vitest, Chrome extension storage, existing Ghostreader hybrid retrieval pipeline.

---

### Task 1: 扩展 session view model，支持 transcript 与继承记忆

**Files:**
- Modify: `src/features/ghostreader-session/ghostreader-session-types.ts`
- Modify: `src/features/ghostreader-session/ghostreader-session-view.ts`
- Modify: `tests/ghostreader-session/ghostreader-session-view.test.ts`
- Modify: `tests/ghostreader-session/ghostreader-session-types.test.ts`
- Modify: `tests/ghostreader-session/ghostreader-session-store.test.ts`

**Step 1: 先写失败测试，定义 transcript 与 inherited memory 的期望行为**

```ts
it("returns the full transcript instead of only the latest snapshot", () => {
  let session = createEmptyGhostreaderSession({ id: "session-1", title: "New session" })
  session = appendUserMessage(session, {
    id: "user-1",
    text: "先介绍一下 React",
    queryMode: "cross-bookmark"
  })
  session = appendAssistantMessage(session, {
    id: "assistant-1",
    text: "React 是一个 UI 库",
    referencedBookmarkIds: ["bm-react"]
  })
  session = appendUserMessage(session, {
    id: "user-2",
    text: "那它为什么值得收藏？",
    queryMode: "cross-bookmark",
    referencedBookmarkIds: ["bm-react"]
  })

  expect(getGhostreaderTranscript(session)).toEqual([
    expect.objectContaining({ role: "user", text: "先介绍一下 React" }),
    expect.objectContaining({ role: "assistant", text: "React 是一个 UI 库" }),
    expect.objectContaining({ role: "user", text: "那它为什么值得收藏？" })
  ])
})

it("builds inherited memory from recent successful sessions", () => {
  const sessions = [
    createSessionWithTurns({
      id: "older",
      turns: [["React 是什么？", "React 是一个 UI 库"]],
      bookmarkIds: ["bm-react"]
    }),
    createSessionWithTurns({
      id: "latest",
      turns: [["总结下编译器文章", "重点在静态优化"]],
      bookmarkIds: ["bm-compiler"]
    })
  ]

  expect(buildGhostreaderInheritedMemory(sessions, "new-session")).toEqual(
    expect.objectContaining({
      recentTopicSummary: expect.stringContaining("编译器文章"),
      bookmarkIds: ["bm-compiler", "bm-react"]
    })
  )
})
```

**Step 2: 运行这些测试，确认它们先失败**

Run:
```bash
npm exec vitest run tests/ghostreader-session/ghostreader-session-view.test.ts tests/ghostreader-session/ghostreader-session-types.test.ts tests/ghostreader-session/ghostreader-session-store.test.ts
```

Expected: FAIL，提示 `getGhostreaderTranscript` / `buildGhostreaderInheritedMemory` 不存在，或 session 类型缺少新字段。

**Step 3: 写最小实现**

在 `ghostreader-session-types.ts` 中补充轻量结构，让 transcript UI 和失败轮次表达更明确：

```ts
export type GhostreaderAssistantMessageState = "success" | "error"

export type GhostreaderSessionMessageCitation = {
  sourceType: "current-page" | "saved-bookmark"
  title: string
  url: string
  matchReason: string
}

export type GhostreaderInheritedMemory = {
  recentTopicSummary: string
  bookmarkIds: string[]
  sourceSessionIds: string[]
}

export type GhostreaderSessionMessage = {
  id: string
  role: GhostreaderSessionMessageRole
  text: string
  createdAt: string
  referencedBookmarkIds: string[]
  queryMode?: GhostreaderQueryMode
  retrievalSummary?: string
  citations?: GhostreaderSessionMessageCitation[]
  assistantState?: GhostreaderAssistantMessageState
}
```

在 `ghostreader-session-view.ts` 中新增 transcript / inherited-memory helper，并保留老 helper 直到调用方迁完：

```ts
export function getGhostreaderTranscript(session: GhostreaderSession | null): GhostreaderSessionMessage[] {
  return session?.messages ?? []
}

export function buildGhostreaderInheritedMemory(
  sessions: GhostreaderSession[],
  activeSessionId: string | null
): GhostreaderInheritedMemory {
  const sourceSessions = sessions
    .filter((session) => session.id !== activeSessionId)
    .filter((session) => session.messages.some((message) => message.role === "assistant" && message.assistantState !== "error"))
    .slice(0, 3)

  return {
    recentTopicSummary: sourceSessions
      .flatMap((session) => session.messages)
      .filter((message) => message.role === "user")
      .slice(-3)
      .map((message) => message.text)
      .join("；"),
    bookmarkIds: Array.from(
      new Set(sourceSessions.flatMap((session) => [
        ...session.followUpMemory.lastReferencedBookmarkIds,
        ...session.workingSetBookmarkIds
      ]))
    ).slice(0, 10),
    sourceSessionIds: sourceSessions.map((session) => session.id)
  }
}
```

**Step 4: 重新运行测试，确认通过**

Run:
```bash
npm exec vitest run tests/ghostreader-session/ghostreader-session-view.test.ts tests/ghostreader-session/ghostreader-session-types.test.ts tests/ghostreader-session/ghostreader-session-store.test.ts
```

Expected: PASS

**Step 5: 提交这一小步**

```bash
git add tests/ghostreader-session/ghostreader-session-view.test.ts tests/ghostreader-session/ghostreader-session-types.test.ts tests/ghostreader-session/ghostreader-session-store.test.ts src/features/ghostreader-session/ghostreader-session-types.ts src/features/ghostreader-session/ghostreader-session-view.ts
git commit -m "feat: add ghostreader transcript session helpers"
```

---

### Task 2: 让 sidepanel 从 snapshot 改为 transcript 渲染

**Files:**
- Modify: `src/sidepanel.tsx`
- Modify: `tests/ui/sidepanel-ghostreader.test.tsx`

**Step 1: 先写失败 UI 测试，锁定“连续提问不覆盖旧消息”与“恢复完整历史”**

```ts
it("keeps prior turns visible after a second Ghostreader question", async () => {
  const analyze = vi
    .fn()
    .mockResolvedValueOnce({ summary: "第一轮回答", tags: [] })
    .mockResolvedValueOnce({ summary: "第二轮回答", tags: [] })

  await renderSidePanel(createServices({ createProvider: vi.fn(() => ({ analyze })) }))

  await submitGhostreaderQuestion("第一问")
  await submitGhostreaderQuestion("第二问")

  expect(container?.textContent).toContain("第一问")
  expect(container?.textContent).toContain("第一轮回答")
  expect(container?.textContent).toContain("第二问")
  expect(container?.textContent).toContain("第二轮回答")
})

it("restores the full transcript when continuing a previous session", async () => {
  // 先聊两轮，再新建 session，再 continue 回来
  expect(container?.textContent).toContain("第一问")
  expect(container?.textContent).toContain("第二问")
})
```

**Step 2: 运行侧边栏测试，确认它们失败**

Run:
```bash
npm exec vitest run tests/ui/sidepanel-ghostreader.test.tsx -t "keeps prior turns visible after a second Ghostreader question"
npm exec vitest run tests/ui/sidepanel-ghostreader.test.tsx -t "restores the full transcript when continuing a previous session"
```

Expected: FAIL，页面当前只显示最后一轮 answer block，旧问题/旧回答不可见。

**Step 3: 写最小实现，把显示逻辑切到 transcript**

在 `src/sidepanel.tsx` 中：
- 用 `getGhostreaderTranscript(activeGhostreaderSession)` 代替 `getGhostreaderSessionSnapshot(...)` 作为聊天区主数据
- 渲染 `session.messages`，welcome card 只在 transcript 为空时显示
- 让 `restoreGhostreaderView` 恢复整个消息列表，而不是只恢复最后一个 query/answer
- 保留 `ghostreaderResults` / `ghostreaderActionCards` 仅作为当前轮附加信息，或逐步折叠进 assistant message 元数据

可以用下面的结构起步：

```tsx
const transcript = useMemo(
  () => getGhostreaderTranscript(activeGhostreaderSession),
  [activeGhostreaderSession]
)

{transcript.length > 0 ? (
  <div data-testid="ghostreader-transcript">
    {transcript.map((message) => (
      <div key={message.id} data-testid={`ghostreader-message-${message.role}`}>
        <p>{message.text}</p>
        {message.role === "assistant" && message.citations?.length ? (
          <ul>
            {message.citations.map((citation) => (
              <li key={`${message.id}-${citation.url}`}>{citation.title}</li>
            ))}
          </ul>
        ) : null}
      </div>
    ))}
  </div>
) : (
  <WelcomeCard />
)}
```

追加 assistant message 时，把 citations 一起写进 message：

```ts
nextSession = appendAssistantMessage(nextSession, {
  id: `assistant-${Date.now()}`,
  text: analysis.summary,
  referencedBookmarkIds,
  citations: results.slice(0, 3).map((result) => ({
    sourceType: result.document.sourceType,
    title: result.document.title,
    url: result.document.url,
    matchReason: result.matchReason
  }))
})
```

**Step 4: 重新运行 sidepanel 测试**

Run:
```bash
npm exec vitest run tests/ui/sidepanel-ghostreader.test.tsx
```

Expected: PASS，尤其是新加的 transcript 测试通过，既有 session/continue 测试仍通过。

**Step 5: 提交这一小步**

```bash
git add tests/ui/sidepanel-ghostreader.test.tsx src/sidepanel.tsx
git commit -m "feat: render ghostreader sidepanel as transcript"
```

---

### Task 3: 在 sidepanel 新 session 中注入跨会话继承记忆，并纳入 prompt context

**Files:**
- Modify: `src/sidepanel.tsx`
- Modify: `src/features/hybrid-retrieval/ghostreader.ts`
- Modify: `tests/ghostreader-session/ghostreader-prompt-context.test.ts`
- Modify: `tests/hybrid-retrieval/ghostreader-session-content.test.ts`
- Modify: `tests/ui/sidepanel-ghostreader.test.tsx`

**Step 1: 先写失败测试，证明“新 session 可自动继承轻量记忆”**

```ts
it("includes inherited cross-session memory in the next session prompt", async () => {
  const analyze = vi.fn(async ({ content }) => ({ summary: content, tags: [] }))
  const ghostreaderSessionStore = createGhostreaderSessionStoreWithSessions([
    createSessionWithTurns({
      id: "session-old",
      turns: [["总结 React 编译器文章", "重点是静态优化"]],
      bookmarkIds: ["bm-compiler"]
    })
  ])

  await renderSidePanel(
    createServices({
      createProvider: vi.fn(() => ({ analyze })),
      ghostreaderSessionStore
    })
  )

  await act(async () => {
    container?.querySelector<HTMLButtonElement>("[data-testid='sidepanel-new-session']")?.click()
  })
  await submitGhostreaderQuestion("继续说说")

  const prompt = analyze.mock.calls.at(-1)?.[0]?.content as string
  expect(prompt).toContain("session inherited memory")
  expect(prompt).toContain("React 编译器文章")
  expect(prompt).toContain("bm-compiler")
})
```

**Step 2: 运行相关测试，确认先失败**

Run:
```bash
npm exec vitest run tests/ghostreader-session/ghostreader-prompt-context.test.ts tests/hybrid-retrieval/ghostreader-session-content.test.ts tests/ui/sidepanel-ghostreader.test.tsx -t "includes inherited cross-session memory in the next session prompt"
```

Expected: FAIL，prompt 中还没有继承记忆块。

**Step 3: 写最小实现**

在 `src/sidepanel.tsx` 创建新 session 时构建 inherited memory，并在 submit 时带入：

```ts
const inheritedMemory = useMemo(
  () => buildGhostreaderInheritedMemory(ghostreaderSessionState.sessions, activeGhostreaderSession?.id ?? null),
  [ghostreaderSessionState.sessions, activeGhostreaderSession?.id]
)

const nextSession = createEmptyGhostreaderSession({
  id: createGhostreaderSessionId(),
  title: createGhostreaderSessionTitle(),
  inheritedMemory
})
```

在 `buildGhostreaderContent(...)` 的 session block 中加入继承记忆：

```ts
type GhostreaderSessionContext = {
  intentSummary?: string
  recentTurns?: GhostreaderRecentTurn[]
  followUpMemory?: GhostreaderFollowUpMemoryContext
  inheritedMemory?: {
    recentTopicSummary: string
    bookmarkIds: string[]
  }
  recentAddedBookmarks?: Array<{ title: string; url: string }>
}
```

并输出清晰文本块：

```ts
if (sessionContext.inheritedMemory?.recentTopicSummary.trim()) {
  sections.push(
    `session inherited memory:\n- recentTopicSummary: ${sessionContext.inheritedMemory.recentTopicSummary}\n- bookmarkIds: ${sessionContext.inheritedMemory.bookmarkIds.join(", ") || "none"}`
  )
}
```

**Step 4: 重新运行上下文与 sidepanel 测试**

Run:
```bash
npm exec vitest run tests/ghostreader-session/ghostreader-prompt-context.test.ts tests/hybrid-retrieval/ghostreader-session-content.test.ts tests/ui/sidepanel-ghostreader.test.tsx
```

Expected: PASS，且 prompt 仍保留 recent turns、follow-up memory、recentAddedBookmarks。

**Step 5: 提交这一小步**

```bash
git add tests/ghostreader-session/ghostreader-prompt-context.test.ts tests/hybrid-retrieval/ghostreader-session-content.test.ts tests/ui/sidepanel-ghostreader.test.tsx src/sidepanel.tsx src/features/hybrid-retrieval/ghostreader.ts
git commit -m "feat: inherit ghostreader memory across sessions"
```

---

### Task 4: 给失败轮次追加 assistant error turn，并确保不污染继承记忆

**Files:**
- Modify: `src/features/ghostreader-session/ghostreader-session-reducer.ts`
- Modify: `src/sidepanel.tsx`
- Modify: `tests/ui/ghostreader-session-fallback.test.tsx`
- Modify: `tests/ui/sidepanel-ghostreader.test.tsx`
- Modify: `tests/ghostreader-session/ghostreader-session-view.test.ts`

**Step 1: 先写失败测试，锁定“失败不清空历史、不进入 inherited memory”**

```ts
it("appends an assistant error turn without clearing the transcript", async () => {
  const analyze = vi
    .fn()
    .mockResolvedValueOnce({ summary: "第一轮正常回答", tags: [] })
    .mockRejectedValueOnce(new Error("provider crashed"))

  await renderSidePanel(createServices({ createProvider: vi.fn(() => ({ analyze })) }))

  await submitGhostreaderQuestion("第一问")
  await submitGhostreaderQuestion("第二问")

  expect(container?.textContent).toContain("第一问")
  expect(container?.textContent).toContain("第一轮正常回答")
  expect(container?.textContent).toContain("第二问")
  expect(container?.textContent).toContain("Ghostreader 暂时无法完成这轮回答")
})

it("does not include failed assistant turns in inherited memory", () => {
  const memory = buildGhostreaderInheritedMemory([
    createSessionWithMixedAssistantStates()
  ], null)

  expect(memory.recentTopicSummary).not.toContain("provider crashed")
})
```

**Step 2: 运行这些测试，确认先失败**

Run:
```bash
npm exec vitest run tests/ui/ghostreader-session-fallback.test.tsx tests/ui/sidepanel-ghostreader.test.tsx tests/ghostreader-session/ghostreader-session-view.test.ts
```

Expected: FAIL，目前非 fallback 错误只显示 banner，不会向 transcript 追加 assistant error turn。

**Step 3: 写最小实现**

在 reducer 允许 assistant message 标记错误状态：

```ts
export function appendAssistantMessage(
  session: GhostreaderSession,
  input: AppendAssistantMessageInput
): GhostreaderSession {
  const nextMessage: GhostreaderSessionMessage = {
    id: input.id,
    role: "assistant",
    text: input.text,
    createdAt,
    referencedBookmarkIds: input.referencedBookmarkIds ?? [],
    retrievalSummary: input.retrievalSummary,
    citations: input.citations ?? [],
    assistantState: input.assistantState ?? "success"
  }
  // ...
}
```

在 `src/sidepanel.tsx` 的非 fallback `catch` 分支中，把错误转成 assistant turn，而不是只依赖 banner：

```ts
nextSession = appendAssistantMessage(nextSession, {
  id: `assistant-error-${Date.now()}`,
  text: t("sidepanel.error.ghostreaderFailed"),
  referencedBookmarkIds: [],
  assistantState: "error"
})
```

然后持久化 session，但不要调用 `updateFollowUpMemory(...)`，也不要把该错误 turn 纳入 inherited memory。

**Step 4: 重新运行错误相关测试**

Run:
```bash
npm exec vitest run tests/ui/ghostreader-session-fallback.test.tsx tests/ui/sidepanel-ghostreader.test.tsx tests/ghostreader-session/ghostreader-session-view.test.ts
```

Expected: PASS

**Step 5: 提交这一小步**

```bash
git add tests/ui/ghostreader-session-fallback.test.tsx tests/ui/sidepanel-ghostreader.test.tsx tests/ghostreader-session/ghostreader-session-view.test.ts src/features/ghostreader-session/ghostreader-session-reducer.ts src/sidepanel.tsx
git commit -m "fix: preserve ghostreader transcript on failed turns"
```

---

### Task 5: 让 dashboard ask box 与 sidepanel 保持一致的 transcript 与继承记忆行为

**Files:**
- Modify: `src/features/dashboard/dashboard-ask-box.tsx`
- Modify: `tests/ui/dashboard-ask-box.test.tsx`
- Modify: `src/features/ghostreader-session/ghostreader-session-view.ts` (如果 Task 1 中 helper 还需要补 dashboard 用的导出)

**Step 1: 先写失败测试，锁定 dashboard 的多轮保留与 continue session 恢复**

```ts
it("keeps prior dashboard Ghostreader turns visible after follow-up questions", async () => {
  const analyze = vi
    .fn()
    .mockResolvedValueOnce({ summary: "第一轮回答", tags: [] })
    .mockResolvedValueOnce({ summary: "第二轮回答", tags: [] })

  await renderDashboardAskBox({ createProvider: vi.fn(() => ({ analyze })) })

  await submitDashboardQuestion("先总结这个书签")
  await submitDashboardQuestion("再详细一点")

  expect(container?.textContent).toContain("先总结这个书签")
  expect(container?.textContent).toContain("第一轮回答")
  expect(container?.textContent).toContain("再详细一点")
  expect(container?.textContent).toContain("第二轮回答")
})

it("restores the full dashboard session transcript when continuing a previous session", async () => {
  expect(container?.textContent).toContain("先总结这个书签")
  expect(container?.textContent).toContain("再详细一点")
})
```

**Step 2: 运行 dashboard 测试，确认先失败**

Run:
```bash
npm exec vitest run tests/ui/dashboard-ask-box.test.tsx
```

Expected: FAIL，dashboard 仍基于 snapshot 恢复与展示。

**Step 3: 写最小实现**

把 `src/features/dashboard/dashboard-ask-box.tsx` 按 sidepanel 同步改造：
- transcript 渲染来自 `getGhostreaderTranscript(activeGhostreaderSession)`
- `restoreSessionView(...)` 恢复整个会话消息列表
- 新 session 注入 inherited memory
- assistant turn 保存 citations / assistantState
- 错误轮次写入 transcript，但不污染继承记忆

建议直接复用 sidepanel 已经抽出来的 helper，避免再复制一份拼装逻辑：

```ts
const transcript = useMemo(
  () => getGhostreaderTranscript(activeGhostreaderSession),
  [activeGhostreaderSession]
)

const inheritedMemory = useMemo(
  () => buildGhostreaderInheritedMemory(ghostreaderSessionState.sessions, activeGhostreaderSession?.id ?? null),
  [ghostreaderSessionState.sessions, activeGhostreaderSession?.id]
)
```

**Step 4: 重新运行 dashboard 测试**

Run:
```bash
npm exec vitest run tests/ui/dashboard-ask-box.test.tsx
```

Expected: PASS

**Step 5: 提交这一小步**

```bash
git add tests/ui/dashboard-ask-box.test.tsx src/features/dashboard/dashboard-ask-box.tsx src/features/ghostreader-session/ghostreader-session-view.ts
git commit -m "feat: align dashboard ghostreader with transcript sessions"
```

---

### Task 6: 做回归验证并完成交付前检查

**Files:**
- Review: `docs/manual-testing.md`
- Review: `docs/qa-checklist.md`
- No code changes expected unless verification 暴露缺口

**Step 1: 运行 Ghostreader 相关测试集**

Run:
```bash
npm exec vitest run tests/ghostreader-session/ghostreader-session-view.test.ts tests/ghostreader-session/ghostreader-session-store.test.ts tests/ghostreader-session/ghostreader-prompt-context.test.ts tests/hybrid-retrieval/ghostreader-session-content.test.ts tests/ui/sidepanel-ghostreader.test.tsx tests/ui/ghostreader-session-fallback.test.tsx tests/ui/dashboard-ask-box.test.tsx
```

Expected: PASS

**Step 2: 跑类型检查**

Run:
```bash
npm run typecheck
```

Expected: PASS

**Step 3: 按手工流程验收关键场景**

Manual checks:
- 在 sidepanel 连续提 3 个问题，确认前两轮不消失
- 新建 session 后提问，确认是新线程但回答仍带近期上下文连续性
- Continue 旧 session，确认完整 transcript 恢复
- 制造 provider 失败，确认只新增 error turn，不清空旧历史
- 在 dashboard ask box 重复以上关键路径

**Step 4: 若手工验证暴露缺口，先补最小测试再补实现**

Example pattern:

```ts
it("preserves the first two turns after reopening the sidepanel session", async () => {
  // reproduce bug from manual verification
})
```

然后运行：
```bash
npm exec vitest run <new-targeted-test-file>
```

Expected: 先 FAIL，再通过实现修复。

**Step 5: 最终提交**

```bash
git add src/features/ghostreader-session/ghostreader-session-types.ts src/features/ghostreader-session/ghostreader-session-view.ts src/features/ghostreader-session/ghostreader-session-reducer.ts src/features/hybrid-retrieval/ghostreader.ts src/sidepanel.tsx src/features/dashboard/dashboard-ask-box.tsx tests/ghostreader-session/ghostreader-session-view.test.ts tests/ghostreader-session/ghostreader-session-types.test.ts tests/ghostreader-session/ghostreader-session-store.test.ts tests/ghostreader-session/ghostreader-prompt-context.test.ts tests/hybrid-retrieval/ghostreader-session-content.test.ts tests/ui/sidepanel-ghostreader.test.tsx tests/ui/ghostreader-session-fallback.test.tsx tests/ui/dashboard-ask-box.test.tsx
git commit -m "feat: turn ghostreader into a transcript-based chat assistant"
```
