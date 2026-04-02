基于您提供的四张系统截图（TabVault的弹窗视图、包含文件夹树的书签列表与试用过期提示、AI Provider高级设置页、全屏书签Dashboard）以及我们之前关于功能和界面的深度讨论，以下是为该项目量身定制的完整项目说明、功能点说明和设计文档。

### 项目说明 (Project Description)

**项目名称:** TabVault **产品定位:** 一款以“隐私优先”和“本地计算”为核心的 AI 驱动型浏览器书签与个人知识管理（PKM）插件。 **核心愿景:** 解决传统书签管理器“收藏即遗忘”、“检索瘫痪”和“内容易丢失（死链）”的三大痛点 。TabVault 旨在通过大语言模型（LLM）的自动化处理、纯本地的向量语义检索以及现代化的极简 UI，将传统的网址收藏夹升级为高度结构化、可随时交互对话的“第二大脑”。

------

### 功能点说明 (Feature Specifications)

**1. 智能内容抓取与持久化归档 (Deep Web Clipping)**

- **痛点解决:** 解决截图四中仅保存 URL 带来的信息丢失风险。
- **功能描述:** 在用户点击保存时，插件自动剥离广告，提取网页纯净正文（DOM/Markdown）并生成本地快照。即使原网页（如微信公众号、小红书）被删除，本地内容依然永久可用 

**2. 自动化 AI 摘要与可编辑标签 (AI Summary & Smart Tags)**

- **痛点解决:** 减少人工整理的心智负担。
- **功能描述:** 后台静默调用 AI 生成高浓度的执行摘要和智能标签。为了弥补 AI 的不确定性，Dashboard 支持内联编辑（Inline Editing），允许用户随时手动修改摘要和增删标签。

**3. 端侧本地语义搜索 (Local-First Semantic Search)**

- **痛点解决:** 解决传统按文件夹（如截图二）或关键字搜索找不到内容的困境。
- **功能描述:** 引入 `transformers.js` 等 WebAssembly 技术，在浏览器本地运行轻量级 Embedding 模型（如 `bge-small-zh`），将网页转化为向量存储在 IndexedDB 中。支持用户通过描述“概念”来搜索书签，实现 100% 离线、零 API 成本和绝对的数据隐私 。

**4. 混合模型路由与自定义节点 (Hybrid LLM Routing & BYOK)**

- **痛点解决:** 截图三的设置页过于生硬且局限。
- **功能描述:** 允许用户“自带密钥（BYOK）”，支持自定义 OpenAI-compatible、Claude、Gemini 的 Base URL 和 Model ID。提供任务级智能路由：用极低成本的模型（如 DeepSeek）做后台摘要，用低延迟模型（如 OpenAI）做实时对话响应。

**5. 伴随式阅读助手 (Ghostreader)**

- **痛点解决:** 静态摘要无法满足长文深度阅读的需求。
- **功能描述:** 基于 Chrome Side Panel（侧边栏）API，提供一个持久存在的 AI 聊天窗口 。用户可以直接针对当前正在阅读的网页或已保存的书签向 AI 追问细节，实现交互式学习 

------

### 设计文档 (Design Document)

**1. 架构设计 (Architecture)**

- **平台:** 基于 Chrome Extension Manifest V3 规范。
- **通信:** 利用 Background Service Worker 处理高耗时的 AI API 请求和本地向量计算，防止阻塞页面 UI。
- **存储引擎:** `chrome.storage.sync` 用于跨设备同步用户设置和 API Key；IndexedDB 用于存储海量的本地网页快照数据和高维向量数据 。
