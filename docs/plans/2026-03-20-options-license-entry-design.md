# Options 激活入口设计

**Date:** 2026-03-20
**Status:** Approved for planning
**Context:** TabVault 商业化 Task 17

---

## 1. 目标

在 TabVault 的 `Options` 页面中接入已经完成的 `TrialBanner` 与 `LicenseActivation` 组件，把试用状态、过期状态和已激活状态展示到设置页顶部，并打通 License Key 验证与本地保存流程。

该任务的目标是让用户进入设置页时，能立即看到当前试用/激活状态，并在同一页面完成激活。

---

## 2. 非目标

本任务**不负责**以下事项：

- 不新增支付页或购买跳转流程
- 不实现 Sidepanel 集成（那是独立任务）
- 不引入后端服务或新的持久化结构
- 不修改 `TrialBanner` / `LicenseActivation` 的核心职责边界
- 不扩展为完整 billing center

---

## 3. 页面位置

集成位置为 `Options` 页面 `Settings` 视图顶部。

布局顺序：

1. `Settings` 页标题与说明
2. **Trial / License 状态区**
3. 现有 `SettingsTabContent`

这样用户一进入设置页，就能先看到当前是否仍在试用、是否已过期、是否已激活，然后再配置 provider 和其它设置。

---

## 4. 状态区结构

状态区采用**统一容器**，根据 `useTrialStatus()` 的结果切换内容：

### `trial`
- 显示 `TrialBanner`
- CTA 点击后展开或显示 `LicenseActivation` 输入态

### `expired`
- 显示 `TrialBanner`
- CTA 点击后展开或显示 `LicenseActivation` 输入态

### `licensed`
- 直接显示已激活态的 `LicenseActivation`
- 不再显示 `TrialBanner`

状态区本身不拆成多个页面，也不使用弹窗。

---

## 5. 数据流与职责分层

### `Options` 页负责
- 调用 `useTrialStatus()` 获取 `status` / `state` / `reload`
- 管理激活区展开状态
- 管理 `licenseKey` 输入值
- 管理提交中状态 `isSubmitting`
- 管理错误文案 `errorMessage`
- 调用 `validateLicenseKey`
- 调用 `TrialRepository` 保存验证结果
- 成功后调用 `reload()` 刷新 trial 状态

### `TrialBanner` 负责
- 只展示 `trial` / `expired` 状态提示
- 通过 `onCtaClick` 触发展开激活区

### `LicenseActivation` 负责
- 只处理输入态、成功态、错误态、提交态的 UI
- 通过 props 与 `Options` 页交互

### `TrialRepository` 负责
- 保存：
  - `licenseKey`
  - `licenseStatus`
  - `licenseValidatedAt`
- 保留已有的 `installedAt` / `analysisUsed`

这种分层保证：UI 组件继续保持纯展示职责，业务逻辑集中在 `Options` 集成层。

---

## 6. 激活提交流程

### 进入页面
- `useTrialStatus()` 加载当前状态
- 若为 `trial` / `expired`：先显示 `TrialBanner`
- 若为 `licensed`：直接显示已激活态 `LicenseActivation`

### 点击 `TrialBanner` CTA
- 不跳页
- 不打开弹窗
- 直接在当前状态区显示 `LicenseActivation` 输入态

### 提交 License Key
`Options` 集成层执行以下逻辑：

1. 清空旧错误
2. 设置 `isSubmitting = true`
3. 调用 `validateLicenseKey(licenseKey)`
4. 根据结果处理：
   - `valid`
     - 使用 `TrialRepository` 读取现有 state
     - 覆盖保存：
       - `licenseKey`
       - `licenseStatus: "valid"`
       - `licenseValidatedAt: new Date().toISOString()`
     - 调用 `reload()`
     - 回到已激活态视图
   - `invalid`
     - 不清空输入框
     - 显示无效 key 错误文案
   - `unvalidated`
     - 不清空输入框
     - 显示“暂时无法验证，请稍后重试”类错误文案
5. `finally` 中设置 `isSubmitting = false`

### 点击 `Change license key`
- 不立即清除已保存状态
- 只切换到编辑态
- 用户重新提交成功后覆盖旧值

---

## 7. Banner 文案策略

`Options` 页负责组装 `TrialBanner` 文案，而不是让组件自己推导。

### `trial` 示例
- `title`: 可省略，使用默认 `Trial active`
- `message`: `Try TabVault free for 3 days.`
- `detail`: 例如 `2 days left · 17 analyses remaining`
- `ctaLabel`: `Activate now`

### `expired` 示例
- `title`: 可省略，使用默认 `Trial expired`
- `message`: `New AI analysis is locked until you activate TabVault.`
- `detail`: 可选，例如 `Your saved analysis stays available.`
- `ctaLabel`: `Unlock TabVault`

剩余天数与剩余额度由 `Options` 集成层基于 `state` 计算后传给 banner。

---

## 8. 错误处理

错误文案统一在 `Options` 集成层映射：

- `invalid` → `This license key is invalid.`
- `unvalidated` → `Could not validate right now. Try again shortly.`
- repository 或意外异常 → `Failed to save license state.` 或通用错误文案

错误展示位置：
- 由 `LicenseActivation` 组件负责显示
- 顶部状态区不额外重复错误 banner

---

## 9. 测试范围

本任务应以 `Options` 页集成测试为主，避免重复测试子组件内部逻辑。

建议覆盖：

1. `trial` 状态时，`Settings` 页标题下显示 `TrialBanner`
2. `expired` 状态时，显示 `TrialBanner`
3. 点击 banner CTA 后，显示 `LicenseActivation` 输入态
4. `licensed` 状态时，直接显示已激活态视图
5. 提交有效 key 时：
   - 调用 `validateLicenseKey`
   - 保存到 `TrialRepository`
   - 调用 `reload`
   - 页面切到已激活态
6. 提交无效 key 时：
   - 显示错误文案
   - 不清空输入
7. 提交网络失败时：
   - 显示“稍后再试”类错误文案
8. 不影响现有 `SettingsTabContent` 的渲染与保存逻辑

---

## 10. 推荐实现方式

实现时建议：

- 仍在 `src/options.tsx` 内完成主集成逻辑
- 如有必要，只抽一个极小的状态区子组件，但优先避免过度拆分
- 使用现有 `useTrialStatus`、`TrialRepository`、`validateLicenseKey`
- 保持 `TrialBanner` 和 `LicenseActivation` 为纯 UI 组件
- 保持实现最小化，不添加额外 abstraction

该方案最符合当前商业化路线：先把 Options 设置页做成完整、可信的激活入口，再继续推进 Sidepanel 与搜索 Aha moment 集成。
