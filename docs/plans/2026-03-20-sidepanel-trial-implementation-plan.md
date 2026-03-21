# SidePanel Trial Status Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `SidePanel` 搜索框下方集成试用/License 状态区，展示 `trial` / `expired` 的 `TrialBanner`，点击 CTA 后展开 `LicenseActivation` 进行就地激活，激活成功后状态区自动消失。

**Architecture:** 在 `src/sidepanel.tsx` 中调用 `useTrialStatus()`，管理 `isActivationExpanded / licenseKeyInput / isSubmittingLicense / licenseError` 等本地状态，复用 `validateLicenseKey` 和 `TrialRepository` 完成激活流程。`TrialBanner` 和 `LicenseActivation` 作为纯 UI 组件，激活成功后 `trial.status` 切换为 `"licensed"` 导致状态区不再渲染。

**Tech Stack:** TypeScript, React 18, Vitest, jsdom, 已有 trial modules (`useTrialStatus`, `TrialRepository`, `license-service`)

---

## 重要背景

### 已有可复用模块
- `src/lib/trial/use-trial-status.ts` → `useTrialStatus()`
- `src/lib/trial/trial-repository.ts` → `TrialRepository`
- `src/lib/trial/license-service.ts` → `validateLicenseKey`
- `src/components/trial-banner.tsx` → `TrialBanner`
- `src/components/license-activation.tsx` → `LicenseActivation`

### 状态区渲染规则
- `status === "trial"` → 渲染 `TrialBanner`（trial 主题）
- `status === "expired"` → 渲染 `TrialBanner`（expired 主题）
- `status === "licensed"` → 不渲染任何内容（自动消失）
- `status === null` → 不渲染（加载中）

### 点击 CTA → 展开 LicenseActivation（输入态）

### 错误文案映射
- `"invalid"` → `"This license key is invalid."`
- `"unvalidated"` → `"Could not validate right now. Try again shortly."`
- repository / 意外异常 → `"Failed to save license state."`

### 插入位置
在 `src/sidepanel.tsx` 搜索框那块（`#sidepanel-search`）与 search filter chips 之间，或 filter chips 下方，在 library section 之前。推荐放在 search chips 之后、library section 之前，用 `padding` 区域包裹。

### 建议验证命令
```bash
npx vitest run tests/ui/sidepanel.test.tsx
npm run typecheck
```

---

## Task 1: 写失败测试，驱动 trial / expired 横幅渲染

**Files:**
- Modify: `tests/ui/sidepanel.test.tsx`
- Modify: `src/sidepanel.tsx`

**Step 1: 写失败测试**

在 `tests/ui/sidepanel.test.tsx` 顶部增加 import：

```tsx
import * as trialHooks from "../../src/lib/trial/use-trial-status"
import type { TrialState, TrialStatus } from "../../src/types/trial"
```

在 `describe("SidePanel")` 块内，`afterEach` 之后新增两个测试：

```tsx
it("renders a trial banner below the search bar when trial is active", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "trial",
    state: {
      installedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      analysisUsed: 3
    },
    reload: vi.fn(async () => {})
  })

  await renderSidePanel()

  expect(container?.querySelector("[data-testid='trial-banner']")).toBeTruthy()
  expect(container?.textContent).toContain("Trial active")
  expect(container?.querySelector("#sidepanel-search")).toBeTruthy()
})

it("renders an expired banner when the trial has expired", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "expired",
    state: {
      installedAt: "2026-03-01T00:00:00.000Z",
      analysisUsed: 50
    },
    reload: vi.fn(async () => {})
  })

  await renderSidePanel()

  expect(container?.querySelector("[data-testid='trial-banner']")).toBeTruthy()
  expect(container?.textContent).toContain("Trial expired")
})
```

**Step 2: 运行测试，确认失败**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

预期：新增两条测试 FAIL（因为 SidePanel 还未渲染 trial 状态区）。

**Step 3: 写最小实现**

在 `src/sidepanel.tsx` 顶部追加 import：

```tsx
import { TrialBanner } from "./components/trial-banner"
import { LicenseActivation } from "./components/license-activation"
import { validateLicenseKey } from "./lib/trial/license-service"
import { TrialRepository } from "./lib/trial/trial-repository"
import { useTrialStatus } from "./lib/trial/use-trial-status"
```

在 `SidePanel` 函数顶部（`useMemo(() => ...)` 之后）添加：

```tsx
const trial = useTrialStatus()
const trialRepository = React.useMemo(() => new TrialRepository(), [])
const [isActivationExpanded, setIsActivationExpanded] = useState(false)
const [licenseKeyInput, setLicenseKeyInput] = useState("")
const [licenseError, setLicenseError] = useState<string | null>(null)
const [isSubmittingLicense, setIsSubmittingLicense] = useState(false)
```

在 JSX 中，在 search filter chips `<div>` 之后、`errorMessage` 展示之前，插入状态区：

```tsx
{(trial.status === "trial" || trial.status === "expired") ? (
  <div style={{ padding: `0 ${spacing.lg} ${spacing.sm}` }}>
    <TrialBanner
      ctaLabel={trial.status === "trial" ? "Activate now" : "Unlock TabVault"}
      message={
        trial.status === "trial"
          ? "Try TabVault free for 3 days."
          : "New AI analysis is locked until you activate TabVault."
      }
      onCtaClick={() => setIsActivationExpanded(true)}
      status={trial.status}
    />
  </div>
) : null}
```

**Step 4: 运行测试，确认通过**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

预期：新增两条测试通过，原有测试不受影响。

**Step 5: Commit**

```bash
git add src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat(trial): show trial status banner in sidepanel"
```

---

## Task 2: 写失败测试，驱动 CTA 点击展开 LicenseActivation

**Files:**
- Modify: `tests/ui/sidepanel.test.tsx`
- Modify: `src/sidepanel.tsx`

**Step 1: 写失败测试**

追加测试：

```tsx
it("expands the license activation form when clicking the trial banner CTA", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "trial",
    state: {
      installedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      analysisUsed: 3
    },
    reload: vi.fn(async () => {})
  })

  await renderSidePanel()

  const cta = container?.querySelector<HTMLButtonElement>("[data-testid='trial-banner-cta']")
  await act(async () => { cta?.click() })

  expect(container?.querySelector("[data-testid='license-activation-card']")).toBeTruthy()
  expect(container?.textContent).toContain("Activate TabVault")
})
```

**Step 2: 运行测试，确认失败**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

预期：FAIL，因为还没有展开激活区逻辑。

**Step 3: 写最小实现**

在状态区的 TrialBanner 下方，追加展开条件：

```tsx
{isActivationExpanded ? (
  <LicenseActivation
    errorMessage={licenseError}
    isLicensed={false}
    isSubmitting={isSubmittingLicense}
    licenseKey={licenseKeyInput}
    onLicenseKeyChange={setLicenseKeyInput}
    onSubmit={async () => {}}
  />
) : null}
```

**Step 4: 运行测试，确认通过**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

预期：PASS。

**Step 5: Commit**

```bash
git add src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat(trial): expand activation form from sidepanel banner"
```

---

## Task 3: 写失败测试，驱动 licensed 状态不渲染状态区

**Files:**
- Modify: `tests/ui/sidepanel.test.tsx`

**Step 1: 写失败测试**

追加测试：

```tsx
it("does not render any trial region when the user is licensed", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "licensed",
    state: {
      installedAt: "2026-03-01T00:00:00.000Z",
      analysisUsed: 50,
      licenseKey: "LSKEY-ABCD-1234",
      licenseStatus: "valid",
      licenseValidatedAt: "2026-03-20T12:00:00.000Z"
    },
    reload: vi.fn(async () => {})
  })

  await renderSidePanel()

  expect(container?.querySelector("[data-testid='trial-banner']")).toBeNull()
  expect(container?.querySelector("[data-testid='license-activation-card']")).toBeNull()
})
```

**Step 2: 运行测试**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

预期：如果 Task 1 实现正确（只在 trial/expired 时渲染），这条测试直接通过。否则修改实现。

**Step 3: Commit（如有修改）**

```bash
git add src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat(trial): hide trial state region when licensed in sidepanel"
```

---

## Task 4: 写失败测试，驱动有效 license 提交、保存与 reload

**Files:**
- Modify: `tests/ui/sidepanel.test.tsx`
- Modify: `src/sidepanel.tsx`

**Step 1: 写失败测试**

在 test 文件顶部追加 import：

```tsx
import * as licenseService from "../../src/lib/trial/license-service"
import { TrialRepository } from "../../src/lib/trial/trial-repository"
```

追加成功提交测试：

```tsx
it("validates and saves the license key when submitting from the sidepanel", async () => {
  const reload = vi.fn(async () => {})
  const save = vi.fn(async () => {})
  const get = vi.fn(async () => ({
    installedAt: "2026-03-20T00:00:00.000Z",
    analysisUsed: 3
  }))

  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "trial",
    state: {
      installedAt: "2026-03-20T00:00:00.000Z",
      analysisUsed: 3
    },
    reload
  })
  vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("valid")
  vi.spyOn(TrialRepository.prototype, "get").mockImplementation(get)
  vi.spyOn(TrialRepository.prototype, "save").mockImplementation(save)

  await renderSidePanel()

  await act(async () => {
    container?.querySelector<HTMLButtonElement>("[data-testid='trial-banner-cta']")?.click()
  })

  const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    valueSetter?.call(input, "LSKEY-VALID")
    input?.dispatchEvent(new Event("input", { bubbles: true }))
  })

  const activateButton = Array.from(
    container?.querySelectorAll('[data-testid="license-activation-card"] button') ?? []
  ).find((btn): btn is HTMLButtonElement => btn.textContent === "Activate")

  await act(async () => { activateButton?.click() })

  expect(licenseService.validateLicenseKey).toHaveBeenCalledWith("LSKEY-VALID")
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      licenseKey: "LSKEY-VALID",
      licenseStatus: "valid",
      licenseValidatedAt: expect.any(String)
    })
  )
  expect(reload).toHaveBeenCalled()
})
```

**Step 2: 运行测试，确认失败**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

预期：FAIL，因为 onSubmit 还是空函数。

**Step 3: 写最小实现**

在 `SidePanel` 中新增 `handleLicenseSubmit`（与 Options 集成层模式完全对称）：

```tsx
const handleLicenseSubmit = useCallback(async () => {
  setLicenseError(null)
  setIsSubmittingLicense(true)

  try {
    const result = await validateLicenseKey(licenseKeyInput)

    if (result === "invalid") {
      setLicenseError("This license key is invalid.")
      return
    }

    if (result === "unvalidated") {
      setLicenseError("Could not validate right now. Try again shortly.")
      return
    }

    const existingState = (await trialRepository.get()) ?? {
      installedAt: new Date().toISOString(),
      analysisUsed: 0
    }

    await trialRepository.save({
      ...existingState,
      licenseKey: licenseKeyInput,
      licenseStatus: "valid",
      licenseValidatedAt: new Date().toISOString()
    })

    await trial.reload()
    setIsActivationExpanded(false)
  } catch {
    setLicenseError("Failed to save license state.")
  } finally {
    setIsSubmittingLicense(false)
  }
}, [licenseKeyInput, trial, trialRepository])
```

并把 `LicenseActivation` 的 `onSubmit` 指向 `handleLicenseSubmit`。

还需在 import 中追加 `useCallback`：

```tsx
import React, { useCallback, useEffect, useMemo, useState } from "react"
```

**Step 4: 运行测试，确认通过**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

预期：PASS。

**Step 5: Commit**

```bash
git add src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat(trial): wire license validation in sidepanel"
```

---

## Task 5: 写失败测试，驱动无效 key 错误映射

**Files:**
- Modify: `tests/ui/sidepanel.test.tsx`

**Step 1: 写失败测试**

追加无效 key 测试：

```tsx
it("shows an error when the license key is invalid", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "trial",
    state: {
      installedAt: "2026-03-20T00:00:00.000Z",
      analysisUsed: 3
    },
    reload: vi.fn(async () => {})
  })
  vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("invalid")

  await renderSidePanel()

  await act(async () => {
    container?.querySelector<HTMLButtonElement>("[data-testid='trial-banner-cta']")?.click()
  })

  const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    valueSetter?.call(input, "LSKEY-BAD")
    input?.dispatchEvent(new Event("input", { bubbles: true }))
  })

  const activateButton = Array.from(
    container?.querySelectorAll('[data-testid="license-activation-card"] button') ?? []
  ).find((btn): btn is HTMLButtonElement => btn.textContent === "Activate")

  await act(async () => { activateButton?.click() })

  expect(container?.textContent).toContain("This license key is invalid.")
  expect(input?.value).toBe("LSKEY-BAD")
})
```

**Step 2: 运行测试**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

如果 Task 4 实现正确，这条测试应直接通过。

**Step 3: Commit（如有修改）**

```bash
git add src/sidepanel.tsx tests/ui/sidepanel.test.tsx
git commit -m "feat(trial): handle invalid key error in sidepanel activation"
```

---

## Task 6: 类型检查与最终验证

**Step 1: 运行全部 SidePanel 测试**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

预期：全部通过（包含原有测试）。

**Step 2: 运行类型检查**

```bash
npm run typecheck
```

预期：无 TypeScript 错误。

**Step 3: 确认完成定义**

- `src/sidepanel.tsx` 中已引入状态区
- `trial` / `expired` 显示 `TrialBanner`
- 点击 CTA 展开 `LicenseActivation`
- `licensed` 时不显示任何状态区
- 有效 key 能触发 `validateLicenseKey` + `TrialRepository.save` + `reload`
- `invalid` 显示正确错误文案
- 现有 SidePanel 功能不受影响
- 全部测试通过
- typecheck 通过

---

Plan complete and saved to `docs/plans/2026-03-20-sidepanel-trial-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - 我在当前会话里逐任务执行，按实现 → 规格审查 → 代码质量审查推进

**2. Parallel Session (separate)** - 你开一个新会话，用 `executing-plans` 按批次执行

Which approach?
