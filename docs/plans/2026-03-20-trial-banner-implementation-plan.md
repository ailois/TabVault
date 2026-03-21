# TrialBanner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 TabVault 添加一个纯展示型 `TrialBanner` 组件，用于后续在 `Options` 或 `Sidepanel` 中提示 `trial` / `expired` 状态。

**Architecture:** 组件采用纯 props 驱动的展示方案：外层传入 `status`、`message`、`detail`、`ctaLabel` 和点击回调，组件内部不读取 `TrialState`、不计算剩余信息、也不维护本地状态。样式沿用现有 `theme`、`spacing`、`radius`，通过稳定的 `data-testid` 与状态属性支持测试和后续集成。

**Tech Stack:** TypeScript, React 18, Vitest, jsdom, 现有 design tokens / theme context

---

## 重要背景

### 组件边界
- 只实现 `src/components/trial-banner.tsx`
- 只增加对应组件测试
- 不集成 `Options`
- 不集成 `Sidepanel`
- 不读取 `TrialState`
- 不内部计算剩余天数或剩余额度
- 不接入 `LicenseActivation`

### 已批准的组件接口
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

### 现有风格参考
- `src/components/license-activation.tsx`
- `src/components/error-banner.tsx`
- `src/components/provider-settings-form.tsx`
- `src/ui/design-tokens.ts`
- `src/ui/theme-context.tsx`
- `tests/ui/license-activation.test.tsx`
- `tests/ui/bookmark-card.test.tsx`

### 建议测试命令
```bash
npx vitest run tests/ui/trial-banner.test.tsx
npm run typecheck
```

---

## Task 1: 创建 TrialBanner 基础渲染

**Files:**
- Create: `src/components/trial-banner.tsx`
- Create: `tests/ui/trial-banner.test.tsx`

**Step 1: 写失败测试**

创建 `tests/ui/trial-banner.test.tsx`，先验证 `trial` 状态下会渲染默认标题、主文案和 CTA：

```tsx
// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TrialBanner } from "../../src/components/trial-banner"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("TrialBanner", () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount()
      })
    }

    container?.remove()
    container = null
    root = null
  })

  it("renders trial banner with default title and CTA", async () => {
    await renderTrialBanner({
      status: "trial",
      message: "You still have time to explore TabVault.",
      ctaLabel: "Activate now"
    })

    expect(container?.textContent).toContain("Trial active")
    expect(container?.textContent).toContain("You still have time to explore TabVault.")
    expect(getCtaButton()?.textContent).toBe("Activate now")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderTrialBanner(
  props: React.ComponentProps<typeof TrialBanner>
): Promise<void> {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<TrialBanner {...props} />)
  })
}

function getCtaButton(): HTMLButtonElement | null | undefined {
  return container?.querySelector("button")
}
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：FAIL，因为组件文件尚不存在。

**Step 3: 写最小实现**

创建 `src/components/trial-banner.tsx`，先实现最小可渲染版本：

```tsx
import React from "react"

export type TrialBannerProps = {
  status: "trial" | "expired"
  title?: string
  message: string
  detail?: string
  ctaLabel: string
  onCtaClick?: () => void
}

function getDefaultTitle(status: TrialBannerProps["status"]): string {
  return status === "trial" ? "Trial active" : "Trial expired"
}

export function TrialBanner({
  status,
  title,
  message,
  detail,
  ctaLabel,
  onCtaClick
}: TrialBannerProps) {
  return (
    <section>
      <h2>{title ?? getDefaultTitle(status)}</h2>
      <p>{message}</p>
      {detail ? <p>{detail}</p> : null}
      <button type="button" onClick={onCtaClick}>
        {ctaLabel}
      </button>
    </section>
  )
}

export default TrialBanner
```

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：PASS（1 test passed）。

**Step 5: Commit**

```bash
git add src/components/trial-banner.tsx tests/ui/trial-banner.test.tsx
git commit -m "feat(trial): add TrialBanner component shell"
```

---

## Task 2: 补齐状态标题、自定义标题和 detail 展示

**Files:**
- Modify: `tests/ui/trial-banner.test.tsx`
- Modify: `src/components/trial-banner.tsx`

**Step 1: 写失败测试**

在测试文件中追加 3 个用例：

```tsx
it("renders expired banner with default expired title", async () => {
  await renderTrialBanner({
    status: "expired",
    message: "New AI analysis is now locked.",
    ctaLabel: "Unlock TabVault"
  })

  expect(container?.textContent).toContain("Trial expired")
  expect(container?.textContent).toContain("New AI analysis is now locked.")
})

it("prefers a custom title over the default status title", async () => {
  await renderTrialBanner({
    status: "trial",
    title: "2 days left",
    message: "Keep exploring your bookmark knowledge base.",
    ctaLabel: "Activate now"
  })

  expect(container?.textContent).toContain("2 days left")
  expect(container?.textContent).not.toContain("Trial active")
})

it("renders detail text when provided", async () => {
  await renderTrialBanner({
    status: "trial",
    message: "You still have trial access.",
    detail: "17 analyses remaining",
    ctaLabel: "Activate now"
  })

  expect(container?.textContent).toContain("17 analyses remaining")
})
```

**Step 2: 运行测试，确认失败或部分失败**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：如果最小实现还不完整，则 FAIL；如果已覆盖部分行为，也要确认新增用例驱动后续实现。

**Step 3: 写最小实现**

保证组件有清晰默认标题逻辑：

```tsx
function getDefaultTitle(status: TrialBannerProps["status"]): string {
  return status === "trial" ? "Trial active" : "Trial expired"
}
```

并在渲染时继续优先使用 `title ?? getDefaultTitle(status)`，`detail` 为可选段落。

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：PASS。

**Step 5: Commit**

```bash
git add src/components/trial-banner.tsx tests/ui/trial-banner.test.tsx
git commit -m "feat(trial): add TrialBanner content variants"
```

---

## Task 3: 实现 CTA 行为与禁用态

**Files:**
- Modify: `tests/ui/trial-banner.test.tsx`
- Modify: `src/components/trial-banner.tsx`

**Step 1: 写失败测试**

追加 CTA 行为测试：

```tsx
it("calls onCtaClick when the CTA button is clicked", async () => {
  const onCtaClick = vi.fn()
  await renderTrialBanner({
    status: "trial",
    message: "You still have trial access.",
    ctaLabel: "Activate now",
    onCtaClick
  })

  await act(async () => {
    getCtaButton()?.click()
  })

  expect(onCtaClick).toHaveBeenCalledTimes(1)
})

it("disables the CTA button when no click handler is provided", async () => {
  await renderTrialBanner({
    status: "expired",
    message: "Unlock to continue analyzing bookmarks.",
    ctaLabel: "Unlock TabVault"
  })

  expect(getCtaButton()?.disabled).toBe(true)
})
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：FAIL，因为按钮默认还未根据 `onCtaClick` 控制 `disabled`。

**Step 3: 写最小实现**

把按钮改为：

```tsx
<button
  disabled={!onCtaClick}
  onClick={onCtaClick}
  type="button"
>
  {ctaLabel}
</button>
```

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：PASS。

**Step 5: Commit**

```bash
git add src/components/trial-banner.tsx tests/ui/trial-banner.test.tsx
git commit -m "feat(trial): add TrialBanner CTA behavior"
```

---

## Task 4: 加入样式钩子与状态语义钩子

**Files:**
- Modify: `tests/ui/trial-banner.test.tsx`
- Modify: `src/components/trial-banner.tsx`

**Step 1: 写失败测试**

追加样式与状态钩子测试：

```tsx
it("renders the banner with a stable test id and styling hooks", async () => {
  await renderTrialBanner({
    status: "trial",
    message: "You still have trial access.",
    ctaLabel: "Activate now",
    onCtaClick: () => {}
  })

  const banner = container?.querySelector<HTMLElement>('[data-testid="trial-banner"]')

  expect(banner).not.toBeNull()
  expect(banner?.style.borderRadius).not.toBe("")
  expect(banner?.style.padding).not.toBe("")
})

it("adds a semantic state hook for the current trial status", async () => {
  await renderTrialBanner({
    status: "expired",
    message: "Unlock to continue analyzing bookmarks.",
    ctaLabel: "Unlock TabVault",
    onCtaClick: () => {}
  })

  const banner = container?.querySelector<HTMLElement>('[data-testid="trial-banner"]')

  expect(banner?.getAttribute("data-trial-status")).toBe("expired")
})
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：FAIL，因为 test id 和状态钩子还未实现。

**Step 3: 写最小实现**

引入现有样式系统：

```tsx
import { radius, spacing } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"
```

然后补上基础样式和语义钩子：

```tsx
const theme = useThemeContext()
const isExpired = status === "expired"

const bannerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.md,
  padding: spacing.md,
  borderRadius: radius.large,
  border: `1px solid ${isExpired ? theme.dangerSoft : theme.accentSoft}`,
  backgroundColor: isExpired ? theme.dangerSoft : theme.accentSoft
}
```

在根节点使用：

```tsx
<section
  data-testid="trial-banner"
  data-trial-status={status}
  style={bannerStyle}
>
```

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：PASS。

**Step 5: Commit**

```bash
git add src/components/trial-banner.tsx tests/ui/trial-banner.test.tsx
git commit -m "feat(trial): style TrialBanner component"
```

---

## Task 5: 完成横幅布局并做最终验证

**Files:**
- Modify: `src/components/trial-banner.tsx`
- Modify: `tests/ui/trial-banner.test.tsx`

**Step 1: 写失败测试**

补一个布局相关测试，确认 CTA 区域和 detail 文案可共存：

```tsx
it("renders content and CTA areas together in the banner layout", async () => {
  await renderTrialBanner({
    status: "trial",
    message: "You still have trial access.",
    detail: "2 days left · 17 analyses remaining",
    ctaLabel: "Activate now",
    onCtaClick: () => {}
  })

  const banner = container?.querySelector<HTMLElement>('[data-testid="trial-banner"]')
  const button = getCtaButton()

  expect(banner?.textContent).toContain("2 days left · 17 analyses remaining")
  expect(button).not.toBeNull()
})
```

**Step 2: 运行测试，确认失败或驱动布局补齐**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：若已有结构不足以支撑，可触发失败；否则用于验证最终布局行为。

**Step 3: 写最小实现**

把组件整理成横幅结构，推荐实现如下：

```tsx
const contentStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  minWidth: 0,
  flex: 1
}

const ctaStyle: React.CSSProperties = {
  padding: `${spacing.sm} ${spacing.md}`,
  borderRadius: radius.medium,
  border: "none",
  backgroundColor: theme.surface,
  color: theme.textPrimary,
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: onCtaClick ? "pointer" : "not-allowed"
}
```

推荐最终结构：

```tsx
<section data-testid="trial-banner" data-trial-status={status} style={bannerStyle}>
  <div style={contentStyle}>
    <h2>{resolvedTitle}</h2>
    <p>{message}</p>
    {detail ? <p>{detail}</p> : null}
  </div>
  <button data-testid="trial-banner-cta" disabled={!onCtaClick} onClick={onCtaClick} type="button">
    {ctaLabel}
  </button>
</section>
```

同时给标题和正文使用项目里一致的字号与颜色层次。

**Step 4: 运行组件测试**

运行：
```bash
npx vitest run tests/ui/trial-banner.test.tsx
```

预期：PASS。

**Step 5: 运行类型检查**

运行：
```bash
npm run typecheck
```

预期：PASS，无 TypeScript 错误。

**Step 6: Commit**

```bash
git add src/components/trial-banner.tsx tests/ui/trial-banner.test.tsx
git commit -m "feat(trial): finalize TrialBanner component"
```

---

## 完成定义

当以下条件全部满足时，此计划可视为完成：

- `src/components/trial-banner.tsx` 已创建
- `tests/ui/trial-banner.test.tsx` 已创建
- 组件支持：
  - `trial` / `expired` 两种状态
  - 默认标题逻辑
  - 自定义标题覆盖
  - 可选 `detail` 展示
  - 可点击 CTA
  - 无回调时 CTA 禁用
  - 稳定 `data-testid` 与 `data-trial-status`
- 组件不读取 `TrialState`，不包含试用计算逻辑
- `npx vitest run tests/ui/trial-banner.test.tsx` 通过
- `npm run typecheck` 通过

---

Plan complete and saved to `docs/plans/2026-03-20-trial-banner-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - 我在当前会话里逐任务执行，按实现 → 规格审查 → 代码质量审查推进

**2. Parallel Session (separate)** - 你开一个新会话，用 `executing-plans` 按批次执行

Which approach?
