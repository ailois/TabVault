# Ghostreader Session Memory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan milestone-by-milestone.

## Goal

为 Ghostreader 增加可管理的会话记忆能力，支持：

- 新建 / 继续会话
- 多轮追问
- 会话内引用解析
- sidepanel 与 dashboard 共享同一套会话语义
- 存储失败时回退到现有单轮模式

## Architecture Decisions

在开始实现前，以下决策已固定：

1. **单一事实来源**
   - `ghostreader-session-store` 负责持久化
   - `ghostreader-session-reducer` 负责状态变更
   - sidepanel 与 dashboard 不允许各自维护不同的 session 语义

2. **统一 active session**
   - sidepanel 与 dashboard 共用同一个 active session
   - dashboard 当前 bookmark 只是当前提问的高优先级上下文
   - 切换 bookmark 不自动新建 session

3. **固定引用解析优先级**
   - 当前 bookmark / 当前页面
   - `workingSetBookmarkIds[]`
   - `bookmarksAddedInSession[]`
   - 最近一次 retrieval 结果
   - 全量检索

4. **明确限制**
   - 最多保留 20 个 session
   - 单个 session 最多保留 30 条 message
   - working set 最多 50 个 bookmark id
   - prompt 最多注入最近 3 轮消息、最多 5 个 working set bookmark

5. **首版不做**
   - 复杂线程 UI
   - 远程同步
   - 额外 LLM 调用生成长期记忆
   - 基于 diff 的复杂新增书签推断

---

## Milestone 1: Session Foundation

### Scope

建立最小可用的 session 数据层。

### Files

- Create: `src/features/ghostreader-session/ghostreader-session-types.ts`
- Create: `src/features/ghostreader-session/ghostreader-session-store.ts`
- Create: `src/features/ghostreader-session/ghostreader-session-reducer.ts`
- Modify: `src/features/hybrid-retrieval/hybrid-types.ts`

### Deliverables

- 定义 `GhostreaderSession`、`GhostreaderSessionMessage`、`GhostreaderIntentMemory`
- 提供 `createEmptyGhostreaderSession(...)`
- 提供 `loadSessions()`、`saveSessions()`、`clearActiveSession()`
- 提供 reducer helpers：
  - `appendUserMessage(...)`
  - `appendAssistantMessage(...)`
  - `replaceWorkingSet(...)`
  - `recordBookmarkAddedEvent(...)`
- 实现裁剪策略：
  - session 总数限制
  - message 数量限制
  - working set 去重与截断

### Tests

- `tests/ghostreader-session/ghostreader-session-types.test.ts`
- `tests/ghostreader-session/ghostreader-session-store.test.ts`
- `tests/ghostreader-session/ghostreader-session-reducer.test.ts`

### Exit Criteria

- 能创建、保存、恢复 active session
- reducer 行为稳定可测
- store 中不复制 extracted text 等大块正文

---

## Milestone 2: Query-Time Session Context

### Scope

让 sidepanel 先具备最小多轮问答能力。

### Files

- Create: `src/features/ghostreader-session/ghostreader-reference-resolution.ts`
- Create: `src/features/ghostreader-session/ghostreader-intent-memory.ts`
- Modify: `src/features/hybrid-retrieval/query-intent.ts`
- Modify: `src/features/hybrid-retrieval/ghostreader.ts`
- Modify: `src/sidepanel.tsx`

### Deliverables

- 实现 `resolveSessionReferences(query, context)`
- 仅支持显式短语匹配：
  - “这个书签”
  - “这些书签”
  - “刚加的几个”
  - “上一个结果”
- 实现规则驱动的 `intentMemory` 更新
- 为 `buildGhostreaderContent(...)` 增加 `sessionContext`
- sidepanel 提问链路接入：
  - 读取 active session
  - 解析引用
  - 注入最近消息 / intent / working set
  - 回答后写回 session

### Tests

- `tests/ghostreader-session/ghostreader-reference-resolution.test.ts`
- `tests/ghostreader-session/ghostreader-intent-memory.test.ts`
- `tests/hybrid-retrieval/ghostreader-session-content.test.ts`
- `tests/ui/sidepanel-ghostreader.test.tsx`

### Exit Criteria

- sidepanel 可以进行稳定多轮追问
- “关于杨幂的书签有哪些” → “总结这个书签”能够利用 session 上下文
- prompt 注入受控，不出现无上限膨胀

---

## Milestone 3: Shared Behavior In Dashboard

### Scope

让 dashboard 复用相同 session 语义，而不是另起一套逻辑。

### Files

- Modify: `src/features/dashboard/dashboard-ask-box.tsx`
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Modify: `tests/ui/dashboard-ask-box.test.tsx`

### Deliverables

- dashboard 共享同一套 session store / reducer / reference resolution / prompt builder
- 当前 active bookmark 作为本次提问的最高优先级上下文
- 切换 dashboard bookmark 时不自动重建 session
- 保留现有 requestId / stale response 防护

### Tests

- `tests/ui/dashboard-ask-box.test.tsx`
- 视需要补 `tests/ui/dashboard-shell.test.tsx`

### Exit Criteria

- sidepanel 与 dashboard 的 Ghostreader 对相同追问给出一致语义
- dashboard 不再丢失会话上下文
- 不破坏现有 stale response 防护

---

## Milestone 4: Fallback, Pruning, And Minimal Controls

### Scope

补齐可用性与最小 UI 控制。

### Files

- Modify: `src/sidepanel.tsx`
- Modify: `src/features/dashboard/dashboard-ask-box.tsx`
- 视需要新增 Ghostreader session control 组件

### Deliverables

- session store 操作统一包在 `try/catch`
- store 失败时设置 `sessionPersistenceDisabled`
- 失败时继续回答，且最多提示一次
- 增加最小 UI 控件：
  - `new session`
  - `continue session`
- 不做复杂会话列表 UI

### Tests

- `tests/ui/ghostreader-session-fallback.test.tsx`
- 更新：
  - `tests/ui/sidepanel-ghostreader.test.tsx`
  - `tests/ui/dashboard-ask-box.test.tsx`

### Exit Criteria

- 存储失败不阻断问答
- 用户能显式清空上下文并开启新会话
- session 相关 UI 语义简洁且不干扰主流程

---

## Milestone 5: Bookmark Events (Optional After Core Is Stable)

### Scope

在核心闭环稳定后，再补“会话中新增书签”的行为记忆。

### Files

- Modify: `src/background.ts`
- Modify: `src/sidepanel.tsx`
- Modify: `src/features/dashboard/dashboard-shell.tsx`

### Deliverables

- 当 runtime message 能提供明确新增 bookmark 信息时，写入 `recordBookmarkAddedEvent(...)`
- 新增书签立即进入 `workingSetBookmarkIds[]`
- 最近新增书签可被后续提问引用

### Explicit Deferral

以下内容后置，不纳入首批实现：

- 通过 reload 前后 diff 推断新增 bookmark
- 完整会话历史列表
- archive / reopen UI

### Tests

- 更新：
  - `tests/ui/sidepanel-ghostreader.test.tsx`
  - `tests/ui/dashboard-ask-box.test.tsx`

### Exit Criteria

- “把刚加的几个也一起总结”能够命中新加入的书签
- 没有 runtime event 详情时不会引入不稳定推断

---

## Verification Plan

核心验证顺序：

1. 先跑新增 unit tests
2. 再跑 Ghostreader 相关 integration / UI tests
3. 最后跑更宽的 sidepanel / dashboard 回归

建议测试集：

- `tests/ghostreader-session/*`
- `tests/hybrid-retrieval/ghostreader-session-content.test.ts`
- `tests/ui/sidepanel-ghostreader.test.tsx`
- `tests/ui/dashboard-ask-box.test.tsx`
- `tests/ui/ghostreader-session-fallback.test.tsx`
- 必要时：
  - `tests/ui/sidepanel.test.tsx`
  - `tests/ui/dashboard-shell.test.tsx`

## YAGNI Checklist

实现过程中必须持续检查：

- 是否复制了 bookmark 正文到 session store
- 是否新增了不必要的 provider / LLM 调用
- 是否让 sidepanel 和 dashboard 出现两套不同 session 语义
- 是否提前实现复杂会话列表或聊天 UI
- 是否把 bookmark event 推断做得超过首版需要

## Suggested Commit Strategy

不要按旧版本那样“每个小 task 一次 commit”，改为按 milestone 提交：

1. `feat: add ghostreader session foundation`
2. `feat: add sidepanel ghostreader session context`
3. `feat: share ghostreader sessions with dashboard`
4. `fix: fall back when ghostreader session storage fails`
5. `feat: track bookmark events in ghostreader sessions`（可选）

## Done Definition

该计划只有在以下条件同时满足时才算完成：

- sidepanel 与 dashboard 共用同一套 Ghostreader session 语义
- 多轮追问能稳定利用 session 上下文
- 新会话可以显式清空上下文
- session store 失败时仍可正常回答
- prompt / store 都有明确裁剪上限
- 所有相关测试通过
