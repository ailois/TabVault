# SidePanel 试用状态集成设计

**Date:** 2026-03-20
**Status:** Approved for planning
**Context:** TabVault 商业化 Task 15

---

## 1. 目标

在 TabVault 的 `SidePanel` 中接入试用/License 状态提示，让用户在使用主搜索/书签侧栏时也能看到当前试用状态，并能在 SidePanel 内就地完成 License Key 激活。

该任务复用已经完成的组件与服务：`TrialBanner`、`LicenseActivation`、`useTrialStatus`、`validateLicenseKey`、`TrialRepository`。

---

## 2. 非目标

- 不新增 trial 计算逻辑
- 不修改 `TrialBanner` / `LicenseActivation` 的核心职责
- 不实现购买跳转
- 不持久化"用户主动关闭 banner"的状态
- 不修改现有搜索、书签列表或书签 drawer 功能

---

## 3. 布局结构

状态区新增于搜索框正下方：

```
[ 标题区 + 主题切换 ]
[ 搜索框 ]
[ Trial / License 状态区 ]  ← 新增
[ 书签列表 / 搜索结果 ]
```

渲染规则：

- `trial`：显示 `TrialBanner`，点击 CTA 后展开 `LicenseActivation` 输入态
- `expired`：显示 `TrialBanner`，点击 CTA 后展开 `LicenseActivation` 输入态
- `licensed`：不渲染任何状态区
- `null`（加载中）：不渲染

激活成功后，状态区自动消失（因为 `trial.status` 变成 `"licensed"` 后整个区域不再渲染）。

---

## 4. 数据流与职责分层

### `SidePanel` 集成层负责

- 调用 `useTrialStatus()` 获取 `status / state / reload`
- 管理 `isActivationExpanded`（是否展开激活区）
- 管理 `licenseKeyInput`（输入值）
- 管理 `isSubmittingLicense`（提交中状态）
- 管理 `licenseError`（错误文案）
- 调用 `validateLicenseKey`
- 调用 `TrialRepository` 保存验证结果
- 成功后调用 `reload()` 刷新 trial 状态

### `TrialBanner` 负责

- 只展示 `trial` / `expired` 提示文案
- 通过 `onCtaClick` 触发展开激活区

### `LicenseActivation` 负责

- 只处理输入态、提交态、错误态的 UI
- 通过 props 与 `SidePanel` 集成层交互

激活成功后，`trial.status` 变成 `"licensed"`，状态区整个不渲染，不需要处理任何"关闭"状态。

---

## 5. 激活提交流程

与 `Options` 集成完全对称：

1. 清空旧错误
2. 设置 `isSubmittingLicense = true`
3. 调用 `validateLicenseKey(licenseKeyInput)`
4. 根据结果处理：
   - `valid`：
     - 读取当前 `TrialState`
     - 覆盖保存 `licenseKey / licenseStatus / licenseValidatedAt`
     - 调用 `reload()`
   - `invalid`：显示 `This license key is invalid.`
   - `unvalidated`：显示 `Could not validate right now. Try again shortly.`
   - 保存失败：显示 `Failed to save license state.`
5. `finally` 设置 `isSubmittingLicense = false`

---

## 6. Banner 文案策略

`SidePanel` 集成层组装文案，与 `Options` 保持一致：

### `trial`
- `message`: `Try TabVault free for 3 days.`
- `ctaLabel`: `Activate now`

### `expired`
- `message`: `New AI analysis is locked until you activate TabVault.`
- `ctaLabel`: `Unlock TabVault`

`detail` 可选。`SidePanel` 空间较窄，可省略 `detail` 以保持紧凑。

---

## 7. 测试范围

以 `SidePanel` 集成测试为主，不重复测试子组件内部逻辑。

建议覆盖：

1. `trial` 状态时，搜索框下方显示 `TrialBanner`
2. `expired` 状态时，显示 `TrialBanner`
3. 点击 banner CTA 后，展开 `LicenseActivation` 输入态
4. `licensed` 状态时，不显示 trial/license 区域
5. 提交有效 key 时：
   - 调用 `validateLicenseKey`
   - 保存到 `TrialRepository`
   - 调用 `reload`
6. 提交无效 key 时，显示错误文案，不清空输入
7. 不影响现有 SidePanel 的搜索、书签列表等功能

---

## 8. 推荐实现方式

- 直接修改 `src/sidepanel.tsx`
- 使用现有 `useTrialStatus`、`TrialRepository`、`validateLicenseKey`
- 使用现有 `TrialBanner`、`LicenseActivation` 组件
- 不引入新的持久化结构或额外组件
- 保持实现最小化
