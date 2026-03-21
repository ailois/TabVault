# TabVault 商业化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 TabVault 实现完整商业化基础设施：3天试用期系统 + License Key 激活 + 批量分析优化 + Aha 时刻增强。

**Architecture:** 试用状态存储在 `chrome.storage.local`（`trialState` key），所有 UI 组件通过 `useTrialStatus` hook 读取状态。License Key 验证通过 LemonSqueezy API 进行远端验证，结果缓存本地，每30天重新验证一次。内置 key 存储在 background 层，不暴露给 UI 层。

**Tech Stack:** TypeScript, React, Plasmo (Chrome Extension MV3), Vitest, chrome.storage.local, LemonSqueezy License API

---

## 重要背景

### 现有存储结构
- `chrome.storage.sync`：存 `app-settings`（AppSettings）和 `provider-configs`（ProviderConfig[]）
- `chrome.storage.local`：尚无使用，将用于 trialState
- IndexedDB (`tabvault` 数据库)：存书签记录（BookmarkRecord）

### 现有类型
```typescript
// src/types/settings.ts
type AppSettings = {
  defaultProvider: ProviderType
  autoAnalyzeOnSave: boolean
  summaryLanguage: SummaryLanguage
  autoRetryOnError: boolean
}
```

### 测试命令
```bash
npx vitest run              # 运行所有测试
npx vitest run --reporter=verbose  # 详细输出
npm run typecheck           # 类型检查
```

---

## Task 1: 定义 Trial 类型和常量

**Files:**
- Create: `src/types/trial.ts`
- Create: `src/lib/trial/trial-constants.ts`

**Step 1: 写失败测试**

创建 `tests/lib/trial/trial-constants.test.ts`：

```typescript
import { describe, it, expect } from "vitest"
import { TRIAL_DAYS, TRIAL_ANALYSIS_LIMIT } from "../../../src/lib/trial/trial-constants"

describe("trial-constants", () => {
  it("trial period is 3 days in milliseconds", () => {
    expect(TRIAL_DAYS).toBe(3 * 24 * 60 * 60 * 1000)
  })

  it("trial analysis limit is 50", () => {
    expect(TRIAL_ANALYSIS_LIMIT).toBe(50)
  })
})
```

**Step 2: 运行验证失败**

```bash
npx vitest run tests/lib/trial/trial-constants.test.ts
```
预期：FAIL（模块不存在）

**Step 3: 创建类型文件**

创建 `src/types/trial.ts`：

```typescript
export type LicenseStatus = "unvalidated" | "valid" | "invalid"

export type TrialState = {
  installedAt: string        // ISO 时间戳，首次安装时间
  analysisUsed: number       // 试用期已用内置 key 分析次数
  licenseKey?: string        // 用户输入的 License Key
  licenseStatus?: LicenseStatus
  licenseValidatedAt?: string // 上次验证时间（ISO 时间戳）
}

export type TrialStatus = "trial" | "expired" | "licensed"
```

**Step 4: 创建常量文件**

创建 `src/lib/trial/trial-constants.ts`：

```typescript
export const TRIAL_DAYS = 3 * 24 * 60 * 60 * 1000
export const TRIAL_ANALYSIS_LIMIT = 50
export const LICENSE_REVALIDATION_INTERVAL = 30 * 24 * 60 * 60 * 1000 // 30天
export const TRIAL_STORAGE_KEY = "trial-state"
```

**Step 5: 运行验证通过**

```bash
npx vitest run tests/lib/trial/trial-constants.test.ts
```
预期：PASS

**Step 6: Commit**

```bash
git add src/types/trial.ts src/lib/trial/trial-constants.ts tests/lib/trial/trial-constants.test.ts
git commit -m "feat(trial): add trial types and constants"
```

---

## Task 2: 实现 TrialRepository（读写 chrome.storage.local）

**Files:**
- Create: `src/lib/trial/trial-repository.ts`
- Create: `tests/lib/trial/trial-repository.test.ts`

**Step 1: 写失败测试**

创建 `tests/lib/trial/trial-repository.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { TrialRepository } from "../../../src/lib/trial/trial-repository"
import { TRIAL_STORAGE_KEY } from "../../../src/lib/trial/trial-constants"
import type { TrialState } from "../../../src/types/trial"

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {}
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(mockStorage, obj)
      })
    }
  }
})

describe("TrialRepository", () => {
  let repo: TrialRepository

  beforeEach(() => {
    repo = new TrialRepository()
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    vi.clearAllMocks()
    // re-stub after clear
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn(async (obj: Record<string, unknown>) => {
            Object.assign(mockStorage, obj)
          })
        }
      }
    })
  })

  it("returns null when no trial state exists", async () => {
    const state = await repo.get()
    expect(state).toBeNull()
  })

  it("saves and retrieves trial state", async () => {
    const state: TrialState = {
      installedAt: "2026-03-19T00:00:00.000Z",
      analysisUsed: 0
    }
    await repo.save(state)
    const retrieved = await repo.get()
    expect(retrieved).toEqual(state)
  })

  it("increments analysisUsed", async () => {
    const state: TrialState = {
      installedAt: "2026-03-19T00:00:00.000Z",
      analysisUsed: 5
    }
    await repo.save(state)
    await repo.incrementAnalysisUsed()
    const retrieved = await repo.get()
    expect(retrieved?.analysisUsed).toBe(6)
  })
})
```

**Step 2: 运行验证失败**

```bash
npx vitest run tests/lib/trial/trial-repository.test.ts
```
预期：FAIL

**Step 3: 实现 TrialRepository**

创建 `src/lib/trial/trial-repository.ts`：

```typescript
import type { TrialState } from "../../types/trial"
import { TRIAL_STORAGE_KEY } from "./trial-constants"

export class TrialRepository {
  async get(): Promise<TrialState | null> {
    const result = await chrome.storage.local.get(TRIAL_STORAGE_KEY)
    return (result[TRIAL_STORAGE_KEY] as TrialState) ?? null
  }

  async save(state: TrialState): Promise<void> {
    await chrome.storage.local.set({ [TRIAL_STORAGE_KEY]: state })
  }

  async incrementAnalysisUsed(): Promise<void> {
    const current = await this.get()
    if (!current) return
    await this.save({ ...current, analysisUsed: current.analysisUsed + 1 })
  }
}
```

**Step 4: 运行验证通过**

```bash
npx vitest run tests/lib/trial/trial-repository.test.ts
```
预期：PASS

**Step 5: Commit**

```bash
git add src/lib/trial/trial-repository.ts tests/lib/trial/trial-repository.test.ts
git commit -m "feat(trial): add TrialRepository for chrome.storage.local"
```

---

## Task 3: 实现 getTrialStatus 纯函数

**Files:**
- Create: `src/lib/trial/get-trial-status.ts`
- Create: `tests/lib/trial/get-trial-status.test.ts`

**Step 1: 写失败测试**

创建 `tests/lib/trial/get-trial-status.test.ts`：

```typescript
import { describe, it, expect } from "vitest"
import { getTrialStatus } from "../../../src/lib/trial/get-trial-status"
import { TRIAL_DAYS, TRIAL_ANALYSIS_LIMIT } from "../../../src/lib/trial/trial-constants"
import type { TrialState } from "../../../src/types/trial"

const now = new Date("2026-03-19T12:00:00.000Z").getTime()

function makeState(overrides: Partial<TrialState> = {}): TrialState {
  return {
    installedAt: new Date(now).toISOString(),
    analysisUsed: 0,
    ...overrides
  }
}

describe("getTrialStatus", () => {
  it("returns 'trial' when within 3 days and under limit", () => {
    const state = makeState({ installedAt: new Date(now - 1000).toISOString() })
    expect(getTrialStatus(state, now)).toBe("trial")
  })

  it("returns 'expired' when over 3 days", () => {
    const state = makeState({
      installedAt: new Date(now - TRIAL_DAYS - 1000).toISOString()
    })
    expect(getTrialStatus(state, now)).toBe("expired")
  })

  it("returns 'expired' when analysis limit reached", () => {
    const state = makeState({ analysisUsed: TRIAL_ANALYSIS_LIMIT })
    expect(getTrialStatus(state, now)).toBe("expired")
  })

  it("returns 'licensed' when license is valid regardless of time", () => {
    const state = makeState({
      installedAt: new Date(now - TRIAL_DAYS - 999999).toISOString(),
      analysisUsed: 999,
      licenseKey: "LSKEY-XXXX",
      licenseStatus: "valid"
    })
    expect(getTrialStatus(state, now)).toBe("licensed")
  })

  it("returns 'expired' when license key exists but not validated", () => {
    const state = makeState({
      installedAt: new Date(now - TRIAL_DAYS - 1000).toISOString(),
      licenseKey: "LSKEY-XXXX",
      licenseStatus: "unvalidated"
    })
    expect(getTrialStatus(state, now)).toBe("expired")
  })
})
```

**Step 2: 运行验证失败**

```bash
npx vitest run tests/lib/trial/get-trial-status.test.ts
```
预期：FAIL

**Step 3: 实现函数**

创建 `src/lib/trial/get-trial-status.ts`：

```typescript
import type { TrialState, TrialStatus } from "../../types/trial"
import { TRIAL_DAYS, TRIAL_ANALYSIS_LIMIT } from "./trial-constants"

export function getTrialStatus(state: TrialState, now: number = Date.now()): TrialStatus {
  if (state.licenseKey && state.licenseStatus === "valid") return "licensed"

  const elapsed = now - new Date(state.installedAt).getTime()
  if (elapsed > TRIAL_DAYS || state.analysisUsed >= TRIAL_ANALYSIS_LIMIT) return "expired"

  return "trial"
}
```

**Step 4: 运行验证通过**

```bash
npx vitest run tests/lib/trial/get-trial-status.test.ts
```
预期：PASS（5 tests）

**Step 5: Commit**

```bash
git add src/lib/trial/get-trial-status.ts tests/lib/trial/get-trial-status.test.ts
git commit -m "feat(trial): add getTrialStatus pure function"
```

---

## Task 4: 实现 useTrialStatus React hook

**Files:**
- Create: `src/lib/trial/use-trial-status.ts`

注意：此 hook 较难做纯 Vitest 单元测试（需要 React 环境），暂时跳过单元测试，通过集成测试（手动）验证。

**Step 1: 创建 hook**

创建 `src/lib/trial/use-trial-status.ts`：

```typescript
import { useEffect, useState } from "react"
import { TrialRepository } from "./trial-repository"
import { getTrialStatus } from "./get-trial-status"
import type { TrialStatus, TrialState } from "../../types/trial"

const repo = new TrialRepository()

export type UseTrialStatusResult = {
  status: TrialStatus | null   // null = 加载中
  state: TrialState | null
  reload: () => Promise<void>
}

export function useTrialStatus(): UseTrialStatusResult {
  const [status, setStatus] = useState<TrialStatus | null>(null)
  const [state, setState] = useState<TrialState | null>(null)

  async function load() {
    let trialState = await repo.get()

    // 首次安装：初始化 trialState
    if (!trialState) {
      trialState = { installedAt: new Date().toISOString(), analysisUsed: 0 }
      await repo.save(trialState)
    }

    setState(trialState)
    setStatus(getTrialStatus(trialState))
  }

  useEffect(() => {
    void load()
  }, [])

  return { status, state, reload: load }
}
```

**Step 2: Typecheck**

```bash
npm run typecheck
```
预期：无错误

**Step 3: Commit**

```bash
git add src/lib/trial/use-trial-status.ts
git commit -m "feat(trial): add useTrialStatus hook"
```

---

## Task 5: 实现内置 Key 代理（background 层）

**Files:**
- Modify: `src/background.ts`
- Create: `src/lib/trial/built-in-key.ts`

内置 Key 只存在于 background 层。UI 发送消息请求分析，background 决定用哪个 Key。

**Step 1: 创建内置 Key 模块**

创建 `src/lib/trial/built-in-key.ts`：

```typescript
// 内置 key 仅在 background 层使用
// 实际部署时替换为真实的 key（通过环境变量注入）
const BUILT_IN_KEY = process.env.PLASMO_PUBLIC_BUILT_IN_KEY ?? ""

export type BuiltInKeyConfig = {
  provider: "openai"
  apiKey: string
  baseUrl: string
  model: string
  enabled: boolean
}

export function getBuiltInKeyConfig(): BuiltInKeyConfig {
  return {
    provider: "openai",
    apiKey: BUILT_IN_KEY,
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    enabled: BUILT_IN_KEY.length > 0
  }
}
```

**Step 2: 在 background.ts 中处理 TRIAL_ANALYZE 消息**

打开 `src/background.ts`，在现有消息监听器中添加对 `TRIAL_ANALYZE` 消息的处理。

找到现有的 `chrome.runtime.onMessage.addListener` 部分，在其中添加：

```typescript
// 在现有 message listener 中增加 case
if (message.type === "TRIAL_ANALYZE") {
  const { bookmark } = message
  const trialRepo = new TrialRepository()
  const trialState = await trialRepo.get()

  if (!trialState) {
    sendResponse({ success: false, error: "Trial not initialized" })
    return true
  }

  const status = getTrialStatus(trialState)
  if (status === "expired") {
    sendResponse({ success: false, error: "Trial expired" })
    return true
  }

  const builtInConfig = getBuiltInKeyConfig()
  if (!builtInConfig.enabled) {
    sendResponse({ success: false, error: "Built-in key not configured" })
    return true
  }

  try {
    const provider = createProvider(builtInConfig)
    const repo = new IndexedDbBookmarkRepository()
    await analyzeBookmark({ bookmark, provider, bookmarkRepository: repo })
    await trialRepo.incrementAnalysisUsed()
    sendResponse({ success: true })
  } catch (error) {
    sendResponse({ success: false, error: error instanceof Error ? error.message : "Analysis failed" })
  }

  return true
}
```

需要在 background.ts 顶部添加必要的 import：
```typescript
import { TrialRepository } from "./lib/trial/trial-repository"
import { getTrialStatus } from "./lib/trial/get-trial-status"
import { getBuiltInKeyConfig } from "./lib/trial/built-in-key"
```

**Step 3: Typecheck**

```bash
npm run typecheck
```
预期：无错误

**Step 4: Commit**

```bash
git add src/lib/trial/built-in-key.ts src/background.ts
git commit -m "feat(trial): add built-in key proxy in background"
```

---

## Task 6: 实现 License Key 验证服务

**Files:**
- Create: `src/lib/trial/license-service.ts`
- Create: `tests/lib/trial/license-service.test.ts`

**Step 1: 写失败测试**

创建 `tests/lib/trial/license-service.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { validateLicenseKey, isRevalidationNeeded } from "../../../src/lib/trial/license-service"
import { LICENSE_REVALIDATION_INTERVAL } from "../../../src/lib/trial/trial-constants"

describe("isRevalidationNeeded", () => {
  const now = new Date("2026-03-19T12:00:00.000Z").getTime()

  it("returns true when never validated", () => {
    expect(isRevalidationNeeded(undefined, now)).toBe(true)
  })

  it("returns false when validated recently", () => {
    const recentlyValidated = new Date(now - 1000).toISOString()
    expect(isRevalidationNeeded(recentlyValidated, now)).toBe(false)
  })

  it("returns true when validated more than 30 days ago", () => {
    const oldValidation = new Date(now - LICENSE_REVALIDATION_INTERVAL - 1000).toISOString()
    expect(isRevalidationNeeded(oldValidation, now)).toBe(true)
  })
})

describe("validateLicenseKey", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns valid for successful API response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, license: { status: "active" } })
    }) as any

    const result = await validateLicenseKey("LSKEY-VALID")
    expect(result).toBe("valid")
  })

  it("returns invalid for deactivated license", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "not_found" })
    }) as any

    const result = await validateLicenseKey("LSKEY-INVALID")
    expect(result).toBe("invalid")
  })

  it("returns unvalidated on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as any

    const result = await validateLicenseKey("LSKEY-ANY")
    expect(result).toBe("unvalidated")
  })
})
```

**Step 2: 运行验证失败**

```bash
npx vitest run tests/lib/trial/license-service.test.ts
```
预期：FAIL

**Step 3: 实现 license-service**

创建 `src/lib/trial/license-service.ts`：

```typescript
import type { LicenseStatus } from "../../types/trial"
import { LICENSE_REVALIDATION_INTERVAL } from "./trial-constants"

// LemonSqueezy License API endpoint
const LS_LICENSE_API = "https://api.lemonsqueezy.com/v1/licenses/validate"

export function isRevalidationNeeded(lastValidatedAt: string | undefined, now: number = Date.now()): boolean {
  if (!lastValidatedAt) return true
  return now - new Date(lastValidatedAt).getTime() > LICENSE_REVALIDATION_INTERVAL
}

export async function validateLicenseKey(key: string): Promise<LicenseStatus> {
  try {
    const response = await fetch(LS_LICENSE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: key })
    })

    if (!response.ok) return "invalid"

    const data = await response.json() as { valid?: boolean; license?: { status: string } }
    if (data.valid && data.license?.status === "active") return "valid"
    return "invalid"
  } catch {
    // 网络错误时保留 unvalidated，不清除已缓存的 valid 状态
    return "unvalidated"
  }
}
```

**Step 4: 运行验证通过**

```bash
npx vitest run tests/lib/trial/license-service.test.ts
```
预期：PASS

**Step 5: Commit**

```bash
git add src/lib/trial/license-service.ts tests/lib/trial/license-service.test.ts
git commit -m "feat(trial): add license key validation service"
```

---

## Task 7: 创建 LicenseActivation UI 组件

**Files:**
- Create: `src/components/license-activation.tsx`

**Step 1: 创建组件**

创建 `src/components/license-activation.tsx`：

```typescript
import React, { useState } from "react"
import { validateLicenseKey } from "../lib/trial/license-service"
import { TrialRepository } from "../lib/trial/trial-repository"
import { spacing, radius } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"

type Props = {
  onActivated: () => void
}

type ActivationStatus = "idle" | "validating" | "success" | "error"

const repo = new TrialRepository()

export function LicenseActivation({ onActivated }: Props) {
  const theme = useThemeContext()
  const [key, setKey] = useState("")
  const [status, setStatus] = useState<ActivationStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  async function handleActivate() {
    const trimmed = key.trim()
    if (!trimmed) return

    setStatus("validating")
    setErrorMessage("")

    const result = await validateLicenseKey(trimmed)

    if (result === "valid") {
      const state = await repo.get()
      if (state) {
        await repo.save({
          ...state,
          licenseKey: trimmed,
          licenseStatus: "valid",
          licenseValidatedAt: new Date().toISOString()
        })
      }
      setStatus("success")
      onActivated()
    } else if (result === "invalid") {
      setStatus("error")
      setErrorMessage("License key is invalid or deactivated.")
    } else {
      setStatus("error")
      setErrorMessage("Could not reach activation server. Check your connection.")
    }
  }

  return (
    <div style={{ display: "grid", gap: spacing.md }}>
      <div>
        <label
          htmlFor="license-key-input"
          style={{ display: "block", marginBottom: spacing.xs, fontSize: "0.875rem", fontWeight: 600, color: theme.textPrimary }}
        >
          License Key
        </label>
        <input
          id="license-key-input"
          onChange={(e) => setKey(e.target.value)}
          placeholder="LSKEY-XXXX-XXXX-XXXX"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: `${spacing.sm} ${spacing.md}`,
            border: `1px solid ${status === "error" ? theme.textDanger : theme.border}`,
            borderRadius: radius.medium,
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            fontSize: "0.875rem"
          }}
          type="text"
          value={key}
        />
        {errorMessage ? (
          <p style={{ margin: `${spacing.xs} 0 0`, fontSize: "0.8125rem", color: theme.textDanger }}>
            {errorMessage}
          </p>
        ) : null}
      </div>

      <button
        disabled={status === "validating" || !key.trim()}
        onClick={() => void handleActivate()}
        style={{
          padding: `${spacing.sm} ${spacing.lg}`,
          border: "none",
          borderRadius: radius.medium,
          backgroundColor: theme.accent,
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: status === "validating" ? "wait" : "pointer"
        }}
        type="button"
      >
        {status === "validating" ? "Validating..." : status === "success" ? "Activated!" : "Activate License"}
      </button>
    </div>
  )
}
```

**Step 2: Typecheck**

```bash
npm run typecheck
```
预期：无错误

**Step 3: Commit**

```bash
git add src/components/license-activation.tsx
git commit -m "feat(trial): add LicenseActivation UI component"
```

---

## Task 8: 创建 TrialBanner 组件

在试用期结束时向用户展示购买引导。

**Files:**
- Create: `src/components/trial-banner.tsx`

**Step 1: 创建组件**

创建 `src/components/trial-banner.tsx`：

```typescript
import React, { useState } from "react"
import { spacing, radius } from "../ui/design-tokens"
import { useThemeContext } from "../ui/theme-context"
import { LicenseActivation } from "./license-activation"
import type { TrialStatus } from "../types/trial"

// 购买链接（上架后替换为真实 LemonSqueezy 商品 URL）
const PURCHASE_URL = "https://tabvault.lemonsqueezy.com/checkout"

type Props = {
  status: TrialStatus | null
  daysRemaining?: number
  analysisRemaining?: number
  onActivated: () => void
}

export function TrialBanner({ status, daysRemaining, analysisRemaining, onActivated }: Props) {
  const theme = useThemeContext()
  const [showActivation, setShowActivation] = useState(false)

  if (status === "licensed" || status === null) return null

  if (status === "trial") {
    return (
      <div
        style={{
          margin: `0 ${spacing.lg} ${spacing.sm}`,
          padding: `${spacing.sm} ${spacing.md}`,
          borderRadius: radius.medium,
          backgroundColor: theme.accentSoft,
          border: `1px solid ${theme.borderFocus}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
          fontSize: "0.8125rem"
        }}
      >
        <span style={{ color: theme.textPrimary }}>
          Trial: {daysRemaining !== undefined ? `${daysRemaining}d` : "—"} remaining
          {analysisRemaining !== undefined ? `, ${analysisRemaining} AI analyses left` : ""}
        </span>
        <button
          onClick={() => window.open(PURCHASE_URL, "_blank")}
          style={{
            padding: "3px 10px",
            border: "none",
            borderRadius: radius.pill,
            backgroundColor: theme.accent,
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.75rem",
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
          type="button"
        >
          Buy Now
        </button>
      </div>
    )
  }

  // status === "expired"
  return (
    <div
      style={{
        margin: spacing.lg,
        padding: spacing.lg,
        borderRadius: "16px",
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.isDark ? "0 4px 12px rgba(0,0,0,0.28)" : "0 4px 12px rgba(15,23,42,0.08)"
      }}
    >
      <h3 style={{ margin: `0 0 ${spacing.sm}`, fontSize: "1rem", fontWeight: 700, color: theme.textPrimary }}>
        Your trial has ended
      </h3>
      <p style={{ margin: `0 0 ${spacing.md}`, fontSize: "0.875rem", color: theme.textMuted, lineHeight: 1.6 }}>
        Your bookmarks and analysis results are safe. Purchase a license to continue using AI analysis, or add your own API key in Settings.
      </p>

      <div style={{ display: "flex", gap: spacing.sm, marginBottom: showActivation ? spacing.lg : 0, flexWrap: "wrap" }}>
        <button
          onClick={() => window.open(PURCHASE_URL, "_blank")}
          style={{
            flex: 1,
            padding: `${spacing.sm} ${spacing.md}`,
            border: "none",
            borderRadius: radius.medium,
            backgroundColor: theme.accent,
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer"
          }}
          type="button"
        >
          Purchase License
        </button>
        <button
          onClick={() => setShowActivation(!showActivation)}
          style={{
            flex: 1,
            padding: `${spacing.sm} ${spacing.md}`,
            border: `1px solid ${theme.border}`,
            borderRadius: radius.medium,
            backgroundColor: "transparent",
            color: theme.textSecondary,
            fontWeight: 500,
            fontSize: "0.875rem",
            cursor: "pointer"
          }}
          type="button"
        >
          Enter License Key
        </button>
      </div>

      {showActivation ? <LicenseActivation onActivated={onActivated} /> : null}
    </div>
  )
}
```

**Step 2: Typecheck**

```bash
npm run typecheck
```
预期：无错误

**Step 3: Commit**

```bash
git add src/components/trial-banner.tsx
git commit -m "feat(trial): add TrialBanner component"
```

---

## Task 9: 将 Trial 系统集成到 SidePanel

**Files:**
- Modify: `src/sidepanel.tsx`

**Step 1: 集成 useTrialStatus 和 TrialBanner**

打开 `src/sidepanel.tsx`，做以下修改：

1. 在文件顶部添加 import：
```typescript
import { useTrialStatus } from "./lib/trial/use-trial-status"
import { TrialBanner } from "./components/trial-banner"
import { TRIAL_DAYS, TRIAL_ANALYSIS_LIMIT } from "./lib/trial/trial-constants"
```

2. 在 `SidePanel` 函数体内，现有 state 声明后，添加：
```typescript
const { status: trialStatus, state: trialState, reload: reloadTrial } = useTrialStatus()

const daysRemaining = trialState
  ? Math.max(0, Math.ceil((TRIAL_DAYS - (Date.now() - new Date(trialState.installedAt).getTime())) / (24 * 60 * 60 * 1000)))
  : undefined

const analysisRemaining = trialState
  ? Math.max(0, TRIAL_ANALYSIS_LIMIT - trialState.analysisUsed)
  : undefined
```

3. 在搜索框上方（`{errorMessage && ...}` 之前）插入 TrialBanner：
```tsx
<TrialBanner
  status={trialStatus}
  daysRemaining={daysRemaining}
  analysisRemaining={analysisRemaining}
  onActivated={() => void reloadTrial()}
/>
```

**Step 2: Typecheck**

```bash
npm run typecheck
```
预期：无错误

**Step 3: Commit**

```bash
git add src/sidepanel.tsx
git commit -m "feat(trial): integrate trial status into SidePanel"
```

---

## Task 10: 将 License 激活入口集成到 Options 页

**Files:**
- Modify: `src/options.tsx`

**Step 1: 在 Settings 页 Maintenance 区块下方添加 License 区块**

打开 `src/options.tsx`，在 `SettingsTabContent` 函数中，`Maintenance` section 之后添加：

```tsx
<section data-testid="settings-section-card" style={cardStyle}>
  <div style={cardHeaderStyle}>
    <h2 style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: theme.textPrimary }}>License</h2>
  </div>
  <div style={{ padding: "20px", display: "grid", gap: spacing.md }}>
    <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.6, color: theme.textMuted }}>
      Enter your license key to unlock full access. Keys are available at tabvault.lemonsqueezy.com.
    </p>
    <LicenseActivation onActivated={() => window.location.reload()} />
  </div>
</section>
```

在 options.tsx 顶部添加 import：
```typescript
import { LicenseActivation } from "./components/license-activation"
```

**Step 2: Typecheck**

```bash
npm run typecheck
```
预期：无错误

**Step 3: Commit**

```bash
git add src/options.tsx
git commit -m "feat(trial): add license activation section in Options"
```

---

## Task 11: 搜索结果匹配原因标注（Aha 时刻增强）

**Files:**
- Modify: `src/features/bookmarks/search-bookmarks.ts`
- Create: `tests/features/bookmarks/search-bookmarks.test.ts`

**Step 1: 查看现有 searchBookmarks 实现**

读取 `src/features/bookmarks/search-bookmarks.ts`，了解现有签名。

**Step 2: 写测试**

创建 `tests/features/bookmarks/search-bookmarks.test.ts`：

```typescript
import { describe, it, expect } from "vitest"
import { searchBookmarksWithReasons } from "../../../src/features/bookmarks/search-bookmarks"
import type { BookmarkRecord } from "../../../src/types/bookmark"

function makeBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "1",
    url: "https://example.com",
    title: "Example Title",
    aiTags: [],
    userTags: [],
    status: "done",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides
  }
}

describe("searchBookmarksWithReasons", () => {
  it("matches title and returns reason", () => {
    const bookmark = makeBookmark({ title: "React performance tips" })
    const results = searchBookmarksWithReasons([bookmark], "react")
    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("title")
  })

  it("matches summary and returns reason", () => {
    const bookmark = makeBookmark({ summary: "This article is about caching strategies" })
    const results = searchBookmarksWithReasons([bookmark], "caching")
    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("AI summary")
  })

  it("matches ai tags and returns reason", () => {
    const bookmark = makeBookmark({ aiTags: ["performance", "react"] })
    const results = searchBookmarksWithReasons([bookmark], "performance")
    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("tag")
  })

  it("returns empty array when no match", () => {
    const bookmark = makeBookmark({ title: "Vue.js guide" })
    const results = searchBookmarksWithReasons([bookmark], "react")
    expect(results).toHaveLength(0)
  })
})
```

**Step 3: 运行验证失败**

```bash
npx vitest run tests/features/bookmarks/search-bookmarks.test.ts
```
预期：FAIL

**Step 4: 在 search-bookmarks.ts 中添加新函数**

打开 `src/features/bookmarks/search-bookmarks.ts`，在文件末尾追加：

```typescript
export type SearchResultWithReason = {
  bookmark: BookmarkRecord
  matchReason: string
}

export function searchBookmarksWithReasons(
  bookmarks: BookmarkRecord[],
  query: string
): SearchResultWithReason[] {
  const q = query.trim().toLowerCase()
  if (!q) return bookmarks.map((bookmark) => ({ bookmark, matchReason: "" }))

  const results: SearchResultWithReason[] = []

  for (const bookmark of bookmarks) {
    if (bookmark.title.toLowerCase().includes(q)) {
      results.push({ bookmark, matchReason: "title" })
    } else if (bookmark.summary?.toLowerCase().includes(q)) {
      results.push({ bookmark, matchReason: "AI summary" })
    } else if ([...bookmark.aiTags, ...bookmark.userTags].some((t) => t.toLowerCase().includes(q))) {
      results.push({ bookmark, matchReason: "tag" })
    } else if (bookmark.url.toLowerCase().includes(q)) {
      results.push({ bookmark, matchReason: "URL" })
    }
  }

  return results
}
```

**Step 5: 运行验证通过**

```bash
npx vitest run tests/features/bookmarks/search-bookmarks.test.ts
```
预期：PASS

**Step 6: Commit**

```bash
git add src/features/bookmarks/search-bookmarks.ts tests/features/bookmarks/search-bookmarks.test.ts
git commit -m "feat(search): add searchBookmarksWithReasons for Aha moment"
```

---

## Task 12: 在 SidePanel 搜索结果中展示匹配原因

**Files:**
- Modify: `src/sidepanel.tsx`
- Modify: `src/components/bookmark-list.tsx`（轻微调整以支持 matchReason）

**Step 1: 在 sidepanel.tsx 中使用 searchBookmarksWithReasons**

打开 `src/sidepanel.tsx`，找到 `filteredBookmarks` 的 useMemo：

将 `searchBookmarks` 替换为 `searchBookmarksWithReasons`，并将结果传给 BookmarkList 的 `matchReasons` prop（新增）。

**Step 2: 在 BookmarkList / BookmarkCard 中展示 matchReason**

在书签列表的每条结果下方，如果 `matchReason` 非空，展示小徽章：

```tsx
{matchReason ? (
  <span style={{
    fontSize: "0.6875rem",
    padding: "1px 6px",
    borderRadius: radius.pill,
    backgroundColor: theme.accentSoft,
    color: theme.accent,
    flexShrink: 0
  }}>
    matched {matchReason}
  </span>
) : null}
```

**Step 3: Typecheck**

```bash
npm run typecheck
```
预期：无错误

**Step 4: Commit**

```bash
git add src/sidepanel.tsx src/components/bookmark-list.tsx
git commit -m "feat(search): display match reason in sidepanel search results"
```

---

## Task 13: 构建验证 & 整体测试

**Step 1: 运行全量测试**

```bash
npx vitest run
```
预期：全部 PASS，无新 FAIL

**Step 2: TypeScript 类型检查**

```bash
npm run typecheck
```
预期：无错误

**Step 3: 开发构建验证**

```bash
npm run build
```
预期：构建成功，`build/chrome-mv3-prod` 目录生成

**Step 4: 手动测试清单**

加载 `build/chrome-mv3-prod` 后验证：

- [ ] 首次打开 SidePanel：出现 Trial Banner，显示 "3d remaining, 50 AI analyses left"
- [ ] 输入无效 License Key：出现 "License key is invalid" 错误提示
- [ ] Options 页 Settings tab：底部有 License 区块和输入框
- [ ] 搜索已分析书签：结果旁显示 "matched AI summary" 或 "matched tag"
- [ ] 试用期到期后：SidePanel 显示到期提示和购买按钮

**Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat(monetization): complete trial system, license activation, and Aha moment search"
```
