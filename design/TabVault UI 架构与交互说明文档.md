# TabVault UI 架构与交互说明文档

## 🎨 全局设计规范 (Global Design System)

- **技术栈**：Tailwind CSS
- **设计风格**：无边框感 (Borderless)、柔和阴影 (Soft Shadows)、高级灰阶。
- **默认主题**：🌿 鼠尾草绿 (Sage Green)。
- **开发原则**：所有颜色必须使用 CSS 变量（如 `bg-surface`, `text-primary`, `accent-primary`）进行语义化绑定，以支持多套主题（如香草、海风蓝、暗黑模式）的无缝切换。

------

## 📂 页面说明与场景映射 (Page Definitions)

### 1. 扩展弹窗组 (Popup)

扩展弹窗是用户点击浏览器右上角插件图标时看到的第一界面，主打“轻量、快捷、情境感知”。

- 📄 **`popup-unsync.html` (未收录态)**
  - **核心职责**：引导用户将当前正在浏览的新网页加入知识库。
  - **关键特征**：包含一个带有虚线边框和微弱动画的“占位区 (Empty State)”，主按钮为高亮的「⭐ 收藏并深度分析」。
  - **触发场景**：当前网页的 URL 不在本地 IndexedDB 数据库中。
- 📄 **`popup-sync.html` (已收录态)**
  - **核心职责**：作为“AI 透视镜”，快速透出当前网页的核心价值，并提供伴读入口。
  - **关键特征**：显示“已同步至知识库”的徽章，直接展示该网页的 **AI 一句话摘要** 和 **智能标签**。主按钮变为「💬 在侧边栏向 AI 提问」。
  - **触发场景**：当前网页的 URL 已存在于本地数据库中。

### 2. 侧边栏伴读 (Sidepanel)

- 📄 **`sidepanel.html`**
  - **核心职责**：沉浸式的当前网页 AI 伴读助手 (Copilot)。
  - **关键特征**：极简布局。顶部有当前页面的上下文指示器，主体是占据绝大部分空间的对话流 (Chat History)，底部是合并了“对话”与“命令”的全能输入框。
  - **交互逻辑**：用户可以一边看长文，一边在这里让 AI 总结、翻译或解答关于当前网页的问题。

### 3. 主工作台组 (Dashboard)

Dashboard 是插件的“第二大脑”，承担知识的检索、阅读和批量管理。

- 📄 **`dashboard.html` (单选/浏览态)**
  - **核心职责**：全局搜索与单篇内容的深度消费。
  - **关键特征**：
    - **左侧**：导航树（全部分类、状态筛选、标签筛选）。
    - **中栏**：内容流，带有状态指示（分析成功、失败等）和搜索框 (`⌘ K`)。
    - **右侧 (Inspector)**：双 Tab 设计。一个是**「📝 资料与笔记」**（支持无缝 Inline 编辑摘要、标签和 Markdown 笔记）；另一个是**「✨ AI 伴读对话」**。
- 📄 **`dashboard-bulk-edit.html` (多选/批量态)**
  - **核心职责**：高效的数据批量维护工作台。
  - **关键特征**：
    - 中栏的列表项出现复选框 (`checkbox`)，顶部浮出“批量操作条”。
    - 右侧 Inspector 自动切换为**「批量编辑面板」**，提供批量追加/移除标签、批量重新分析、批量追加评论的表单。
  - **触发场景**：用户在中栏选中了 ≥1 个书签。

### 4. 设置中心组 (Settings)

采用双栏布局，左侧导航，右侧表单，负责插件的底层配置。

- 📄 **`settings.html` (架构配置)**
  - **核心职责**：配置大语言模型 (LLM) 和基础体验。
  - **关键特征**：
    - **Provider 配置**：包含 OpenAI Chat、OpenAI Response、Claude、Gemini 的可视化选项卡，并动态展示 API Key、Model、Base URL 输入框。
    - **体验配置**：6 套主题色 (Theme) 的可视化选择器、语言切换。
    - **自动化**：原生的 Tailwind Toggle 开关（保存时自动分析、分析失败时自动重试）。
- 📄 **`setting-knowledge.html` (知识库管理)**
  - **核心职责**：本地数据存储、索引策略与隐私管理。
  - **关键特征**：
    - 包含 IndexedDB 存储空间的进度条与导入/导出功能。
    - **Danger Zone (危险操作)**：使用高级警示色（柔和的砖红色）包裹的清空数据按钮。
    - **向量配置**：Embedding 模型选择、Chunk Size (分块大小) 设定。
    - **隐私黑名单**：忽略域名的文本配置域 (`textarea`)，防止涉密网站被自动读取。

------

## 🤖 给 Coding Agent 的开发建议

1. **组件化拆分**：这 8 个 HTML 文件中存在大量的重复代码（如左侧的侧边栏 `aside`，统一的 Header）。在迁移到 React/Vue 等框架时，请务必提取公共组件（如 `<Sidebar />`, `<ThemeSelector />`, `<ToggleSwitch />`）。
2. **路由逻辑**：
   - `dashboard.html` 和 `dashboard-bulk-edit.html` 应该是同一个页面的两种状态，通过状态管理器 (如 Redux/Zustand 或简单的 React State) 监听 `selectedItems.length` 来切换右侧的 Inspector 面板。
   - `popup-sync` 和 `popup-unsync` 同理，根据当前 Tab URL 查询数据库的结果进行条件渲染。
3. **无缝交互 (Inline Edit)**：`dashboard.html` 中的摘要和笔记使用了 `<textarea>` 的 `hover`/`focus` 伪类来实现。在绑定数据模型时，请使用 `onBlur` 事件自动保存数据到本地 IndexedDB，实现“无缝自动保存”的体验。