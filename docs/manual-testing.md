# TabVault 手动测试指南

适用对象：开发者自测 / 每次改动后的快速回归验证。

---

## 1. 测试前准备

### 环境要求
- Node.js 已安装
- npm 可用
- Chrome 或 Edge 可加载开发者扩展

### 安装依赖
```bash
npm install
```

### 基础检查
先确认项目当前能正常通过基础验证：

```bash
npm exec vitest run
npm run typecheck
npm run build
```

预期：全部通过。

---

## 2. 启动项目

开发模式：

```bash
npm run dev
```

如果你只想加载构建产物：

```bash
npm run build
```

---

## 3. 加载扩展

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

## 4. 首次配置

1. 打开扩展的 **Options** 页面
2. 配置：
   - `defaultProvider`
   - `autoAnalyzeOnSave`
   - provider 的 `enabled`
   - `apiKey`
   - `model`
   - OpenAI-compatible 的 `baseUrl`
3. 点击 **Save settings**

### 预期
- 未加载完成时显示 `Loading settings...`
- 保存中显示 `Saving...`
- 保存成功显示 `Saved settings`
- 配置非法时不能保存

---

## 5. 核心手测路径

## 5.1 设置页基础校验

### 用例 1：enabled provider 缺少 API key
步骤：
1. 打开 Options
2. 启用某个 provider
3. 清空 `API key`

预期：
- 出现 `API key is required`
- Save 按钮禁用

### 用例 2：enabled provider 缺少 model
步骤：
1. 启用某个 provider
2. 清空 `Model`

预期：
- 出现 `Model is required`
- Save 按钮禁用

### 用例 3：OpenAI-compatible 缺少 Base URL
步骤：
1. 启用 OpenAI-compatible
2. 清空 `Base URL`

预期：
- 出现 `Base URL is required`
- Save 按钮禁用

### 用例 4：OpenAI-compatible Base URL 非法
步骤：
1. 启用 OpenAI-compatible
2. 输入 `not-a-url`

预期：
- 出现 `Base URL must be a valid URL`
- Save 按钮禁用

### 用例 5：default provider 指向 disabled provider
步骤：
1. 将 `defaultProvider` 设为 Claude 或 Gemini
2. 保持该 provider 为 disabled

预期：
- 出现 `Default provider must be enabled`
- Save 按钮禁用

### 用例 6：disabled provider 空字段不阻塞保存
步骤：
1. 保持 Claude / Gemini 为 disabled
2. 清空它们的 `API key` 和 `Model`

预期：
- 不因为 disabled provider 的空值阻塞保存

---

## 5.2 保存设置

步骤：
1. 填写一组合法配置
2. 点击 **Save settings**
3. 关闭 Options 再重新打开

预期：
- 配置值被持久化
- 重新打开后数据仍然存在

---

## 5.3 保存当前页面

步骤：
1. 打开任意网页
2. 点击扩展 popup
3. 点击 **Save current page**

预期：
- 页面被保存
- popup 内状态更新
- 列表里出现新书签

---

## 5.4 搜索书签

步骤：
1. 先保存几条不同标题/内容的页面
2. 在 popup 搜索框中输入关键词

预期：
- 能按标题 / URL / tags / summary 命中结果

---

## 5.5 OpenAI-compatible 分析链路

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

## 5.6 Claude 分析链路

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

## 5.7 Gemini 分析链路

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

## 5.8 autoAnalyzeOnSave

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

## 6. 常见问题排查

## 6.1 Save 按钮一直不可点
优先检查：
- 是否存在校验错误
- `defaultProvider` 是否指向 disabled provider
- OpenAI `baseUrl` 是否非法

## 6.2 provider 分析没有结果
优先检查：
- provider 是否 enabled
- `defaultProvider` 是否正确
- API key / model 是否配置正确
- `autoAnalyzeOnSave` 是否开启

## 6.3 请求失败
优先检查：
- key 是否有效
- model 名称是否正确
- OpenAI-compatible `baseUrl` 是否正确
- provider 服务是否可访问

## 6.4 设置保存后没生效
优先检查：
- 是否显示 `Saved settings`
- 重新打开 Options 后值是否仍在
- popup 是否重新读取了最新配置

---

## 7. 快速回归清单

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

---

## 8. 当前手测重点

当前版本最值得优先盯的不是 UI 漂不漂亮，而是：

1. 配置是否正确持久化
2. provider 是否真的走对应网络请求路径
3. 校验是否阻止明显错误配置
4. 保存/分析链路是否稳定

这 4 件事跑通，说明当前 MVP 主链路基本健康。
