# Resizable Columns Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为书签工作区的三列布局（文件夹 | 书签列表 | 详情面板）添加可拖拽分隔栏，让用户能自由调整各列宽度。

**Architecture:** 将 `BookmarksTab` 中的固定 CSS Grid 布局（`280px minmax(0, 1fr) 360px`）改为 Flexbox 布局，在列间插入可拖拽分隔条组件。使用 React `useState` 管理各列宽度，`useRef` + `mousemove`/`mouseup` 事件处理拖拽逻辑。

**Tech Stack:** React, TypeScript, 内联样式（无额外依赖）

---

### Task 1: 在 options.tsx 中添加 useColumnResize Hook

**Files:**
- Modify: `src/options.tsx`（在文件顶部附近，`BookmarksTab` 函数之前）

**Step 1: 在 `options.tsx` 中 `BookmarksTab` 函数定义之前添加 `useColumnResize` hook**

找到 `function BookmarksTab(` 这一行（约第 972 行），在其上方插入以下代码：

```tsx
type ColumnWidths = {
  folders: number
  details: number
}

function useColumnResize(initial: ColumnWidths) {
  const [widths, setWidths] = React.useState<ColumnWidths>(initial)
  const draggingRef = React.useRef<"folders-list" | "list-details" | null>(null)
  const startXRef = React.useRef(0)
  const startWidthRef = React.useRef(0)

  const handleMouseDown = React.useCallback(
    (divider: "folders-list" | "list-details") =>
      (e: React.MouseEvent) => {
        e.preventDefault()
        draggingRef.current = divider
        startXRef.current = e.clientX
        startWidthRef.current = divider === "folders-list" ? widths.folders : widths.details
      },
    [widths]
  )

  React.useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return
      const delta = e.clientX - startXRef.current
      if (draggingRef.current === "folders-list") {
        setWidths((w) => ({
          ...w,
          folders: Math.max(180, Math.min(400, startWidthRef.current + delta))
        }))
      } else {
        setWidths((w) => ({
          ...w,
          details: Math.max(240, Math.min(600, startWidthRef.current - delta))
        }))
      }
    }
    function onMouseUp() {
      draggingRef.current = null
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  return { widths, handleMouseDown }
}
```

**Step 2: 验证代码可正常插入**

打开文件确认 `useColumnResize` 定义出现在 `BookmarksTab` 之前，且 TypeScript 不报错。

---

### Task 2: 添加 ResizeDivider 组件

**Files:**
- Modify: `src/options.tsx`（紧接在 `useColumnResize` hook 之后，`BookmarksTab` 之前）

**Step 1: 在 `useColumnResize` 结束后、`BookmarksTab` 之前插入 `ResizeDivider` 组件**

```tsx
function ResizeDivider({
  onMouseDown,
  isDragging
}: {
  onMouseDown: (e: React.MouseEvent) => void
  isDragging: boolean
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: "5px",
        flexShrink: 0,
        cursor: "col-resize",
        position: "relative",
        userSelect: "none",
        zIndex: 1
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "1px",
          left: "2px",
          backgroundColor:
            isHovered || isDragging
              ? "rgba(99,102,241,0.5)"
              : "transparent",
          transition: "background-color 0.15s ease"
        }}
      />
    </div>
  )
}
```

---

### Task 3: 更新 BookmarksTab 三列布局使用 Flexbox + 拖拽分隔栏

**Files:**
- Modify: `src/options.tsx`（`BookmarksTab` 函数内部，约第 1242-1252 行三列容器）

**Step 1: 在 `BookmarksTab` 函数体顶部调用 hook**

找到 `function BookmarksTab(` 内，在所有现有 `const [...]` state 声明之后（约第 983 行 `const [autoRetryEnabled, ...` 之后），插入：

```tsx
const { widths, handleMouseDown } = useColumnResize({ folders: 280, details: 360 })
const [activeDivider, setActiveDivider] = React.useState<"folders-list" | "list-details" | null>(null)
```

**Step 2: 将三列网格容器改为 Flexbox**

找到如下代码段（约第 1242-1252 行）：

```tsx
<div style={{
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr) 360px",
  border: `1px solid ${theme.border}`,
  borderRadius: "20px",
  overflow: "hidden",
  backgroundColor: theme.surface,
  minHeight: "560px",
  minWidth: 0,
  boxShadow: theme.isDark ? "0 10px 28px rgba(0,0,0,0.24)" : "0 8px 24px rgba(15,23,42,0.06)"
}}>
```

替换为：

```tsx
<div style={{
  display: "flex",
  border: `1px solid ${theme.border}`,
  borderRadius: "20px",
  overflow: "hidden",
  backgroundColor: theme.surface,
  minHeight: "560px",
  minWidth: 0,
  boxShadow: theme.isDark ? "0 10px 28px rgba(0,0,0,0.24)" : "0 8px 24px rgba(15,23,42,0.06)",
  userSelect: activeDivider ? "none" : undefined
}}>
```

**Step 3: 给文件夹列设置固定宽度**

找到文件夹列的外层 `<div>`（约第 1253 行，带 `borderRight` 和 `backgroundColor: theme.surfaceSubtle` 的那个），在其 style 中添加宽度：

```tsx
<div style={{
  width: `${widths.folders}px`,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  borderRight: "none",   // 移除右边框，由分隔栏承担视觉分隔
  backgroundColor: theme.surfaceSubtle
}}>
```

**Step 4: 在文件夹列之后插入第一个分隔栏**

在文件夹列 `</div>` 结束后、书签列表 `<div data-testid="bookmark-list-column"` 之前插入：

```tsx
<ResizeDivider
  onMouseDown={(e) => {
    setActiveDivider("folders-list")
    handleMouseDown("folders-list")(e)
  }}
  isDragging={activeDivider === "folders-list"}
/>
```

**Step 5: 给书签列表列设置 flex:1**

找到 `<div data-testid="bookmark-list-column"` 的 style，修改为（保持其他属性不变，只移除 `borderRight` 并让其 flex 填充）：

```tsx
<div
  data-testid="bookmark-list-column"
  style={{
    flex: 1,
    minWidth: 200,
    display: "flex",
    flexDirection: "column",
    borderRight: "none",
    backgroundColor: theme.surface
  }}
>
```

**Step 6: 在书签列表列之后插入第二个分隔栏**

在书签列表 `</div>` 结束后、详情面板 `<div data-testid="bookmark-details-column"` 之前插入：

```tsx
<ResizeDivider
  onMouseDown={(e) => {
    setActiveDivider("list-details")
    handleMouseDown("list-details")(e)
  }}
  isDragging={activeDivider === "list-details"}
/>
```

**Step 7: 给详情面板列设置固定宽度**

找到 `<div data-testid="bookmark-details-column"` 的 style，将其改为：

```tsx
<div
  data-testid="bookmark-details-column"
  style={{
    width: `${widths.details}px`,
    flexShrink: 0,
    overflowY: "auto",
    maxHeight: "680px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.surface
  }}
>
```

**Step 8: 处理 activeDivider 随 mouseup 重置**

在 `useColumnResize` hook 的 `onMouseUp` 会清空 `draggingRef`，但 `activeDivider` state 需要在 `BookmarksTab` 层面也清空。在 Task 1 中 `useEffect` 的 `onMouseUp` 函数后，于 `BookmarksTab` 中再添加一个 effect：

在 `BookmarksTab` 所有现有 `React.useEffect` 之后（约第 1048 行后）添加：

```tsx
React.useEffect(() => {
  function onMouseUp() {
    setActiveDivider(null)
  }
  window.addEventListener("mouseup", onMouseUp)
  return () => window.removeEventListener("mouseup", onMouseUp)
}, [])
```

---

### Task 4: 构建并验证

**Step 1: 运行开发构建检查 TypeScript 错误**

```bash
cd D:/code-projects/openclaw-self/TabVault
npx plasmo build --target=chrome-mv3 2>&1 | head -50
```

预期：无 TypeScript 错误，构建成功。

**Step 2: 如有错误，根据错误信息修复**

常见问题：
- `activeDivider` 类型不匹配 → 确保类型为 `"folders-list" | "list-details" | null`
- `userSelect` 类型报错 → 改为 `userSelect: activeDivider ? ("none" as const) : undefined`

**Step 3: Commit**

```bash
git add src/options.tsx
git commit -m "feat(options): add resizable column dividers to bookmark workspace"
```

---

## 注意事项

- `ResizeDivider` 的视觉宽度为 5px（可交互区域），但视觉指示线仅 1px，hover/拖拽时变蓝
- 拖拽详情面板时 delta 取反（向左拖动 = 增大详情面板）
- `userSelect: none` 防止拖拽时选中文字，仅在拖拽激活时生效
- 文件夹列最小 180px，最大 400px；详情面板最小 240px，最大 600px
