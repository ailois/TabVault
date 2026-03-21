# Options License Entry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 TabVault 的 `Options` 设置页顶部集成 TrialBanner 与 LicenseActivation，展示试用/过期/已激活状态，并完成 License Key 验证与本地保存流程。

**Architecture:** 在 `src/options.tsx` 中增加一个顶部状态区，由 `useTrialStatus()` 提供当前 trial/license 状态，`Options` 集成层负责计算 banner 文案、控制激活区展开、调用 `validateLicenseKey` 和 `TrialRepository` 保存状态，然后用 `reload()` 刷新视图。`TrialBanner` 与 `LicenseActivation` 继续保持纯 UI 组件边界，不引入新的持久化结构或 Sidepanel 逻辑。

**Tech Stack:** TypeScript, React 18, Vitest, jsdom, chrome.storage.local, 已有 trial modules (`useTrialStatus`, `TrialRepository`, `license-service`)

---

## 重要背景

### 现有可复用模块
- `src/lib/trial/use-trial-status.ts`
  - 返回 `{ status, state, reload }`
- `src/lib/trial/trial-repository.ts`
  - 用于保存 `TrialState`
- `src/lib/trial/license-service.ts`
  - 提供 `validateLicenseKey(key)`
- `src/components/license-activation.tsx`
  - 已完成，纯 UI 组件
- `src/components/trial-banner.tsx`
  - 已完成，纯 UI 组件

### 集成范围
- 只修改 `src/options.tsx`
- 主要新增或扩展 `tests/ui/options.test.tsx`
- 如有必要，可在 `tests/ui` 下新增一个专门的 options trial/license 集成测试文件，但优先沿用现有 `options.test.tsx`
- 不实现 Sidepanel 集成
- 不实现支付/购买跳转
- 不修改 trial 数据结构

### 错误文案映射
- `invalid` → `This license key is invalid.`
- `unvalidated` → `Could not validate right now. Try again shortly.`
- repository / unexpected error → `Failed to save license state.`

### 建议验证命令
```bash
npx vitest run tests/ui/options.test.tsx
npm run typecheck
```

---

## Task 1: 在 Options 测试中写出 trial / expired 顶部状态区失败用例

**Files:**
- Modify: `tests/ui/options.test.tsx`
- Modify: `src/options.tsx`

**Step 1: 写失败测试**

在 `tests/ui/options.test.tsx` 中先加入 trial 状态与 expired 状态的顶部状态区渲染测试。为了让测试可控，先通过 mock `useTrialStatus()` 驱动页面状态。

在文件顶部新增：

```tsx
import * as trialHooks from "../../src/lib/trial/use-trial-status"
```

在测试文件中先 stub 默认返回：

```tsx
const mockReload = vi.fn(async () => {})

vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
  status: "trial",
  state: {
    installedAt: "2026-03-20T00:00:00.000Z",
    analysisUsed: 3
  },
  reload: mockReload
})
```

然后新增两个测试：

```tsx
it("renders a trial banner below the settings header when trial is active", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "trial",
    state: {
      installedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      analysisUsed: 3
    },
    reload: mockReload
  })

  await renderOptions()

  const statusRegion = container?.querySelector('[data-testid="settings-license-state"]')
  const banner = container?.querySelector('[data-testid="trial-banner"]')

  expect(statusRegion).toBeTruthy()
  expect(banner).toBeTruthy()
  expect(container?.textContent).toContain("Trial active")
})

it("renders an expired banner below the settings header when trial has expired", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "expired",
    state: {
      installedAt: "2026-03-01T00:00:00.000Z",
      analysisUsed: 50
    },
    reload: mockReload
  })

  await renderOptions()

  const banner = container?.querySelector('[data-testid="trial-banner"]')
  expect(banner).toBeTruthy()
  expect(container?.textContent).toContain("Trial expired")
})
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：FAIL，因为 `options.tsx` 还没有顶部状态区，也没有引入 `useTrialStatus`。

**Step 3: 写最小实现**

在 `src/options.tsx`：

1. 新增 import：
```tsx
import { TrialBanner } from "./components/trial-banner"
import { LicenseActivation } from "./components/license-activation"
import { useTrialStatus } from "./lib/trial/use-trial-status"
```

2. 在 `Options` 组件中调用：
```tsx
const trial = useTrialStatus()
```

3. 在 `Settings` 页标题下先放一个占位状态区：
```tsx
<div data-testid="settings-license-state">
  {trial.status === "trial" || trial.status === "expired" ? (
    <TrialBanner
      status={trial.status}
      message={trial.status === "trial" ? "Try TabVault free for 3 days." : "New AI analysis is locked until you activate TabVault."}
      ctaLabel={trial.status === "trial" ? "Activate now" : "Unlock TabVault"}
    />
  ) : null}
</div>
```

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：新增 trial/expired 状态区测试通过，其他已有 Options 测试继续通过。

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options.test.tsx
git commit -m "feat(trial): add trial status banner to options settings"
```

---

## Task 2: 写失败测试，驱动 CTA 展开 LicenseActivation 输入态

**Files:**
- Modify: `tests/ui/options.test.tsx`
- Modify: `src/options.tsx`

**Step 1: 写失败测试**

追加一个点击 banner CTA 后显示激活输入态的测试：

```tsx
it("shows the license activation form when clicking the trial banner CTA", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "trial",
    state: {
      installedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      analysisUsed: 3
    },
    reload: mockReload
  })

  await renderOptions()

  const cta = container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')

  await act(async () => {
    cta?.click()
  })

  expect(container?.querySelector('[data-testid="license-activation-card"]')).toBeTruthy()
  expect(container?.textContent).toContain("Activate TabVault")
})
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：FAIL，因为还没有展开激活区的状态逻辑。

**Step 3: 写最小实现**

在 `Options` 中新增本地状态：

```tsx
const [isActivationExpanded, setIsActivationExpanded] = React.useState(false)
const [licenseKeyInput, setLicenseKeyInput] = React.useState("")
const [licenseError, setLicenseError] = React.useState<string | null>(null)
const [isSubmittingLicense, setIsSubmittingLicense] = React.useState(false)
```

把 `TrialBanner` 的 CTA 接到展开逻辑：

```tsx
<TrialBanner
  ...
  onCtaClick={() => setIsActivationExpanded(true)}
/>
```

并在 banner 下显示 `LicenseActivation` 输入态：

```tsx
{(trial.status === "trial" || trial.status === "expired") && isActivationExpanded ? (
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

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：展开激活区测试通过。

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options.test.tsx
git commit -m "feat(trial): expand license activation from options banner"
```

---

## Task 3: 写失败测试，驱动 licensed 状态直接显示已激活视图

**Files:**
- Modify: `tests/ui/options.test.tsx`
- Modify: `src/options.tsx`

**Step 1: 写失败测试**

追加一个 licensed 状态测试：

```tsx
it("renders the activated license view when the user is licensed", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "licensed",
    state: {
      installedAt: "2026-03-01T00:00:00.000Z",
      analysisUsed: 50,
      licenseKey: "LSKEY-ABCD-1234",
      licenseStatus: "valid",
      licenseValidatedAt: "2026-03-20T12:00:00.000Z"
    },
    reload: mockReload
  })

  await renderOptions()

  expect(container?.querySelector('[data-testid="license-activation-card"]')).toBeTruthy()
  expect(container?.textContent).toContain("Activated")
  expect(container?.querySelector('[data-testid="trial-banner"]')).toBeNull()
})
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：FAIL，因为还没有 `licensed` 分支。

**Step 3: 写最小实现**

在顶部状态区增加 `licensed` 分支：

```tsx
{trial.status === "licensed" ? (
  <LicenseActivation
    errorMessage={null}
    isLicensed={true}
    licenseKey={trial.state?.licenseKey ?? ""}
    onLicenseKeyChange={setLicenseKeyInput}
    onSubmit={async () => {}}
    onEdit={() => {
      setLicenseKeyInput(trial.state?.licenseKey ?? "")
      setLicenseError(null)
    }}
  />
) : null}
```

注意：此时还不需要完整提交流程，只需要把 licensed 视图渲染出来。

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：licensed 视图测试通过。

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options.test.tsx
git commit -m "feat(trial): show activated license state in options"
```

---

## Task 4: 写失败测试，驱动有效 license 提交、保存与 reload

**Files:**
- Modify: `tests/ui/options.test.tsx`
- Modify: `src/options.tsx`

**Step 1: 写失败测试**

需要 mock `validateLicenseKey` 和 `TrialRepository`。在测试文件顶部新增：

```tsx
import * as licenseService from "../../src/lib/trial/license-service"
import { TrialRepository } from "../../src/lib/trial/trial-repository"
```

然后写一个集成测试：

```tsx
it("validates and saves the license key, then reloads trial status on success", async () => {
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

  await renderOptions()

  await act(async () => {
    container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')?.click()
  })

  const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    valueSetter?.call(input, "LSKEY-VALID")
    input?.dispatchEvent(new Event("input", { bubbles: true }))
  })

  await act(async () => {
    container?.querySelector<HTMLButtonElement>('[data-testid="license-activation-card"] button')?.click()
  })

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

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：FAIL，因为提交处理逻辑还未实现。

**Step 3: 写最小实现**

在 `src/options.tsx` 中：

1. 导入：
```tsx
import { TrialRepository } from "./lib/trial/trial-repository"
import { validateLicenseKey } from "./lib/trial/license-service"
```

2. 创建 repository 实例：
```tsx
const trialRepository = React.useMemo(() => new TrialRepository(), [])
```

3. 实现提交处理：
```tsx
const handleLicenseSubmit = React.useCallback(async () => {
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

4. 把 `LicenseActivation` 的 `onSubmit` 指向它。

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：valid key 的保存与 reload 集成测试通过。

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options.test.tsx
git commit -m "feat(trial): validate and save license from options"
```

---

## Task 5: 写失败测试，驱动 invalid / unvalidated 错误映射

**Files:**
- Modify: `tests/ui/options.test.tsx`
- Modify: `src/options.tsx`

**Step 1: 写失败测试**

追加两个测试：

```tsx
it("shows an invalid key error without clearing the input", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "trial",
    state: {
      installedAt: "2026-03-20T00:00:00.000Z",
      analysisUsed: 3
    },
    reload: mockReload
  })
  vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("invalid")

  await renderOptions()

  await act(async () => {
    container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')?.click()
  })

  const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    valueSetter?.call(input, "LSKEY-BAD")
    input?.dispatchEvent(new Event("input", { bubbles: true }))
  })

  await act(async () => {
    container?.querySelector<HTMLButtonElement>('[data-testid="license-activation-card"] button')?.click()
  })

  expect(container?.textContent).toContain("This license key is invalid.")
  expect(input?.value).toBe("LSKEY-BAD")
})

it("shows a temporary validation error when the license cannot be validated", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "trial",
    state: {
      installedAt: "2026-03-20T00:00:00.000Z",
      analysisUsed: 3
    },
    reload: mockReload
  })
  vi.spyOn(licenseService, "validateLicenseKey").mockResolvedValue("unvalidated")

  await renderOptions()

  await act(async () => {
    container?.querySelector<HTMLButtonElement>('[data-testid="trial-banner-cta"]')?.click()
  })

  const input = container?.querySelector<HTMLInputElement>('input[aria-label="License Key"]')
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    valueSetter?.call(input, "LSKEY-ANY")
    input?.dispatchEvent(new Event("input", { bubbles: true }))
  })

  await act(async () => {
    container?.querySelector<HTMLButtonElement>('[data-testid="license-activation-card"] button')?.click()
  })

  expect(container?.textContent).toContain("Could not validate right now. Try again shortly.")
  expect(input?.value).toBe("LSKEY-ANY")
})
```

**Step 2: 运行测试，确认失败**

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：FAIL，直到错误映射和输入保留行为落实。

**Step 3: 写最小实现**

在 `handleLicenseSubmit` 中完成 `invalid` / `unvalidated` 分支映射，注意不要清空 `licenseKeyInput`。

**Step 4: 运行测试，确认通过**

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：PASS。

**Step 5: Commit**

```bash
git add src/options.tsx tests/ui/options.test.tsx
git commit -m "feat(trial): map license validation errors in options"
```

---

## Task 6: 补齐展开/已激活视图与现有 Settings 渲染共存验证

**Files:**
- Modify: `tests/ui/options.test.tsx`
- Modify: `src/options.tsx`

**Step 1: 写失败测试**

再加一个回归测试，确保状态区出现时不破坏原有 Settings 内容：

```tsx
it("keeps the existing settings workspace visible while showing the trial/license state region", async () => {
  vi.spyOn(trialHooks, "useTrialStatus").mockReturnValue({
    status: "trial",
    state: {
      installedAt: "2026-03-20T00:00:00.000Z",
      analysisUsed: 3
    },
    reload: mockReload
  })

  await renderOptions()

  expect(container?.querySelector('[data-testid="settings-license-state"]')).toBeTruthy()
  expect(container?.querySelector('[data-testid="settings-workspace"]')).toBeTruthy()
  expect(container?.textContent).toContain("App Settings")
  expect(container?.textContent).toContain("Maintenance")
})
```

如果当前已经满足，可将该测试作为最终保护测试加入。

**Step 2: 运行测试，确认整体通过**

运行：
```bash
npx vitest run tests/ui/options.test.tsx
```

预期：全部通过。

**Step 3: 运行类型检查**

运行：
```bash
npm run typecheck
```

预期：PASS，无 TypeScript 错误。

**Step 4: Commit**

```bash
git add src/options.tsx tests/ui/options.test.tsx
git commit -m "feat(trial): integrate license entry into options settings"
```

---

## 完成定义

当以下条件全部满足时，此计划可视为完成：

- `Options` 的 `Settings` 页标题下新增状态区
- `trial` / `expired` 显示 `TrialBanner`
- 点击 CTA 能展开 `LicenseActivation`
- `licensed` 直接显示已激活视图
- 有效 license 能：
  - 调 `validateLicenseKey`
  - 保存到 `TrialRepository`
  - 调 `reload`
- `invalid` / `unvalidated` 显示正确错误文案
- 不清空输入值
- 现有 `SettingsTabContent` 不受影响
- `npx vitest run tests/ui/options.test.tsx` 通过
- `npm run typecheck` 通过

---

Plan complete and saved to `docs/plans/2026-03-20-options-license-entry-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - 我在当前会话里逐任务执行，按实现 → 规格审查 → 代码质量审查推进

**2. Parallel Session (separate)** - 你开一个新会话，用 `executing-plans` 按批次执行

Which approach?
