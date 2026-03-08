# TabVault QA 回归清单

适用对象：发布前快速回归、自测收尾、阶段性验收。

目标：用最少时间确认 TabVault 当前 MVP 主链路没有回退。

---

## 1. 测试前准备

### 环境准备
- 已安装依赖
- 可运行 Chrome / Edge
- 可加载扩展开发者模式

### 基础命令
先确认基础验证正常：

```bash
npm exec vitest run
npm run typecheck
npm run build
```

预期：全部通过。

### 扩展准备
加载扩展：

1. 打开 `chrome://extensions`
2. 开启 **Developer mode**
3. 点击 **Load unpacked**
4. 选择 `build/chrome-mv3-prod` 或 dev 构建目录

---

## 2. 轻量回归主清单

## A. Options 页面可用性

- [ ] 能打开 Options 页面
- [ ] 页面能显示三类 provider：
  - [ ] OpenAI-compatible
  - [ ] Claude
  - [ ] Gemini
- [ ] 页面能显示 App settings
- [ ] 页面能显示 Save 按钮

---

## B. 设置校验

### OpenAI-compatible
- [ ] 启用 OpenAI-compatible 且清空 API key 时，出现错误提示
- [ ] 启用 OpenAI-compatible 且清空 model 时，出现错误提示
- [ ] 启用 OpenAI-compatible 且清空 baseUrl 时，出现错误提示
- [ ] 启用 OpenAI-compatible 且输入非法 baseUrl 时，出现错误提示

### Claude / Gemini
- [ ] 启用 Claude 且清空 API key 时，出现错误提示
- [ ] 启用 Claude 且清空 model 时，出现错误提示
- [ ] 启用 Gemini 且清空 API key 时，出现错误提示
- [ ] 启用 Gemini 且清空 model 时，出现错误提示

### Default provider
- [ ] `defaultProvider` 指向 disabled provider 时，出现 app-level 错误提示
- [ ] 存在校验错误时 Save 按钮禁用

### Disabled provider 规则
- [ ] disabled 的 Claude 空字段不阻塞保存
- [ ] disabled 的 Gemini 空字段不阻塞保存

---

## C. 设置持久化

- [ ] 合法配置下可以成功保存
- [ ] 保存中显示 `Saving...`
- [ ] 保存成功显示 `Saved settings`
- [ ] 重新打开 Options 后配置仍然存在
- [ ] 加载失败时显示 `Failed to load settings`

---

## D. Popup 基础能力

- [ ] popup 能正常打开
- [ ] `Save current page` 按钮可点击
- [ ] 成功保存当前页面后状态更新
- [ ] 新书签能出现在 popup 列表中

---

## E. 搜索能力

- [ ] 按标题搜索能命中
- [ ] 按 URL 关键词搜索能命中
- [ ] 按 summary / tags 搜索能命中（如果已有分析结果）

---

## F. OpenAI-compatible 分析链路

- [ ] OpenAI-compatible provider 已启用
- [ ] `defaultProvider = openai`
- [ ] 保存设置后可触发分析
- [ ] 分析成功后生成 summary + tags
- [ ] API key 错误时有失败反馈
- [ ] 非法模型输出时有 bad-model-output 类反馈

---

## G. Claude 分析链路

- [ ] Claude provider 已启用
- [ ] `defaultProvider = claude`
- [ ] 分析成功后生成 summary + tags
- [ ] timeout / abort 失败时有失败反馈
- [ ] 鉴权失败时有失败反馈

---

## H. Gemini 分析链路

- [ ] Gemini provider 已启用
- [ ] `defaultProvider = gemini`
- [ ] 分析成功后生成 summary + tags
- [ ] timeout / abort 失败时有失败反馈
- [ ] safety block 时有失败反馈

---

## I. Auto Analyze On Save

- [ ] 打开 `autoAnalyzeOnSave` 后，保存页面会自动分析
- [ ] 关闭 `autoAnalyzeOnSave` 后，保存页面不会自动分析

---

## 3. 高风险回归点

这些是当前版本最容易回退的点，建议每次发布前必测：

- [ ] 保存设置后重新打开 Options，值未丢失
- [ ] 校验错误时真的不能保存
- [ ] `defaultProvider` 切换后 popup 走的是对应 provider
- [ ] OpenAI-compatible 真实请求仍然正常
- [ ] Claude / Gemini timeout 改动没有把错误都吞成同一种错误
- [ ] disabled provider 不会错误地阻塞保存

---

## 4. 测试结果记录模板

可直接复制：

```md
## QA 回归结果

- 日期：
- 测试人：
- 版本/分支：

### 结果
- [ ] Options 页面
- [ ] 设置校验
- [ ] 设置持久化
- [ ] Popup 保存页面
- [ ] 搜索
- [ ] OpenAI-compatible 分析
- [ ] Claude 分析
- [ ] Gemini 分析
- [ ] Auto Analyze On Save

### 问题记录
1.
2.
3.

### 结论
- [ ] 可发布
- [ ] 需修复后复测
```

---

## 5. 当前清单定位

这份文档是：

- **轻量回归清单**
- 关注核心主链路
- 适合发布前快速确认没有明显回退

它不是完整测试用例库。

如果后面项目复杂度继续上升，再拆成：
- provider 回归清单
- settings 回归清单
- popup/search 回归清单
