# TabVault 手动测试指南 / Manual Testing Guide

适用对象：开发者自测 / 每次改动后的快速回归验证。
Target audience: Developers for self-testing and quick regression checks after changes.

---

## 0. 2-Minute Demo Path (2分钟演示路径)

1. 点击 TabVault 图标保存当前网页。 / Click TabVault icon to save current page.
2. 观察 AI 分析进度，直到显示摘要和标签。 / Watch AI analysis progress until summary and tags appear.
3. 关闭 Popup。 / Close Popup.
4. 打开 Ghostreader（侧边栏）。 / Open Ghostreader (sidepanel).
5. 提问寻找刚才保存的页面。 / Ask a question to find the page just saved.
6. 确认卡片出现，并能点击进入阅读或打开原始链接。 / Confirm result card appears, and can be clicked to read or open original link.

---

## 1. First User Walkthrough (新用户初次体验流程)

1. **安装 / Install**: 加载解包扩展后，首次点击图标。 / After loading unpacked extension, click icon for the first time.
2. **配置 / Configure**: 点击去设置页，配置 API Key，开启 Auto-analyze。 / Click to go to options page, configure API Key, enable Auto-analyze.
3. **首存 / First Save**: 随便打开一个长文网页，点击图标保存，等待分析完成。 / Open a long article, click icon to save, wait for analysis.
4. **伴读 / Companion**: 点击侧边栏入口，查看欢迎语。 / Click sidepanel entry, view welcome message.
5. **首问 / First Ask**: 询问关于刚保存网页的问题。 / Ask a question about the saved page.
6. **仪表盘 / Dashboard**: 打开 Dashboard 检查空状态是否消失，该书签是否可见。 / Open Dashboard to verify empty state is gone and the bookmark is visible.

---

## 2. 测试前准备 / Preparation

### 环境要求 / Requirements
- Node.js 已安装
- npm 可用
- Chrome 或 Edge 可加载开发者扩展

### 安装依赖 / Install
```bash
npm install
```

### 基础检查 / Basic Checks
先确认项目当前能正常通过基础验证：

```bash
npm exec vitest run
npm run typecheck
npm run build
```

预期：全部通过。

---

## 3. 启动项目 / Start

开发模式：

```bash
npm run dev
```

如果你只想加载构建产物：

```bash
npm run build
```

---

## 4. 加载扩展 / Load Extension

### 方式 A：加载构建产物
1. 打开 `chrome://extensions`
2. 打开 **Developer mode**
3. 点击 **Load unpacked**
4. 选择：

```text
build/chrome-mv3-prod
```

### 方式 B：如果你用 `npm run dev`
按 Plasmo dev 输出提示加载对应目录。

---

## 5. 核心手测路径 / Core Testing Paths

### 5.1 Popup 双状态验证

#### 用例 1：未收录态 (`popup-unsync`)
步骤：
1. 打开一个未保存过的网址
2. 点击扩展 popup

预期：
- 显示未收录状态卡片
- 主按钮为“收藏并深度分析”对应的保存动作
- 显示打开侧边栏 / 控制台入口

#### 用例 2：已收录态 (`popup-sync`)
步骤：
1. 先保存当前页面
2. 再次打开同一页面上的 popup

预期：
- 显示“In library / 已同步”状态
- 显示摘要与标签
- 主按钮切换为侧边栏伴读入口

---

### 5.2 设置页基础校验

#### 用例 1：enabled provider 缺少 API key
步骤：
1. 打开 Options
2. 启用某个 provider
3. 清空 `API key`

预期：
- 出现 `API key is required`
- Save 按钮禁用

#### 用例 2：enabled provider 缺少 model
步骤：
1. 启用某个 provider
2. 清空 `Model`

预期：
- 出现 `Model is required`
- Save 按钮禁用

#### 用例 3：OpenAI-compatible 缺少 Base URL
步骤：
1. 启用 OpenAI-compatible
2. 清空 `Base URL`

预期：
- 出现 `Base URL is required`
- Save 按钮禁用

#### 用例 4：OpenAI-compatible Base URL 非法
步骤：
1. 启用 OpenAI-compatible
2. 输入 `not-a-url`

预期：
- 出现 `Base URL must be a valid URL`
- Save 按钮禁用

#### 用例 5：default provider 指向 disabled provider
步骤：
1. 将 `defaultProvider` 设为 Claude 或 Gemini
2. 保持该 provider 为 disabled

预期：
- 出现 `Default provider must be enabled`
- Save 按钮禁用

#### 用例 6：disabled provider 空字段不阻塞保存
步骤：
1. 保持 Claude / Gemini 为 disabled
2. 清空它们的 `API key` 和 `Model`

预期：
- 不因为 disabled provider 的空值阻塞保存

---

### 5.3 保存设置

步骤：
1. 填写一组合法配置
2. 点击 **Save settings**
3. 关闭 Options 再重新打开

预期：
- 配置值被持久化
- 重新打开后数据仍然存在

---

### 5.4 保存当前页面

步骤：
1. 打开任意网页
2. 点击扩展 popup
3. 点击 **Save current page**

预期：
- 页面被保存
- popup 内状态更新
- 列表里出现新书签

---

### 5.5 搜索书签

步骤：
1. 先保存几条不同标题/内容的页面
2. 在 popup 搜索框中输入关键词

预期：
- 能按标题 / URL / tags / summary 命中结果

---

### 5.6 OpenAI-compatible 分析链路

步骤：
1. 在 Options 中启用 OpenAI-compatible
2. 配置：
   - 有效 `apiKey`
   - 有效 `model`
   - 有效 `baseUrl`
3. 设为 `defaultProvider`
4. 保存设置
5. 保存一个网页并触发分析

预期：
- 发起真实 `{baseUrl}/chat/completions` 请求
- 成功后得到 summary + tags
- popup 中能看到分析后的结果或状态变化

失败时预期：
- key 错误：出现鉴权相关失败提示
- 限流：出现 rate limit 类提示
- 返回不是合法 JSON：出现 bad model output 类错误

---

### 5.7 Claude 分析链路

步骤：
1. 在 Options 中启用 Claude
2. 配置有效 `apiKey` 与 `model`
3. 设为 `defaultProvider`
4. 保存设置
5. 保存网页并触发分析

预期：
- 走 Anthropic Messages API 请求
- 能返回 summary + tags
- 超时/网络失败时有错误反馈

---

### 5.8 Gemini 分析链路

步骤：
1. 在 Options 中启用 Gemini
2. 配置有效 `apiKey` 与 `model`
3. 设为 `defaultProvider`
4. 保存设置
5. 保存网页并触发分析

预期：
- 走 Gemini `generateContent` 请求
- 能返回 summary + tags
- safety block / timeout / network failure 时有错误反馈

---

### 5.9 autoAnalyzeOnSave

步骤：
1. 在 Options 中启用 `autoAnalyzeOnSave`
2. 选择一个已启用且配置正确的 `defaultProvider`
3. 保存设置
4. 回到网页，点击保存当前页面

预期：
- 保存后自动触发分析

对照用例：
1. 关闭 `autoAnalyzeOnSave`
2. 再次保存页面

预期：
- 只保存，不自动分析

---

### 5.10 Sidepanel / Ghostreader 验证

步骤：
1. 打开任意页面
2. 打开 sidepanel
3. 查看顶部当前页面上下文、欢迎卡片、底部输入框
4. 输入查询并提交

预期：
- 顶部显示 Ghostreader 头部与上下文
- 底部输入框始终存在
- 查询后显示 answer/result/action cards
- 试用态与过期态 banner 仍正常工作

---

### 5.11 Dashboard browse / bulk edit 验证

步骤：
1. 打开 dashboard
2. 验证左侧导航、中间结果列、右侧阅读区 / AI 侧栏
3. 点击任意结果

预期：
- 默认进入 browse 视图
- 选中书签后阅读区和右侧卡片更新
- 当前实现会进入 bulk edit 模式占位视图，显示“批量编辑工作台”

---

### 5.12 主题切换验证

步骤：
1. 在设置页切换主题
2. 打开 popup / options / sidepanel / dashboard

预期：
- 根节点 `data-theme` 正确变化
- 各页面颜色同步变化

---

## 6. Release Readiness Check (发布就绪检查)

专注产品化相关的检查：
- [ ] First-run clarity: 新手是否能清楚知道第一步该去设置 API key？
- [ ] Empty states: Popup, Sidepanel, Dashboard 的空状态是否对初次体验友好？
- [ ] Trust copy: 文案是否强调了“Local-First / 不上传服务器”？
- [ ] API Key guidance: 是否有基础的引导，说明去哪里获取 API key？

---

## 7. 常见问题排查 / Troubleshooting

### 7.1 Save 按钮一直不可点
优先检查：
- 是否存在校验错误
- `defaultProvider` 是否指向 disabled provider
- OpenAI `baseUrl` 是否非法

### 7.2 provider 分析没有结果
优先检查：
- provider 是否 enabled
- `defaultProvider` 是否正确
- API key / model 是否配置正确
- `autoAnalyzeOnSave` 是否开启

### 7.3 请求失败
优先检查：
- key 是否有效
- model 名称是否正确
- OpenAI-compatible `baseUrl` 是否正确
- provider 服务是否可访问

### 7.4 设置保存后没生效
优先检查：
- 是否显示 `Saved settings`
- 重新打开 Options 后值是否仍在
- popup 是否重新读取了最新配置

---

## 8. 快速回归清单 / Quick Regression Checklist

每次较大改动后，至少手测这几项：

- [ ] Options 页面可打开
- [ ] 设置能保存并重新加载
- [ ] 基础校验能阻止非法配置
- [ ] 保存当前页面成功
- [ ] 搜索书签正常
- [ ] OpenAI-compatible 分析正常
- [ ] Claude 分析正常
- [ ] Gemini 分析正常
- [ ] `autoAnalyzeOnSave` 开/关行为正确
- [ ] `npm exec vitest run` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过

