# LicenseActivation 组件设计

**Date:** 2026-03-20
**Status:** Approved for planning
**Context:** TabVault 商业化 Task 7

---

## 1. 目标

为 TabVault 创建一个用于 `Options` 页面主入口的 `LicenseActivation` 组件，用于：

- 输入 License Key
- 触发激活验证
- 展示加载、失败、成功状态
- 在激活成功后切换为已激活视图

该组件需要保持简洁、可信、适合浏览器扩展设置页，并与现有 TabVault UI 风格一致。

---

## 2. 非目标

本组件**不负责**以下事项：

- 不直接调用 `TrialRepository` 进行持久化
- 不直接依赖 LemonSqueezy API 或 `license-service`
- 不包含购买入口、营销文案、权益列表或订阅说明
- 不扩展为完整计费中心

这些逻辑放在外层集成层处理，组件只负责 UI 和交互。

---

## 3. 放置位置

默认集成位置为 `Options` 页面。

原因：

- 激活流程更适合在完整设置页中完成
- 可以容纳输入、反馈和已激活状态
- 后续若要复用到 `Sidepanel`，可以基于同一组件做更紧凑嵌入

---

## 4. 设计方案

最终采用：**Card + 表单 / 成功卡双态切换**。

### 未激活状态
显示内容：

- 标题：`Activate TabVault`
- 简短说明：一次激活即可解锁产品
- `License Key` 输入框
- 主按钮：`Activate`
- 状态反馈区：
  - 加载中：`Activating...`
  - 失败时显示错误提示

### 已激活状态
显示内容：

- 状态标题：`Activated`
- 简短说明：license 已激活，可继续使用
- masked key，例如：`LSKEY-****-****-1234`
- 次按钮：`Change license key`

点击 `Change license key` 后，组件回到编辑输入状态。

---

## 5. 组件职责边界

`LicenseActivation` 采用受控组件思路。

组件负责：

- 渲染 UI
- 处理轻量本地 UI 状态（例如是否处于编辑模式）
- 触发外层回调
- 展示外层传入的提交状态与错误信息

外层负责：

- 调用 `validateLicenseKey`
- 映射业务错误文案
- 保存 `licenseKey` / `licenseStatus` / `licenseValidatedAt`
- 刷新 trial 状态

这样可以让组件保持简单、可测试，并避免把业务逻辑绑死在 UI 内部。

---

## 6. Props 设计

建议接口：

```ts
type LicenseActivationProps = {
  licenseKey: string
  isLicensed: boolean
  isSubmitting?: boolean
  errorMessage?: string | null
  onLicenseKeyChange: (value: string) => void
  onSubmit: () => void | Promise<void>
  onEdit?: () => void
}
```

### 说明

- `licenseKey`：当前输入值或当前已激活 key
- `isLicensed`：是否已激活，用于切换成功态
- `isSubmitting`：外层验证过程中置为 `true`
- `errorMessage`：外层传入的错误文案
- `onLicenseKeyChange`：输入变化回调
- `onSubmit`：点击激活时触发
- `onEdit`：点击更换 key 时触发，可供外层清理错误或重置状态

---

## 7. 状态流

### 初始未激活
- 显示输入态
- 用户输入 License Key
- 点击 `Activate`

### 提交中
- 输入框禁用
- 按钮禁用
- 按钮文案显示 `Activating...`
- 清理旧错误由外层决定，组件只负责展示最新状态

### 激活失败
- 保持输入态
- 显示错误文案
- 不清空输入框，方便用户修改重试

### 激活成功
- 外层更新 `isLicensed = true`
- 组件切换为成功态
- 成功态显示 masked key

### 更换 License Key
- 用户点击 `Change license key`
- 组件切回编辑态
- 触发 `onEdit`

---

## 8. 交互细节

- 当输入为空或仅空白时，`Activate` 按钮禁用
- 当 `isSubmitting = true` 时，输入框和按钮都禁用
- 成功态下不显示错误区
- 失败态不清空输入内容
- 错误文案由外层统一映射，例如：
  - `invalid` → `This license key is invalid.`
  - `unvalidated` → `Could not validate right now. Try again shortly.`

---

## 9. 样式方向

延续现有 `Options` 页面风格，不新增独立视觉系统：

- 使用现有 `theme`、`spacing`、`radius`
- 使用设置页一致的卡片容器样式
- 成功态使用克制的 success 色彩和边框
- 错误提示沿用现有错误语义，但更紧凑
- 整体应像“设置中的激活模块”，而不是营销页面

设计目标是：**可信、稳定、产品化，而非促销化**。

---

## 10. 测试范围

建议组件级测试覆盖以下行为：

1. 未激活时渲染输入框和 `Activate` 按钮
2. 输入为空时按钮禁用
3. 提交中显示 `Activating...`
4. 有错误时展示错误文案
5. 已激活时显示成功态和 masked key
6. 点击 `Change license key` 后回到编辑态
7. 点击 `Activate` 时触发 `onSubmit`

---

## 11. 推荐实现方式

实现时保持最小复杂度：

- 单文件组件 `src/components/license-activation.tsx`
- 一个小型本地 UI 状态用于切换编辑态/已激活态
- 外层 `Options` 页面后续负责接入 `useTrialStatus`、`TrialRepository` 和 `license-service`

该方案足以满足当前商业化计划中的 Task 7，并为后续 `Options` 集成保留清晰边界。
