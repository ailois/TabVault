# Side Panel Hybrid Retrieval Design

## Goal

将 TabVault 第一阶段主线重启为一个以 Side Panel 为主入口的本地优先知识检索闭环。用户在一个统一输入框中即可同时检索当前页面与已保存书签，并在同一结果流中完成搜索、选择、追问与引用式回答。

## Context

当前项目已经具备以下基础：

- `src/popup.tsx` 提供保存当前页与打开侧边栏入口
- `src/sidepanel.tsx` 已经承载书签列表、搜索、分析与详情抽屉
- `src/features/bookmarks/save-current-page.ts` 已支持保存当前页正文
- `src/lib/extraction/extract-page.ts` 已支持抽取页面纯文本
- `src/types/bookmark.ts` 中 `BookmarkRecord` 已包含 `summary`、`aiTags`、`userTags`、`extractedText`
- `src/lib/storage/db.ts` 已有 IndexedDB `bookmarks` store
- `src/features/bookmarks/search-bookmarks.ts` 当前仅提供简单 `includes` 检索与命中原因

与此同时，`design/sidepanel.html`、`design/dashboard.html`、`design/settings.html`、`design/project_description.md` 与 `design/improve.md` 明确给出了新的产品方向：TabVault 不再只是“保存后生成 AI 摘要的书签工具”，而应升级为“本地优先、可检索、可追问、可沉淀的个人知识助手”。

## Product Decision

第一阶段聚焦“智能检索闭环”，并采用以下边界：

- 主入口：Side Panel
- 模式：命令面板式混合流，而不是搜索区 / 聊天区上下分栏
- 检索范围：当前页面 + 已保存书签
- 技术原则：尽量纯本地
- 交互原则：单输入框、单结果流、弱自动判断、强可见反馈

## Chosen Approach

采用“统一输入 + 连续结果流 + 动作卡 + 引用式回答”的 Side Panel 方案。

### 为什么采用这一方案

1. 与用户确认的方向一致：产品、界面、技术三块一起重启，但第一阶段先交付智能检索闭环。
2. 与 `design/sidepanel.html` 最接近，能复用现有 Side Panel 入口和交互壳子。
3. 适合窄而长的侧边栏空间，不需要拆成割裂的搜索区和聊天区。
4. 允许先交付本地检索与引用式回答，再逐步增强为更强的本地 reranking 或本地问答。

## Alternatives Considered

### 方案 A：传统上下分区（搜索在上，对话在下）
优点：直观，容易理解。
缺点：心智割裂，Side Panel 空间被硬切两半，搜索与问答不能自然串联。

### 方案 B：命令面板式混合流（采用）
优点：一个输入动作即可触发搜索、建议动作和问答，流程连续，空间利用最好。
缺点：需要额外设计输入意图判断、动作卡与统一结果流。

### 方案 C：纯聊天流，检索只是回答前的内部步骤
优点：最像 Agent。
缺点：对“快速找书签”场景支持不足，结果可操作性不强。

## Architecture

### 1. UI Architecture

Side Panel 重组为三个层次：

1. 顶部上下文条
2. 中部连续结果流
3. 底部统一输入框

#### 顶部上下文条
用于持续显示本次查询会使用哪些上下文，而不是承载主要操作。

建议展示：

- 当前页面状态，例如 `Current page: React 19 并发渲染机制`
- 本地书签库状态，例如 `Library: 472 bookmarks indexed`
- 模式提示，例如 `Hybrid local search enabled`

#### 中部连续结果流
这是搜索与问答的统一工作区。一次输入后，同一条流里可以出现多种 block：

- Query block：展示用户输入
- Retrieval block：展示当前页命中、已保存书签命中、建议动作
- Action block：展示 `Ask current page`、`Ask top matches`、`Open bookmark`、`Open in dashboard`
- Answer block：展示回答及引用来源

重点是“分组但不断层”。用户看到的是一个连续工作流，而不是两个并列工具。

#### 底部统一输入框
整个面板只保留一个主输入框，统一承担三种动作：

- 搜索关键词
- 提自然语言问题
- 基于已有结果继续追问

输入意图不做强黑盒自动化，而是采用弱判断：

- 短关键词、术语：优先检索
- 问句、带动词的请求：优先检索后回答
- 判断不明确时：先给检索结果与建议动作卡

### 2. Data Architecture

#### 原始书签层
继续使用 `BookmarkRecord` 作为事实来源，不直接重构现有主数据模型。

保留的核心字段：

- `title`
- `url`
- `summary`
- `aiTags`
- `userTags`
- `extractedText`

#### 本地检索文档层
为每个书签派生一个内部 searchable document，用于本地排序与命中解释。建议字段：

- `bookmarkId`
- `title`
- `url`
- `summary`
- `tagsText`
- `bodyText`
- `combinedText`
- `updatedAt`

这一层先作为内部实现存在，不需要立即暴露给 UI 或用户设置。

#### 当前页临时文档层
当前页不直接写入书签库，而是在查询时被组装为一个临时文档：

- `sourceType = current-page`
- `title`
- `url`
- `bodyText`
- `capturedAt`

这样可以在 Side Panel 中把“当前正在看的页面”自然纳入检索，而不会污染正式书签数据。

### 3. Retrieval Architecture

第一阶段采用“增强版本地 lexical retrieval”，架构上预留向 BM25 演进的替换位。

#### Query Flow

1. 规范化 query
2. 拆分 token
3. 同时查询：
   - 当前页临时文档
   - 已保存书签检索文档
4. 对结果计算分数与命中原因
5. 合并为统一结果列表
6. 返回给 Side Panel 结果流

#### Ranking Rules

第一阶段推荐的权重优先级：

- 标题命中最高
- 标签命中次之
- 摘要命中再次之
- 正文命中作为扩展召回
- URL 命中最低
- 当前页面在强相关时给予适度 boost

#### Match Reasons

结果必须返回“为什么命中”，至少覆盖：

- title
- tag
- summary
- extracted text
- current page

这既是用户可见解释，也是后续问答链路的引用依据。

### 4. Answering Architecture

问答不是独立系统，而是建立在检索之上的第二步。

#### Question Flow

1. 用户输入问题
2. 先走统一召回
3. 选择 top N 候选（例如 3-5 条）
4. 将当前页片段、书签摘要、正文截断组装为上下文
5. 生成回答
6. 回答附带引用来源

#### 第一阶段能力分级

为了满足“尽量纯本地”，第一阶段问答能力按两级设计：

- **Level 1 必做：** 本地检索 + 引用式解释 / 汇总，不强依赖外部模型
- **Level 2 可选：** 接可配置 provider 或本地模型生成更自然的回答

这样即使没有成熟的本地生成能力，也能先交付“找到 + 给出处 + 支持继续追问”的主闭环。

## MVP Scope

### 必做

1. Side Panel 命令面板式混合流
2. 当前页临时上下文接入
3. 已保存书签的本地增强检索
4. 命中原因展示
5. 建议动作卡
6. 引用式回答块

### 延后

1. 真正重量级本地 reranker
2. 全量 embeddings / 向量库
3. 复杂 Dashboard 重构
4. 完整 Architecture Settings 页面
5. 空间 / 文件夹体系重构
6. 主题模板导入
7. 跨设备同步
8. 知识图谱

## Testing Strategy

### Unit Tests

优先覆盖纯逻辑：

- query 归一化
- 输入意图判断
- 当前页 + 已保存书签统一召回
- 字段权重排序
- 命中原因生成
- 回答上下文组装

### Component Tests

围绕 Side Panel 新交互验证：

- 输入关键词时展示结果流
- 输入问句时展示检索 + 回答链
- 动作卡点击后进入相应路径
- 回答块展示引用来源

### Repository / Storage Tests

覆盖：

- 从 `BookmarkRecord` 派生检索文档
- 书签更新后索引同步
- 当前页临时文档不污染正式存储

### Regression Tests

确保现有能力不被破坏：

- 保存当前页
- 现有 AI 分析流程
- Popup 打开 Side Panel
- 书签列表与详情抽屉

## Expected UX Outcome

第一阶段完成后，用户能在 Side Panel 中完成这样一个完整闭环：

1. 打开 Side Panel
2. 输入关键词或问题
3. 系统同时查询当前页与已保存书签
4. 同一结果流中返回命中结果、命中原因和建议动作
5. 用户直接查看、继续追问或跳转 dashboard
6. 回答总是附带引用来源

这会把 TabVault 的核心定位从“有 AI 摘要的书签工具”重启为“以 Side Panel 为主入口、以本地混合检索为核心的知识检索助手”。

## Implementation Notes

- 第一阶段回答块是本地检索驱动的引用式解释，不是完整 LLM 对话系统。
- 当前页只作为 ephemeral context 使用，不会自动写入 bookmark store。
- 旧的 BookmarkTree 视图在 searchQuery 为空时保留，降低迁移风险。
