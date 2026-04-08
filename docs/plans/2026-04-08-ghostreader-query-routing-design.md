# Ghostreader Query Routing Design

**Date:** 2026-04-08

## Goal

让 Ghostreader 自动判断“当前书签问答”和“跨书签检索问答”两类场景，避免在只问当前书签时把无关书签展示出来并污染 LLM 上下文。

## Problem

当前 dashboard 和 sidepanel 的 Ghostreader 提交流程都会先执行一次全库 hybrid retrieval，然后：

- 把命中的 `saved-bookmark` 结果直接渲染到界面
- 把这些匹配结果一起拼进 `buildGhostreaderContent(...)`
- 在模型失败时再回退到本地检索答案

这会导致两个直接问题：

1. 用户问“帮我总结这个书签 / 提炼要点 / 解释当前内容”时，界面会先出现一串不相干书签，观感很差。
2. LLM 在回答当前书签问题时会吃到不相关书签上下文，答案准确性下降。

## Options

### Option A: 基于查询意图做本地路由（推荐）

新增一个轻量级 Ghostreader 查询模式判断：

- `current-only`: 只基于当前书签/当前页面回答
- `cross-bookmark`: 允许跨书签检索并展示结果

优点：

- 改动集中在现有 Ghostreader 提交链路
- 不增加额外模型调用
- 可以同时改善观感和答案准确性
- dashboard 与 sidepanel 都能复用

缺点：

- 需要补一层规则判定和测试
- 某些边界问题仍可能误判，但可以持续扩展规则

### Option B: 保留检索，但隐藏结果列表

优点：

- UI 更干净

缺点：

- 只是隐藏症状
- LLM 仍然会被不相关书签污染
- 准确性问题仍然存在

### Option C: 先让 LLM 决定是否检索

优点：

- 理论上最灵活

缺点：

- 增加一次模型调用和延迟
- 行为更不稳定
- 与当前本地优先检索链路不匹配

## Chosen Design

采用 Option A。

### Query Modes

新增 Ghostreader 查询模式：

- `current-only`
- `cross-bookmark`

### Routing Rules

先用轻量规则判断，不引入新的模型调用。

判为 `current-only` 的典型表达：

- “总结这个书签”
- “帮我概括这篇内容”
- “解释当前页面”
- “提炼要点 / 翻译这篇 / 这篇文章在讲什么”
- 包含“这个书签 / 这篇 / 当前页面 / 当前书签”等当前上下文指向词

判为 `cross-bookmark` 的典型表达：

- “关于杨幂的书签有哪些”
- “哪个网站提到 xxx”
- “我收藏里有哪些和 xxx 相关”
- “相关书签 / 哪些书签 / 对比这些书签”

### Runtime Behavior

#### `current-only`

- 不执行 `retrieveHybridResults(...)`
- 不渲染 saved bookmark result cards
- 不生成跨书签 action cards
- `buildGhostreaderContent(...)` 只注入当前书签/当前页面上下文
- citation 仅允许来自当前页面（或为空）

#### `cross-bookmark`

- 继续执行当前 hybrid retrieval
- 保留现有 fallback 行为
- 允许显示少量相关书签结果与 citation

## UI Expectations

### 当前书签问答

用户输入：

- “帮我总结这个书签的内容”

预期：

- 不出现一串 saved bookmark 命中列表
- 直接看到问句卡片 + 回答卡片
- 回答只基于当前书签内容

### 跨书签问答

用户输入：

- “关于杨幂的书签有哪些？”

预期：

- 仍然执行跨书签检索
- 只显示真正相关的命中书签
- fallback 本地答案仍然可用

## Components to Change

- `src/features/hybrid-retrieval/query-intent.ts`
- `src/features/hybrid-retrieval/ghostreader.ts`
- `src/sidepanel.tsx`
- `src/features/dashboard/dashboard-ask-box.tsx`
- `src/components/hybrid-query-stream.tsx`

## Test Plan

需要补以下回归：

1. 当前书签总结类问题应路由为 `current-only`
2. 当前书签总结类问题不应执行跨书签检索
3. 当前书签总结类问题不应渲染 saved bookmark 结果列表
4. 跨书签问题仍应保留检索能力
5. sidepanel 与 dashboard 共用同一套路由逻辑
