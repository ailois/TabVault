# TrialBanner 组件设计

**Date:** 2026-03-20
**Status:** Approved for planning
**Context:** TabVault 商业化 Task 13

---

## 1. 目标

为 TabVault 创建一个 `TrialBanner` 组件，用于在后续的 `Options` 或 `Sidepanel` 中展示当前试用状态。

组件需要：

- 展示 `trial` / `expired` 两种状态
- 展示外层已计算好的提示信息
- 提供一个 CTA 按钮
- 延续当前 TabVault 简洁、可信的产品风格

---

## 2. 非目标

本组件**不负责**以下事项：

- 不直接读取 `TrialState`
- 不内部计算剩余天数或剩余额度
- 不直接调用激活逻辑或路由跳转
- 不集成 `LicenseActivation`
- 不提供关闭、折叠、loading 或多按钮扩展行为

也就是说，`TrialBanner` 是一个纯展示层组件。

---

## 3. 组件定位

`TrialBanner` 默认设计为一个**紧凑横幅**，适合后续同时用于：

- `Options` 页面中的试用提示入口
- `Sidepanel` 中的状态提醒区域

因此它应优先满足：

- 横向结构清晰
- 信息密度克制
- 容易在窄容器中退化为纵向堆叠

---

## 4. Props 设计

建议接口如下：

```ts
type TrialBannerProps = {
  status: "trial" | "expired"
  title?: string
  message: string
  detail?: string
  ctaLabel: string
  onCtaClick?: () => void
}
```

### 说明

- `status`：控制语义样式和默认标题
- `title`：可选，允许外层覆盖默认标题
- `message`：主说明文案，必填
- `detail`：补充说明，例如剩余天数或剩余额度
- `ctaLabel`：按钮文案
- `onCtaClick`：CTA 点击回调；不传时按钮显示为禁用态

该设计保证组件只负责显示，而不耦合试用计算逻辑。

---

## 5. 展示结构

结构固定，不因状态改变布局：

### 左侧内容区
- 标题
- 主说明 `message`
- 可选补充 `detail`

### 右侧操作区
- 一个 CTA 按钮

整体为单层紧凑横幅，不扩展为信息卡片。

---

## 6. 状态文案策略

### `trial` 状态
- 默认标题：`Trial active`
- 语气：还有体验机会，鼓励尽早激活
- CTA 示例：`Activate now`

### `expired` 状态
- 默认标题：`Trial expired`
- 语气：新分析已受限，需要激活才能继续
- CTA 示例：`Unlock TabVault`

组件本身不写死这些 CTA，但通过 `status` 决定默认标题，并允许外层传入更具体的业务文案。

---

## 7. 样式方向

沿用当前 TabVault UI 语言：

- 使用现有 `theme`、`spacing`、`radius`
- 使用横向 banner 结构，而不是完整设置卡片
- 标题与正文层次清晰，但保持克制
- CTA 按钮体量适中，不做营销化强调

### 语义色方向
- `trial`：偏中性 + accent 提示
- `expired`：偏 warning / danger 语义，但保持产品化，不做强警报视觉

### 响应式行为
- 宽容器：左右布局
- 窄容器：自动改为纵向堆叠

---

## 8. 交互行为

- 如果传入 `onCtaClick`，CTA 按钮可点击
- 如果没有传入 `onCtaClick`，CTA 按钮仍渲染但为禁用态
- 组件不维护内部状态
- 组件不处理 loading / dismiss / secondary actions

这样可以让后续集成方决定点击后是打开激活区、跳转设置页，还是触发其他流程。

---

## 9. 测试范围

建议组件级测试覆盖：

1. `trial` 状态渲染默认标题和主文案
2. `expired` 状态渲染默认标题和主文案
3. 传入自定义 `title` 时覆盖默认标题
4. 传入 `detail` 时展示补充信息
5. 点击 CTA 时触发 `onCtaClick`
6. 未传 `onCtaClick` 时按钮为禁用态
7. 存在稳定 `data-testid` 和样式钩子
8. `trial` / `expired` 两态具备不同语义样式钩子

---

## 10. 推荐实现方式

实现建议保持最小复杂度：

- 单文件组件：`src/components/trial-banner.tsx`
- 只使用 props 渲染，不引入业务逻辑
- 使用 `useThemeContext` 获取主题色
- 使用 `spacing` / `radius` 保持与现有组件一致
- 为 banner 和按钮提供稳定的 `data-testid`

该方案适合当前 Task 13，并为后续的 `Options` 与 `Sidepanel` 集成保留清晰边界。
