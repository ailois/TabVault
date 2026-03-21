# LicenseActivation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 TabVault 添加一个仅负责 UI 与提交交互的 `LicenseActivation` 组件，用于在 `Options` 页面后续集成 License Key 激活流程。

**Architecture:** 组件采用受控设计：外层传入 `licenseKey`、`isLicensed`、`isSubmitting`、`errorMessage` 以及回调，组件内部只保留最小 UI 状态用于切换“已激活展示态”和“重新编辑态”。样式沿用现有 `theme`、`spacing`、`radius` 和组件风格，不在组件内引入存储、网络请求或营销内容。

**Tech Stack:** TypeScript, React 18, Vitest, jsdom, 现有 design tokens / theme context

---

## 重要背景

### 组件边界
- 只实现 `src/components/license-activation.tsx`
- 只增加对应组件测试
- 不接入 `Options` 页面
- 不调用 `TrialRepository`
- 不调用 `validateLicenseKey`
- 不做购买链接、权益列表、订阅说明

### 现有风格参考
- `src/components/provider-settings-form.tsx`
- `src/components/error-banner.tsx`
- `src/ui/design-tokens.ts`
- `src/ui/theme-context.tsx`
- `tests/ui/bookmark-card.test.tsx`
- `tests/ui/options.test.tsx`

### 建议测试命令
```bash
npx vitest run tests/ui/license-activation.test.tsx
npm run typecheck
```

---

## Task 1: 创建 LicenseActivation 基础渲染

**Files:**
- Create: `src/components/license-activation.tsx`
- Create: `tests/ui/license-activation.test.tsx`

**Step 1: 写失败测试**

创建 `tests/ui/license-activation.test.tsx`，先只写最小用例，验证未激活时渲染标题、输入框和按钮：

```tsx
// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { LicenseActivation } from "../../src/components/license-activation"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe("LicenseActivation", () => {
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

  it("renders the activation form when not licensed", async () => {
    await renderComponent()

    expect(container?.textContent).toContain("Activate TabVault")
    expect(container?.querySelector("input")).not.toBeNull()
    expect(getActivateButton()?.textContent).toBe("Activate")
  })
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderComponent() {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(
      <LicenseActivation
        errorMessage={null}
        isLicensed={false}
        licenseKey=""
        onLicenseKeyChange={() => {}}
        onSubmit={() => {}}
      />
    )
  })
}

function getActivateButton(): HTMLButtonElement | null | undefined {
  return container?.querySelector("button")
}
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
```

预期：FAIL，因为组件文件尚不存在。

**Step 3: 写最小实现**

创建 `src/components/license-activation.tsx`，先实现最小可渲染版本：

```tsx
import React from "react"

export type LicenseActivationProps = {
  licenseKey: string
  isLicensed: boolean
  isSubmitting?: boolean
  errorMessage?: string | null
  onLicenseKeyChange: (value: string) => void
  onSubmit: () => void | Promise<void>
  onEdit?: () => void
}

export function LicenseActivation({
  licenseKey,
  isLicensed,
  isSubmitting = false,
  errorMessage,
  onLicenseKeyChange,
  onSubmit,
  onEdit
}: LicenseActivationProps) {
  return (
    <section>
      <h2>Activate TabVault</h2>
      <p>Unlock TabVault with your license key.</p>
      <label htmlFor="license-key">License Key</label>
      <input
        id="license-key"
        type="text"
        value={licenseKey}
        onChange={(event) => onLicenseKeyChange(event.target.value)}
      />
      <button type="button" onClick={() => void onSubmit()}>
        Activate
      </button>
    </section>
  )
}
```

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
```

预期：PASS（1 test passed）。

**Step 5: Commit**

```bash
git add src/components/license-activation.tsx tests/ui/license-activation.test.tsx
git commit -m "feat(trial): add LicenseActivation component shell"
```

---

## Task 2: 实现输入、禁用态与提交中反馈

**Files:**
- Modify: `tests/ui/license-activation.test.tsx`
- Modify: `src/components/license-activation.tsx`

**Step 1: 写失败测试**

在 `tests/ui/license-activation.test.tsx` 追加 3 个用例：

```tsx
it("disables the activate button when the license key is blank", async () => {
  await renderComponent({ licenseKey: "   " })

  expect(getActivateButton()?.disabled).toBe(true)
})

it("calls onLicenseKeyChange when the input changes", async () => {
  const onLicenseKeyChange = vi.fn()
  await renderComponent({ onLicenseKeyChange })

  const input = getLicenseInput()

  await act(async () => {
    input!.value = "LSKEY-1234"
    input?.dispatchEvent(new Event("input", { bubbles: true }))
    input?.dispatchEvent(new Event("change", { bubbles: true }))
  })

  expect(onLicenseKeyChange).toHaveBeenCalledWith("LSKEY-1234")
})

it("shows submitting state and disables controls while submitting", async () => {
  await renderComponent({ licenseKey: "LSKEY-1234", isSubmitting: true })

  expect(getLicenseInput()?.disabled).toBe(true)
  expect(getActivateButton()?.disabled).toBe(true)
  expect(getActivateButton()?.textContent).toBe("Activating...")
})
```

把工具函数补充为：

```tsx
function getLicenseInput(): HTMLInputElement | null | undefined {
  return container?.querySelector("#license-key")
}
```

并让 `renderComponent` 支持覆盖 props：

```tsx
type RenderOverrides = Partial<React.ComponentProps<typeof LicenseActivation>>

async function renderComponent(overrides: RenderOverrides = {}) {
  const props: React.ComponentProps<typeof LicenseActivation> = {
    errorMessage: null,
    isLicensed: false,
    isSubmitting: false,
    licenseKey: "",
    onEdit: () => {},
    onLicenseKeyChange: () => {},
    onSubmit: () => {},
    ...overrides
  }

  // render props
}
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
```

预期：FAIL，因为按钮尚未根据空值禁用，提交中状态也未实现。

**Step 3: 写最小实现**

在组件中补充：

- `const isBlank = licenseKey.trim().length === 0`
- `const isActivateDisabled = isBlank || isSubmitting`
- 输入框在 `isSubmitting` 时禁用
- 按钮在 `isActivateDisabled` 时禁用
- 按钮文案在提交中显示 `Activating...`

示例实现：

```tsx
const isBlank = licenseKey.trim().length === 0
const isActivateDisabled = isBlank || isSubmitting

<input
  disabled={isSubmitting}
  id="license-key"
  type="text"
  value={licenseKey}
  onChange={(event) => onLicenseKeyChange(event.target.value)}
/>

<button disabled={isActivateDisabled} type="button" onClick={() => void onSubmit()}>
  {isSubmitting ? "Activating..." : "Activate"}
</button>
```

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
```

预期：PASS。

**Step 5: Commit**

```bash
git add src/components/license-activation.tsx tests/ui/license-activation.test.tsx
git commit -m "feat(trial): add LicenseActivation input and submit states"
```

---

## Task 3: 实现错误展示

**Files:**
- Modify: `tests/ui/license-activation.test.tsx`
- Modify: `src/components/license-activation.tsx`

**Step 1: 写失败测试**

追加失败展示测试：

```tsx
it("renders an error message when validation fails", async () => {
  await renderComponent({
    errorMessage: "This license key is invalid.",
    licenseKey: "LSKEY-BAD"
  })

  const error = container?.querySelector('[role="alert"]')

  expect(error?.textContent).toContain("This license key is invalid.")
})
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
```

预期：FAIL，因为错误区域尚未渲染。

**Step 3: 写最小实现**

优先复用现有 `ErrorBanner`：

```tsx
import { ErrorBanner } from "./error-banner"
```

在输入态按钮下方补充：

```tsx
{errorMessage ? <ErrorBanner message={errorMessage} /> : null}
```

注意：成功态不显示错误区。

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
```

预期：PASS。

**Step 5: Commit**

```bash
git add src/components/license-activation.tsx tests/ui/license-activation.test.tsx
git commit -m "feat(trial): show LicenseActivation validation errors"
```

---

## Task 4: 实现已激活成功态与更换 key 流程

**Files:**
- Modify: `tests/ui/license-activation.test.tsx`
- Modify: `src/components/license-activation.tsx`

**Step 1: 写失败测试**

追加成功态和切换编辑态测试：

```tsx
it("renders an activated state with the masked license key", async () => {
  await renderComponent({
    isLicensed: true,
    licenseKey: "LSKEY-ABCD-EFGH-1234"
  })

  expect(container?.textContent).toContain("Activated")
  expect(container?.textContent).toContain("1234")
  expect(container?.querySelector("input")).toBeNull()
  expect(container?.textContent).toContain("Change license key")
})

it("returns to edit mode when Change license key is clicked", async () => {
  const onEdit = vi.fn()
  await renderComponent({
    isLicensed: true,
    licenseKey: "LSKEY-ABCD-EFGH-1234",
    onEdit
  })

  const editButton = getButtonByText("Change license key")

  await act(async () => {
    editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })

  expect(onEdit).toHaveBeenCalled()
  expect(container?.querySelector("input")).not.toBeNull()
  expect(container?.textContent).toContain("Activate TabVault")
})
```

补充按钮查询工具：

```tsx
function getButtonByText(label: string): HTMLButtonElement | undefined {
  return Array.from(container?.querySelectorAll("button") ?? []).find(
    (button): button is HTMLButtonElement => button.textContent === label
  )
}
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
```

预期：FAIL，因为成功态和本地编辑态还未实现。

**Step 3: 写最小实现**

在组件内加入一个轻量 UI 状态，例如：

```tsx
const [isEditing, setIsEditing] = React.useState(false)
const shouldShowActivatedState = isLicensed && !isEditing
```

实现一个本地工具函数：

```tsx
function maskLicenseKey(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 4) {
    return trimmed
  }

  return `LSKEY-****-****-${trimmed.slice(-4)}`
}
```

成功态分支：

```tsx
if (shouldShowActivatedState) {
  return (
    <section>
      <h2>Activated</h2>
      <p>Your license is active and ready to use.</p>
      <p>{maskLicenseKey(licenseKey)}</p>
      <button
        type="button"
        onClick={() => {
          setIsEditing(true)
          onEdit?.()
        }}
      >
        Change license key
      </button>
    </section>
  )
}
```

输入态中不需要额外处理保存，只要在 `isLicensed=false` 或 `isEditing=true` 时显示表单即可。

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
```

预期：PASS。

**Step 5: Commit**

```bash
git add src/components/license-activation.tsx tests/ui/license-activation.test.tsx
git commit -m "feat(trial): add activated state for LicenseActivation"
```

---

## Task 5: 补齐提交回调、样式钩子与最终验证

**Files:**
- Modify: `tests/ui/license-activation.test.tsx`
- Modify: `src/components/license-activation.tsx`

**Step 1: 写失败测试**

追加交互和样式钩子测试：

```tsx
it("calls onSubmit when Activate is clicked", async () => {
  const onSubmit = vi.fn()
  await renderComponent({
    licenseKey: "LSKEY-1234",
    onSubmit
  })

  await act(async () => {
    getActivateButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })

  expect(onSubmit).toHaveBeenCalled()
})

it("renders the component with card-like styling hooks", async () => {
  await renderComponent({ licenseKey: "LSKEY-1234" })

  const card = container?.querySelector<HTMLElement>('[data-testid="license-activation-card"]')
  expect(card).not.toBeNull()
  expect(card?.style.borderRadius).toBeTruthy()
  expect(card?.style.padding).toBeTruthy()
})
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
```

预期：FAIL，因为尚未提供稳定的样式钩子，也可能尚未验证点击提交。

**Step 3: 写最小实现**

为组件补上与现有 UI 一致的基础样式：

- 引入 `radius`、`spacing`
- 引入 `useThemeContext`
- 外层卡片加 `data-testid="license-activation-card"`
- 使用 `theme.surface` / `theme.border` / `theme.textPrimary` / `theme.textMuted`
- 输入框与按钮样式尽量贴近 `provider-settings-form.tsx`

建议至少包含这些结构：

```tsx
const theme = useThemeContext()

const cardStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.md,
  padding: spacing.lg,
  border: `1px solid ${theme.border}`,
  borderRadius: radius.large,
  backgroundColor: theme.surface
}
```

并在渲染时：

```tsx
<section data-testid="license-activation-card" style={cardStyle}>
```

按钮点击保持：

```tsx
onClick={() => void onSubmit()}
```

**Step 4: 运行组件测试**

运行：
```bash
npx vitest run tests/ui/license-activation.test.tsx
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
git add src/components/license-activation.tsx tests/ui/license-activation.test.tsx
git commit -m "feat(trial): finalize LicenseActivation component"
```

---

## 完成定义

当以下条件全部满足时，此计划可视为完成：

- `src/components/license-activation.tsx` 已创建
- `tests/ui/license-activation.test.tsx` 已创建
- 组件支持：
  - 未激活输入态
  - 空输入禁用提交
  - 提交中禁用与文案变化
  - 错误提示展示
  - 已激活成功态
  - 点击 `Change license key` 返回编辑态
  - 点击 `Activate` 触发 `onSubmit`
- 样式与现有 `Options` 风格一致
- `npx vitest run tests/ui/license-activation.test.tsx` 通过
- `npm run typecheck` 通过

---

Plan complete and saved to `docs/plans/2026-03-20-license-activation-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - 我在当前会话里逐任务执行，按实现 → 规格审查 → 代码质量审查推进

**2. Parallel Session (separate)** - 你开一个新会话，用 `executing-plans` 按批次执行

Which approach?
