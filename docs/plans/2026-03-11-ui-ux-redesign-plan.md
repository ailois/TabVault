# TabVault UI/UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 TabVault 扩展界面从"仪表盘"风格重构为极简、扁平的"AI Native"风格（参考 Raycast/Linear 设计语言）。

**Architecture:** 统一所有 UI 表面为纯白背景，去除所有结构性 `border`、`boxShadow` 和外边框容器，改用间距与排版建立视觉层次。书签列表由独立卡片改为连续列表，操作按钮在鼠标悬停时才突出显示。

**Tech Stack:** React (inline styles), TypeScript, Plasmo extension framework, Vitest

---

### Task 1: 更新设计令牌 (`src/ui/design-tokens.ts`)

**Files:**
- Modify: `src/ui/design-tokens.ts`
- Test: `tests/ui/design-tokens.test.ts`

**Step 1: 先更新测试文件，断言新的 token 结构**

将 `tests/ui/design-tokens.test.ts` 替换为以下内容：

```typescript
import { describe, expect, it } from "vitest"

import { colors, controls, radius, shadow, spacing, typography } from "../../src/ui/design-tokens"

describe("design tokens", () => {
  it("exports the core visual token groups", () => {
    expect(colors.page).toBeTruthy()
    expect(colors.surface).toBeTruthy()
    expect(colors.surfaceElevated).toBeTruthy()
    expect(colors.surfaceMuted).toBeTruthy()
    expect(colors.surfaceHover).toBeTruthy()   // NEW
    expect(colors.border).toBeTruthy()
    expect(colors.textPrimary).toBeTruthy()
    expect(colors.textSecondary).toBeTruthy()
    expect(spacing.md).toBeTruthy()
    expect(spacing.sm).toBeTruthy()
    expect(spacing.lg).toBeTruthy()
    expect(radius.large).toBeTruthy()
    expect(radius.medium).toBeTruthy()
    expect(radius.pill).toBeTruthy()
    expect(shadow.soft).toBeTruthy()           // kept for sticky footer
    expect(typography.title.size).toBeTruthy()
    expect(typography.metadata.size).toBeTruthy()
    expect(typography.tag.size).toBeTruthy()
    expect(controls.primary.background).toBeTruthy()
    expect(controls.secondary.background).toBeTruthy()
    expect(controls.input.background).toBeTruthy()
    expect(controls.focusOutline).toBeTruthy()
  })

  it("uses a flat white canvas", () => {
    expect(colors.page).toBe("#ffffff")
    expect(colors.surface).toBe("#ffffff")
  })

  it("has a surfaceHover color for interactive list items", () => {
    expect(colors.surfaceHover).toBe("#f8fafc")
  })
})
```

**Step 2: 运行测试，确认它失败**

```bash
npx vitest run tests/ui/design-tokens.test.ts
```

预期：FAIL，因为 `colors.surfaceHover` 不存在，且 `colors.page` 不是 `#ffffff`。

**Step 3: 更新 design-tokens.ts**

将 `src/ui/design-tokens.ts` 替换为：

```typescript
export const colors = {
  page: "#ffffff",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  surfaceMuted: "#f4f4f5",
  surfaceHover: "#f8fafc",
  border: "#e4e4e7",
  borderMuted: "#f1f5f9",
  borderStrong: "#94a3b8",
  borderFocus: "#2563eb",
  textPrimary: "#0f172a",
  textSecondary: "#3f3f46",
  textMuted: "#71717a",
  textSuccess: "#166534",
  textDanger: "#b91c1c"
} as const

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px"
} as const

export const radius = {
  small: "4px",
  medium: "6px",
  large: "8px",
  pill: "999px"
} as const

export const shadow = {
  soft: "0 -1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)"
} as const

export const typography = {
  title: {
    size: "1rem",
    lineHeight: 1.3,
    weight: 600
  },
  metadata: {
    size: "0.85rem",
    lineHeight: 1.4
  },
  tag: {
    size: "0.78rem",
    weight: 600
  },
  body: {
    lineHeight: 1.5
  }
} as const

export const controls = {
  primary: {
    background: "#0f172a",
    foreground: "#ffffff"
  },
  secondary: {
    background: "#f4f4f5",
    foreground: "#0f172a"
  },
  input: {
    background: "#f8fafc",
    border: "#e2e8f0"
  },
  focusOutline: "#2563eb"
} as const

export const GLOBAL_FOCUS_STYLES = `
input:focus, select:focus, textarea:focus {
  border-color: ${colors.borderFocus} !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
  outline: none !important;
}
button:focus-visible {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
  outline: none !important;
}
` as const
```

**注意：** 删除了 `shadow.medium`。凡是在其他文件中引用 `shadow.medium` 的地方，将在后续任务中一并处理。

**Step 4: 运行测试确认通过**

```bash
npx vitest run tests/ui/design-tokens.test.ts
```

预期：PASS

**Step 5: 提交**

```bash
git add src/ui/design-tokens.ts tests/ui/design-tokens.test.ts
git commit -m "feat: update design tokens for minimalist flat aesthetic"
```

---

### Task 2: 重构 Error Banner (`src/components/error-banner.tsx`)

**Files:**
- Modify: `src/components/error-banner.tsx`

**Step 1: 将 error-banner.tsx 修改为柔和的错误样式**

将 `errorBannerStyle` 从有红色边框的样式改为软底色方案：

```tsx
import React from "react"

import { radius, spacing } from "../ui/design-tokens"

type ErrorBannerProps = {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <article data-feedback-kind="error" role="alert" style={errorBannerStyle}>
      <h3 style={errorTitleStyle}>Error</h3>
      <p style={errorMessageStyle}>{message}</p>
    </article>
  )
}

const errorBannerStyle: React.CSSProperties = {
  padding: `${spacing.sm} ${spacing.md}`,
  borderRadius: radius.medium,
  backgroundColor: "#fef2f2",
  color: "#991b1b"
}

const errorTitleStyle: React.CSSProperties = {
  margin: "0 0 4px 0",
  fontSize: "0.875rem",
  fontWeight: 600
}

const errorMessageStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  lineHeight: 1.5
}
```

**Step 2: 运行相关测试**

```bash
npx vitest run tests/ui/popup-state.test.tsx
```

预期：PASS（ErrorBanner 测试不断言具体样式，只检查元素渲染）

**Step 3: 提交**

```bash
git add src/components/error-banner.tsx
git commit -m "feat: soften error banner to tinted background without border"
```

---

### Task 3: 扁平化书签列表 (`src/components/bookmark-list.tsx`)

**Files:**
- Modify: `src/components/bookmark-list.tsx`
- Test: `tests/ui/bookmark-card.test.tsx` (检查但不一定修改)

**Step 1: 先阅读现有测试，了解哪些行为会被测试**

```bash
npx vitest run tests/ui/bookmark-card.test.tsx
```

确认测试全部通过。

**Step 2: 更新 bookmark-list.tsx 样式**

找到文件底部的样式常量（第 154 行往后），做以下修改：

**listStyle** — 去掉 `gap: spacing.sm`，改为无间距列表（将由每条目的 padding 控制）：
```typescript
const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0
}
```

**cardStyle** — 去除边框、圆角、阴影，改为带悬停感的扁平条目：
```typescript
const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  borderBottom: `1px solid ${colors.borderMuted}`,
  padding: `${spacing.md} ${spacing.sm}`,
  display: "grid",
  gap: spacing.xs,
  cursor: "pointer",
  transition: "background-color 0.15s ease"
}
```

（hover 状态用 JavaScript onMouseEnter/onMouseLeave 实现，见下方）

**analyzeButtonStyle** — 移除边框，降低对比度，仅保留文字样式：
```typescript
const analyzeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  borderRadius: radius.small,
  cursor: "pointer",
  color: colors.textMuted,
  fontSize: "0.75rem",
  fontWeight: 500,
  padding: "2px 6px",
  transition: "color 0.1s ease"
}
```

**tagStyle** — 去除边框，保留柔和底色：
```typescript
const tagStyle: React.CSSProperties = {
  backgroundColor: colors.surfaceMuted,
  borderRadius: radius.pill,
  color: colors.textSecondary,
  fontSize: typography.tag.size,
  fontWeight: typography.tag.weight,
  padding: "2px 8px"
}
```

**Step 3: 为 BookmarkCard 添加 hover 状态**

在 `BookmarkCard` 函数内添加 hover 状态：

```typescript
function BookmarkCard({ bookmark, onDelete, onAnalyze }: BookmarkCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)    // ADD THIS

  const showAnalyzeButton = bookmark.status === "saved" || bookmark.status === "error"

  // ... 其余逻辑不变 ...

  return (
    <article
      data-bookmark-card="true"
      style={{ ...cardStyle, backgroundColor: hovered ? colors.surfaceHover : colors.surface }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 内部 JSX 保持不变 */}
    </article>
  )
}
```

**Step 4: 运行书签卡片测试**

```bash
npx vitest run tests/ui/bookmark-card.test.tsx
```

预期：PASS

**Step 5: 提交**

```bash
git add src/components/bookmark-list.tsx
git commit -m "feat: flatten bookmark list to continuous feed with hover states"
```

---

### Task 4: 重构 Popup (`src/popup.tsx`)

**Files:**
- Modify: `src/popup.tsx`
- Test: `tests/ui/popup-state.test.tsx`

**Step 1: 运行 popup 测试，确认当前状态**

```bash
npx vitest run tests/ui/popup-state.test.tsx
```

预期：PASS（作为基线）

**Step 2: 更新 popup 布局结构和样式**

目标：
- 搜索框移到顶部，无边框
- 去除 `actionsSectionStyle` 的 border/shadow/borderRadius
- 状态消息从 bordered card 改为简单文本
- "Save current page" 按钮固定在底部

**修改 JSX 结构**（第 259-323 行），替换为：

```tsx
return (
  <main aria-labelledby="popup-title" style={pageStyle}>
    <div data-testid="popup-shell" style={shellStyle}>
      {/* 搜索框 — 始终置顶 */}
      <div style={searchBarStyle}>
        <label htmlFor="bookmark-search" style={visuallyHiddenStyle}>Search bookmarks</label>
        <input
          id="bookmark-search"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search title, URL, summary, tags..."
          style={searchInputStyle}
          type="search"
          value={searchQuery}
        />
      </div>

      {/* 次要操作行 */}
      <section aria-labelledby="popup-actions-title" style={actionsRowStyle}>
        <h2 id="popup-actions-title" style={visuallyHiddenStyle}>Actions</h2>
        <button
          data-testid="popup-secondary-action"
          disabled={isLoadingBookmarks || isSaving || isAnalyzing}
          onClick={() => void loadBookmarks()}
          style={secondaryActionButtonStyle}
          type="button">
          {isLoadingBookmarks ? "Loading..." : "Reload"}
        </button>
        <button
          data-testid="popup-analyze-all-action"
          disabled={!hasPendingBookmarks || isSaving || analyzeProgress !== null}
          onClick={() => void handleAnalyzeAll()}
          style={secondaryActionButtonStyle}
          type="button">
          {analyzeProgress
            ? `Analyzing ${analyzeProgress.current}/${analyzeProgress.total}...`
            : "Analyze all"}
        </button>
      </section>

      {/* 状态 / 错误反馈 — 内联文本，非卡片 */}
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      {!errorMessage && statusTone === "success" ? (
        <p aria-live="polite" role="status" style={statusTextStyle}>{statusMessage}</p>
      ) : null}

      {/* 书签数量标签 + 列表 */}
      <section aria-labelledby="popup-library-title" style={librarySectionStyle}>
        <h2 id="popup-library-title" style={libraryHeadingStyle}>
          Library
          <span style={bookmarkCountStyle}>{filteredBookmarks.length}</span>
        </h2>
        <BookmarkList bookmarks={filteredBookmarks} onDelete={handleDeleteBookmark} onAnalyze={handleAnalyzeBookmark} />
      </section>

      {/* 主操作按钮 — 固定底部 */}
      <footer style={stickyFooterStyle}>
        <button
          data-testid="popup-primary-action"
          disabled={isSaving || isAnalyzing}
          onClick={() => void handleSaveCurrentPage()}
          style={primaryActionButtonStyle}
          type="button">
          {isAnalyzing ? "Analyzing..." : isSaving ? "Saving..." : "Save current page"}
        </button>
      </footer>
    </div>
  </main>
)
```

**Step 3: 更新/替换样式常量**（文件末尾，第 341 行往后）：

```typescript
const pageStyle: React.CSSProperties = {
  width: "400px",
  height: "560px",
  overflow: "hidden",
  backgroundColor: colors.page,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column"
}

const shellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: colors.page
}

const searchBarStyle: React.CSSProperties = {
  padding: `${spacing.md} ${spacing.md} ${spacing.sm}`
}

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "none",
  borderBottom: `1px solid ${colors.borderMuted}`,
  borderRadius: 0,
  backgroundColor: "transparent",
  color: colors.textPrimary,
  fontSize: "0.9375rem"
}

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing.sm,
  padding: `0 ${spacing.md} ${spacing.sm}`
}

const secondaryActionButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  border: "none",
  borderRadius: radius.pill,
  backgroundColor: colors.secondary.background,  // <- 注意：此处应写 controls.secondary.background
  color: colors.textMuted,
  fontSize: "0.8125rem",
  fontWeight: 500,
  cursor: "pointer"
}
```

> **重要：** `secondary.background` 改为 `controls.secondary.background`，不要写错。

```typescript
const secondaryActionButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  border: "none",
  borderRadius: radius.pill,
  backgroundColor: controls.secondary.background,
  color: colors.textMuted,
  fontSize: "0.8125rem",
  fontWeight: 500,
  cursor: "pointer"
}

const statusTextStyle: React.CSSProperties = {
  margin: `0 ${spacing.md}`,
  fontSize: "0.8125rem",
  color: colors.textSuccess,
  padding: `0 0 ${spacing.xs}`
}

const librarySectionStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  minHeight: 0
}

const libraryHeadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  margin: 0,
  padding: `${spacing.xs} ${spacing.md}`,
  fontSize: "0.75rem",
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em"
}

const bookmarkCountStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1px 6px",
  borderRadius: radius.pill,
  backgroundColor: colors.surfaceMuted,
  fontSize: "0.7rem",
  fontWeight: 600,
  color: colors.textMuted
}

const stickyFooterStyle: React.CSSProperties = {
  padding: spacing.md,
  borderTop: `1px solid ${colors.borderMuted}`,
  backgroundColor: colors.page,
  boxShadow: shadow.soft
}

const primaryActionButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: `${spacing.sm} ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.primary.background,
  color: controls.primary.foreground,
  fontWeight: 600,
  fontSize: "0.9375rem",
  cursor: "pointer"
}

const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0
}
```

**同时删除以下不再使用的样式常量：**
- `actionsRowStyle`（旧版，现已在上方重建）
- `actionButtonStyle`
- `actionsSectionStyle`
- `feedbackSectionStyle`
- `getStatusCardStyle`

**Step 4: 运行 popup 测试**

```bash
npx vitest run tests/ui/popup-state.test.tsx
```

预期：PASS。如果测试中对布局中某些按钮的位置做了断言，请检查测试以定位失败原因，然后更新相关测试（仅当测试测的是已删除的 `actionsSectionStyle` 等实现细节时才更新）。

**Step 5: 运行类型检查**

```bash
npm run typecheck
```

预期：无错误

**Step 6: 提交**

```bash
git add src/popup.tsx
git commit -m "feat: refactor popup to command-and-feed layout with sticky save button"
```

---

### Task 5: 重构 Options 页面 (`src/options.tsx`)

**Files:**
- Modify: `src/options.tsx`
- Test: `tests/ui/options.test.tsx`, `tests/ui/options-save-state.test.tsx`, `tests/ui/options-load-state.test.tsx`

**Step 1: 运行 Options 测试作为基线**

```bash
npx vitest run tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx tests/ui/options-load-state.test.tsx
```

预期：PASS

**Step 2: 更新 options.tsx 样式常量（第 225 行往后）**

**pageSectionsStyle** — 增加段与段之间的间距：
```typescript
const pageSectionsStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.lg
}
```

**sectionCardStyle** — 去除边框、阴影，改为纯粹靠间距分隔：
```typescript
const sectionCardStyle: React.CSSProperties = {
  padding: `0 0 ${spacing.lg} 0`,
  borderBottom: `1px solid ${colors.borderMuted}`
}
```

**selectStyle** — 无边框，使用柔和底色：
```typescript
const selectStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: `${spacing.sm} ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.input.background,
  color: colors.textPrimary,
  fontSize: "0.875rem",
  transition: "background-color 0.15s ease"
}
```

**enabledRowContainerStyle** — 去除边框和背景容器：
```typescript
const enabledRowContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
}
```

**saveActionsSectionStyle** — 更细腻的 sticky footer：
```typescript
const saveActionsSectionStyle: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.md,
  padding: `${spacing.md} ${spacing.lg}`,
  borderTop: `1px solid ${colors.borderMuted}`,
  backgroundColor: colors.page,
  boxShadow: shadow.soft
}
```

**Step 3: 运行 Options 测试**

```bash
npx vitest run tests/ui/options.test.tsx tests/ui/options-save-state.test.tsx tests/ui/options-load-state.test.tsx
```

预期：PASS

**Step 4: 运行 typecheck**

```bash
npm run typecheck
```

预期：无错误

**Step 5: 提交**

```bash
git add src/options.tsx
git commit -m "feat: flatten options page to document-style typography-driven layout"
```

---

### Task 6: 重构 Provider Settings Form (`src/components/provider-settings-form.tsx`)

**Files:**
- Modify: `src/components/provider-settings-form.tsx`
- Test: `tests/ui/provider-connection-test.test.tsx`

**Step 1: 运行表单测试作为基线**

```bash
npx vitest run tests/ui/provider-connection-test.test.tsx
```

**Step 2: 更新样式常量**

**enabledRowStyle** — 去除灰色容器框：
```typescript
const enabledRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: spacing.sm
}
```

**inputStyle** — 无边框，柔和底色：
```typescript
const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: `${spacing.sm} ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.input.background,
  fontSize: "0.875rem",
  color: colors.textPrimary,
  transition: "background-color 0.15s ease"
}
```

**testButtonStyle** — 改为灰底按钮，去除 border：
```typescript
const testButtonStyle: React.CSSProperties = {
  padding: `6px ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.secondary.background,
  color: colors.textSecondary,
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer"
}
```

**Step 3: 运行测试**

```bash
npx vitest run tests/ui/provider-connection-test.test.tsx
```

预期：PASS

**Step 4: 提交**

```bash
git add src/components/provider-settings-form.tsx
git commit -m "feat: borderless inputs and clean toggle rows in provider settings form"
```

---

### Task 7: 更新 Sidepanel (`src/sidepanel.tsx`)

**Files:**
- Modify: `src/sidepanel.tsx`
- Test: `tests/ui/sidepanel.test.tsx`

**Step 1: 运行 sidepanel 测试作为基线**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

**Step 2: 更新 sidepanel.tsx，应用扁平样式**

将 `src/sidepanel.tsx` 替换为：

```tsx
import React, { useState } from "react"
import { colors, controls, radius, spacing } from "./ui/design-tokens"

export default function SidePanel() {
  const [status, setStatus] = useState<string>("")
  const [isImporting, setIsImporting] = useState(false)

  async function handleImport() {
    setIsImporting(true)
    setStatus("Importing...")

    globalThis.chrome?.runtime?.sendMessage({ type: "IMPORT_BOOKMARKS" }, (response: any) => {
      setIsImporting(false)
      if (response?.success) {
        setStatus(`Imported ${response.count} bookmarks`)
      } else {
        setStatus("Import failed")
      }
    })
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>TabVault Pro</h1>
        <p style={subtitleStyle}>Import and manage your bookmarks.</p>
      </header>

      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Chrome Bookmarks</h2>
        <p style={sectionDescriptionStyle}>
          Import your existing Chrome bookmarks into TabVault for AI-powered search and analysis.
        </p>
        <button
          disabled={isImporting}
          onClick={() => void handleImport()}
          style={importButtonStyle}
          type="button">
          {isImporting ? "Importing..." : "Import Chrome Bookmarks"}
        </button>
        {status && <p style={statusStyle}>{status}</p>}
      </section>
    </main>
  )
}

const pageStyle: React.CSSProperties = {
  padding: spacing.lg,
  backgroundColor: colors.page,
  minHeight: "100vh",
  boxSizing: "border-box"
}

const headerStyle: React.CSSProperties = {
  marginBottom: spacing.xl
}

const titleStyle: React.CSSProperties = {
  margin: "0 0 4px 0",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: colors.textPrimary
}

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.textMuted,
  fontSize: "0.875rem"
}

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.md
}

const sectionHeadingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: 600,
  color: colors.textPrimary
}

const sectionDescriptionStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  color: colors.textMuted,
  lineHeight: 1.6
}

const importButtonStyle: React.CSSProperties = {
  padding: `${spacing.sm} ${spacing.md}`,
  border: "none",
  borderRadius: radius.medium,
  backgroundColor: controls.primary.background,
  color: controls.primary.foreground,
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
  width: "fit-content"
}

const statusStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  color: colors.textMuted
}
```

**Step 3: 运行 sidepanel 测试**

```bash
npx vitest run tests/ui/sidepanel.test.tsx
```

预期：PASS

**Step 4: 提交**

```bash
git add src/sidepanel.tsx
git commit -m "feat: apply flat minimalist styles to sidepanel"
```

---

### Task 8: 最终验证

**Step 1: 运行全量测试**

```bash
npx vitest run
```

预期：全部通过

**Step 2: 运行类型检查**

```bash
npm run typecheck
```

预期：无错误

**Step 3: 构建并手动检查**

```bash
npm run dev
```

在 Chrome 中加载扩展（`build/chrome-mv3-dev`），依次检查：
- **Popup：** 搜索框置顶，书签列表扁平，鼠标悬停时有 `#f8fafc` 背景，Save 按钮固定底部
- **Options：** 设置流垂直排列，无卡片盒子，输入框无边框，Save 按钮固定底部
- **Sidepanel：** 导入区域无边框容器，整体白色背景

**Step 4: 提交**

如果有测试更新：

```bash
git add -A
git commit -m "test: update ui tests to match new minimalist design tokens"
```

---

## 实现注意事项

1. **`shadow.medium` 已从设计令牌中移除**。如果在 Task 1 之外的文件中仍引用 `shadow.medium`，TypeScript 会在 typecheck 时报错，按报错提示修改即可。
2. **hover 状态**用 React 内联状态实现（`onMouseEnter`/`onMouseLeave`），不需要额外的 CSS-in-JS 库。
3. **Popup 的 `statusMessage` 显示逻辑调整**：只有 `statusTone === "success"` 时才显示内联文本。"info" 状态的默认文本（"Ready to save..."）不再显示，避免产生噪音。
4. 如果测试断言特定的 `data-tone` 属性或 `data-feedback-kind="status"` 元素存在，需要按实际 JSX 调整测试，但**不要改变组件行为，只改样式**。
