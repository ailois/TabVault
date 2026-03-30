# Auto Import Bookmarks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 扩展安装或更新时自动导入浏览器所有书签，底部按钮改为"Sync Bookmarks"。

**Architecture:** 在 `background.ts` 的 `onInstalled` 监听器中调用已有的 `importChromeBookmarks`，完成后发送 `IMPORT_COMPLETE` 消息；sidepanel 已有监听该消息并刷新的逻辑，无需改动。底部按钮文案改为"Sync Bookmarks"，功能不变。

**Tech Stack:** TypeScript, Plasmo (Chrome Extension Framework), React, IndexedDB

---

### Task 1: 修改 background.ts — 安装/更新时自动导入

**Files:**
- Modify: `src/background.ts:225-228`

**Step 1: 找到现有 onInstalled 监听器**

打开 `src/background.ts`，找到第 225 行的：

```ts
chrome.runtime.onInstalled.addListener(() => {
  void retryErrorQueue()
})
```

**Step 2: 修改为自动导入**

将该监听器替换为：

```ts
chrome.runtime.onInstalled.addListener(() => {
  void retryErrorQueue()
  if (globalThis.chrome?.bookmarks) {
    importChromeBookmarks({
      getTree: async () => chrome.bookmarks.getTree(),
      bookmarkRepository: repo
    })
      .then(count => {
        chrome.runtime.sendMessage({ type: "IMPORT_COMPLETE", count }).catch(() => {})
      })
      .catch(() => {})
  }
})
```

**Step 3: 验证不需要新增 import**

`importChromeBookmarks` 已在文件顶部 import（第 1 行），`repo` 已在第 10 行初始化，无需额外 import。

**Step 4: 手动测试**

在 Chrome 扩展管理页面点击"重新加载"扩展，打开 sidepanel，确认书签已自动出现。

**Step 5: Commit**

```bash
git add src/background.ts
git commit -m "feat(background): auto-import bookmarks on extension install/update"
```

---

### Task 2: 修改 sidepanel.tsx — 按钮文案改为 Sync Bookmarks

**Files:**
- Modify: `src/sidepanel.tsx:555`

**Step 1: 找到按钮文案**

打开 `src/sidepanel.tsx`，找到第 555 行：

```tsx
{isImporting ? "Importing..." : `Import ${browserName} Bookmarks`}
```

**Step 2: 修改文案**

将该行替换为：

```tsx
{isImporting ? "Syncing..." : "Sync Bookmarks"}
```

**Step 3: 验证**

重新加载扩展，打开 sidepanel，确认底部按钮显示"Sync Bookmarks"，点击后显示"Syncing..."，完成后书签列表刷新。

**Step 4: Commit**

```bash
git add src/sidepanel.tsx
git commit -m "feat(sidepanel): rename import button to Sync Bookmarks"
```
