# Ghostreader Session Memory Design

**Date:** 2026-04-09

## Goal

为 Ghostreader 引入可管理的会话记忆能力，使用户可以：

- 显式开启新会话
- 继续当前或最近一次会话
- 在同一会话中进行多轮追问
- 让系统记住会话中的书签上下文、会话内新增书签，以及当前整理目标

目标不是把 Ghostreader 做成完整聊天产品，而是在现有问答 + 检索增强架构上，补齐“会话级上下文”这一层。

## Problem

当前 Ghostreader 仍然是单轮问答模型：

- 用户每次提问都只围绕当前输入执行一次 query routing、retrieval 和 answer generation
- 上一轮命中的书签结果不会在下一轮被稳定继承
- 用户在会话中新增书签后，这些操作不会被当作显式上下文事件记住
- 用户重新打开 Ghostreader 时，无法明确选择“新会话”还是“继续之前的会话”

这会带来几个直接问题：

1. 用户先问“关于杨幂的书签有哪些”，再问“帮我总结一下这个书签内容”时，系统缺少会话级引用能力，容易找不到目标。
2. 用户在对话中新增书签后，后续问题无法自然利用“刚刚添加的那些书签”。
3. Ghostreader 无法表达或维持当前会话目标，例如“用户正在收集杨幂相关资料”。
4. 用户无法主动重置上下文，旧状态和新问题容易互相污染。

## Requirements

### Functional Requirements

- 支持显式开启新会话
- 支持继续 active session
- 支持保存多轮消息记录
- 支持维护当前会话 working set（当前正在讨论的一组书签）
- 支持记录会话内新增书签事件
- 会话内新增的书签应立即参与后续问答与检索
- 支持维护会话级 intent memory，用于概括用户当前目标或整理方向
- 支持解析“这个书签”“这些书签”“刚加的几个”“上一个结果”等会话内引用
- 同一套会话语义同时服务 sidepanel 与 dashboard Ghostreader

### Non-Goals

- 不把 Ghostreader 一次性重做成完整 IM / chat 产品
- 不做跨设备、跨账号的远程会话同步
- 不把完整历史消息无裁剪注入 prompt
- 不在第一阶段引入额外的 LLM 调用来维护长期记忆
- 不在第一阶段做复杂会话列表、线程树、会话搜索

## Chosen Direction

采用“轻量会话状态机”方案。

核心原则：

- Ghostreader 仍保持“问答 + 检索增强”的产品形态
- 在 query routing / retrieval / answer generation 之前增加一层 session orchestration
- sidepanel 与 dashboard 共享同一个 Ghostreader session domain model
- 当前页面 / 当前选中书签仍然是强信号，但不再是唯一上下文来源

## Single Source of Truth

Ghostreader session 的唯一事实来源为：

- `ghostreader-session-store`：负责持久化 active session 和 session 列表
- `ghostreader-session-reducer`：负责所有 session 状态变更

UI 层（sidepanel / dashboard）只负责：

- 读取 active session
- 发起 session action
- 根据返回结果渲染状态

禁止在 sidepanel 和 dashboard 内各自维护一套隐式 session 语义。两边可以有自己的展示状态，但不能有不同的会话核心逻辑。

## Session Scope

本方案采用“单个全局 active session + 当前 surface 上下文增强”的语义：

- sidepanel 与 dashboard 共享同一个 active session
- dashboard 当前选中的 bookmark 只影响当前提问的上下文优先级，不自动创建新 session
- 切换 dashboard 书签不会自动重置 session
- 只有显式点击“新会话”时才清空会话上下文

这样可以避免 sidepanel 与 dashboard 之间出现两套不一致的记忆行为。

## Session Model

每个 Ghostreader session 包含：

- `id`
- `title`
- `createdAt`
- `updatedAt`
- `status: active | archived`
- `messages[]`
- `workingSetBookmarkIds[]`
- `bookmarksAddedInSession[]`
- `intentMemory`

### messages[]

每条消息只保存最小必要信息：

- `id`
- `role: user | assistant | system`
- `text`
- `createdAt`
- `queryMode`
- `referencedBookmarkIds[]`
- `retrievalSummary?`

约束：

- 不复制 extracted text 或大段网页正文到 session store
- 默认每个 session 最多保留最近 30 条消息；更老消息裁剪

### workingSetBookmarkIds[]

表示当前会话中“正在讨论”的书签集合。

来源包括：

- 当前显式选中的 bookmark
- 最近一轮 retrieval 命中
- 会话内新增书签
- 引用解析后命中的书签

约束：

- 去重
- 默认最多保留 50 个 bookmark id
- 新命中的结果优先向前覆盖旧结果

### bookmarksAddedInSession[]

记录会话内新增书签事件：

- `bookmarkId`
- `title`
- `url`
- `addedAt`
- `source`

约束：

- 默认最多保留最近 20 条事件
- 事件既用于 UI 展示，也用于后续问答引用

### intentMemory

intent memory 是“当前会话目标摘要”，不是长期用户画像。

建议结构：

- `summary: string`
- `updatedAt: string | null`
- `source: rule-based | manual-reset`

首版约束：

- 规则驱动生成，不新增额外模型调用
- 摘要最长 120 个字符
- 新会话时重置
- 当最近若干轮无法稳定提炼目标时，允许为空字符串

示例：

- 用户正在收集杨幂相关资料
- 用户正在对比多个访谈页面
- 用户希望整理本次新加书签的要点

## Reference Resolution

新增会话级引用解析层，用于处理：

- 这个书签
- 这些书签
- 刚加的几个
- 上一个结果
- 继续总结

解析优先级固定为：

1. 当前显式选中的 bookmark / 当前页面
2. `workingSetBookmarkIds[]`
3. `bookmarksAddedInSession[]`
4. 最近一轮 retrieval 命中结果
5. 全量书签库检索

说明：

- 该优先级必须在 design 与 implementation 中保持一致
- 首版只做显式短语匹配，不做复杂自然语言指代消解
- 无法解析时允许回退到普通 retrieval，并给用户轻提示

## Runtime Behavior

### New Session

用户选择新建会话时：

- 创建新的 `sessionId`
- 清空旧会话的 messages、working set、新增书签事件和 intent memory
- 新会话成为 active session

### Continue Session

用户继续会话时恢复：

- 最近消息
- 当前 working set
- 会话内新增书签事件
- 当前 intent memory

### Submit Query

Ghostreader 提问链路调整为：

1. 读取 active session
2. 判定 query mode（`current-only` / `cross-bookmark`）
3. 执行会话内引用解析
4. 合并当前页面 / 当前 bookmark / working set / 新增书签事件
5. 仅在必要时执行全量 hybrid retrieval
6. 生成回答
7. 将 user / assistant message、命中书签、working set 变化与 intent memory 更新写回 session

### Add Bookmark During Session

当用户在会话期间新增书签时：

1. 记录一条 system event message
2. 写入 `bookmarksAddedInSession[]`
3. 同步加入 `workingSetBookmarkIds[]`
4. 让这些书签可立即参与后续问答

首版允许只支持“能拿到明确新增 bookmark 信息”的场景；复杂 diff 推断可以后置。

## Prompt Construction

`buildGhostreaderContent(...)` 扩展为支持注入：

- 最近 3 轮必要消息摘要
- `intentMemory.summary`
- 当前最相关的少量 working set bookmark 摘要
- 最近新增书签事件摘要

硬性约束：

- 不直接注入完整长历史
- working set 注入上限建议为 5 个 bookmark
- 最近消息注入上限建议为 6 条 message
- 超长时优先裁剪旧消息，再裁剪低优先级 working set

## Storage Design

首版继续使用本地扩展存储，新增：

- `activeGhostreaderSessionId`
- `ghostreaderSessions`
- `ghostreaderSessionsVersion`

设计要求：

- session store 只存结构化元数据，不存正文大块内容
- 最多保留最近 20 个 session
- 单个 session 最多保留最近 30 条 message
- 读取到旧格式或坏数据时，允许丢弃损坏项并回退到空 session

## Error Handling

### Session Store Failure

如果 session 读写失败：

- 回退到现有单轮 Ghostreader 模式
- 本次回答继续执行
- 最多提示一次“会话未保存”

### Reference Resolution Failure

如果“这个书签”“刚加的几个”等无法明确解析：

- 先按当前 bookmark 尝试
- 再按 working set 尝试
- 再回退普通 retrieval
- 必要时提示用户引用不明确

### Context Too Large

当会话过长时：

- 只保留最近 3 轮消息进入 prompt
- 保留当前 `intentMemory`
- 保留最多 5 个 working set bookmark
- 旧内容仅留在 session store，不再进入 prompt

## Components to Change

### New Modules

- `src/features/ghostreader-session/ghostreader-session-types.ts`
- `src/features/ghostreader-session/ghostreader-session-store.ts`
- `src/features/ghostreader-session/ghostreader-session-reducer.ts`
- `src/features/ghostreader-session/ghostreader-intent-memory.ts`
- `src/features/ghostreader-session/ghostreader-reference-resolution.ts`

### Existing Files

- `src/sidepanel.tsx`
- `src/features/dashboard/dashboard-ask-box.tsx`
- `src/features/hybrid-retrieval/ghostreader.ts`
- `src/features/hybrid-retrieval/query-intent.ts`
- 与 Ghostreader UI 入口相关的最小控制组件

## Test Plan

### Unit Tests

- `ghostreader-session-reducer.test.ts`
- `ghostreader-session-store.test.ts`
- `ghostreader-reference-resolution.test.ts`
- `ghostreader-intent-memory.test.ts`

### UI / Integration Tests

- `tests/ui/sidepanel-ghostreader.test.tsx`
- `tests/ui/dashboard-ask-box.test.tsx`
- `tests/ui/ghostreader-session-fallback.test.tsx`

核心覆盖场景：

1. 新建会话后旧上下文被清空
2. 继续会话后可追问上一轮结果
3. sidepanel 与 dashboard 共享相同 session 语义
4. “关于杨幂的书签有哪些”后再问“总结这个书签”能命中会话上下文
5. session store 出错时仍能退回单轮模式

## Phased Rollout

### Phase 1: Session Foundation

- session types / store / reducer
- active session 读取与创建
- sidepanel 最小接入

### Phase 2: Query-Time Session Context

- reference resolution
- prompt 注入最近消息 / intent / working set
- sidepanel 多轮追问打通

### Phase 3: Shared Surface Behavior

- dashboard 接入同一套 session 逻辑
- 明确当前 bookmark 作为高优先级上下文
- fallback 与裁剪策略落地

### Phase 4: Session Events And Controls

- 记录新增书签事件
- 最小“新会话 / 继续会话”UI
- 可选的 archive / reopen

## Summary

本设计通过引入轻量 Ghostreader session 层，解决以下关键问题：

- 支持新建 / 继续会话
- 支持多轮追问中的书签指代解析
- 支持记录并利用会话中新增的书签
- 支持维护短期会话目标摘要
- 在失败场景下仍能回退到当前单轮 Ghostreader 能力

该方案刻意避免一次性升级为完整聊天系统，而是在现有 hybrid retrieval 架构上增加一层可控、可裁剪、可降级的会话能力。
