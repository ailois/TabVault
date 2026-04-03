# I18n Global Sync + Sidebar Fix + Custom Color Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three issues: (1) sidepanel/popup 未从 storage 读取显示语言，(2) settings 侧边栏导航文字硬编码中文未国际化，(3) 「自定义颜色」按钮需打开真正的 color picker，并保留紫色（taro）作为预设。

**Architecture:**
- i18n：sidepanel.tsx 和 popup.tsx 已有从 `settingsRepository.getAppSettings()` 读语言的机制，但 sidepanel 缺少这一步；需补上并监听 storage 变更（chrome.storage.onChanged）以实现即时切换。
- sidebar i18n：options.tsx 中的导航按钮文字改为用 `t()` 函数，并在 messages.ts 中补 key。
- Custom color：新增一个 `"custom"` ThemeName，存储自定义 accent 色到 chrome.storage；ThemeRepository 扩展以持久化自定义色；`use-theme.ts` 中 `buildThemeFromOverride` 识别 custom 主题并使用存储的 accent 色构建 tokens；options.tsx 中「自定义」按钮点击后弹出行内 color picker，保留 taro（紫芋色 `#9D8CBA`）作为第一个预设色。

**Tech Stack:** React, TypeScript, Chrome Extension APIs (chrome.storage.local), inline `<input type="color">`

---

## Task 1: 在 messages.ts 中补充 sidebar 导航的 i18n key

**Files:**
- Modify: `src/lib/i18n/messages.ts`

**Step 1: 在 `MessageKey` 类型末尾添加两个新 key**

在 `src/lib/i18n/messages.ts` 的 `MessageKey` union 中，在 `"sidepanel.apiKeyMissing"` 之后加入：

```typescript
  | "settings.nav.architecture"
  | "settings.nav.knowledge"
```

**Step 2: 在 `en` 对象中添加翻译**

```typescript
  "settings.nav.architecture": "Architecture",
  "settings.nav.knowledge": "Knowledge Base",
```

**Step 3: 在 `zh` 对象中添加翻译**

```typescript
  "settings.nav.architecture": "架构配置",
  "settings.nav.knowledge": "知识库管理",
```

**Step 4: Commit**

```bash
git add src/lib/i18n/messages.ts
git commit -m "feat(i18n): add sidebar nav keys for architecture and knowledge"
```

---

## Task 2: 修复 options.tsx 侧边栏导航硬编码文字

**Files:**
- Modify: `src/options.tsx:349,370`

**Step 1: 定位两个 nav 按钮的文字**

在 `options.tsx` 中，`<nav>` 里有两个按钮，文字分别是硬编码的 `⚙️ 架构配置` 和 `📚 知识库管理`。

注意：`t` 函数目前是在 `Options` 组件内定义的，但 nav 在同一组件内渲染，可以直接使用。

**Step 2: 替换为 t() 调用**

将：
```tsx
⚙️ 架构配置
```
替换为：
```tsx
⚙️ {t("settings.nav.architecture")}
```

将：
```tsx
📚 知识库管理
```
替换为：
```tsx
📚 {t("settings.nav.knowledge")}
```

**Step 3: Commit**

```bash
git add src/options.tsx
git commit -m "fix(settings): internationalize sidebar nav labels"
```

---

## Task 3: 修复 sidepanel.tsx — 从 settings 读取 displayLanguage

**Files:**
- Modify: `src/sidepanel.tsx:71-72`

**Background:** 当前 sidepanel.tsx line 71 初始化 `displayLanguage` 为 `"en"` 且没有读取 storage。需要：
1. 初始化时读取 `settingsRepository.getAppSettings().displayLanguage`
2. 监听 `chrome.storage.onChanged` 以响应语言切换（用户在 settings 保存后 sidepanel 更新）

**Step 1: 在 sidepanel 加载时读取 displayLanguage**

在 `SidePanel` 组件中，找到已有的 `useEffect` 加载 bookmarks 的模式，仿照 popup.tsx lines 83-88 的方式，在现有的某个 useEffect 或新建一个 useEffect 中：

```typescript
useEffect(() => {
  void sidePanelServices.settingsRepository.getAppSettings().then((settings) => {
    setDisplayLanguage(settings.displayLanguage)
  })
}, [sidePanelServices])
```

**Step 2: 监听 storage 变更（实时语言切换）**

在 `SidePanel` 组件中新增一个 useEffect：

```typescript
useEffect(() => {
  function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>) {
    if (changes["appSettings"]?.newValue?.displayLanguage) {
      setDisplayLanguage(changes["appSettings"].newValue.displayLanguage as "en" | "zh")
    }
  }
  globalThis.chrome?.storage?.local?.onChanged?.addListener(handleStorageChange)
  return () => globalThis.chrome?.storage?.local?.onChanged?.removeListener(handleStorageChange)
}, [])
```

**Step 3: Commit**

```bash
git add src/sidepanel.tsx
git commit -m "fix(sidepanel): load and react to displayLanguage from settings"
```

---

## Task 4: 检查并修复 popup.tsx 的语言监听

**Files:**
- Modify: `src/popup.tsx`

**Background:** popup.tsx 已有初始读取（lines 83-88），但缺少 storage 变更监听（用户在 settings 改语言后，popup 仍是旧语言）。

**Step 1: 新增 storage 监听 useEffect（仿 Task 3 Step 2）**

在 `Popup` 组件中加入同样的 storage 监听：

```typescript
useEffect(() => {
  function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>) {
    if (changes["appSettings"]?.newValue?.displayLanguage) {
      setDisplayLanguage(changes["appSettings"].newValue.displayLanguage as "en" | "zh")
    }
  }
  globalThis.chrome?.storage?.local?.onChanged?.addListener(handleStorageChange)
  return () => globalThis.chrome?.storage?.local?.onChanged?.removeListener(handleStorageChange)
}, [])
```

**Step 2: Commit**

```bash
git add src/popup.tsx
git commit -m "fix(popup): react to displayLanguage changes in storage"
```

---

## Task 5: 扩展类型系统以支持自定义主题色

**Files:**
- Modify: `src/types/settings.ts`
- Modify: `src/lib/config/theme-repository.ts`

**Background:** 需要新增一个 `"custom"` ThemeName，并在 ThemeRepository 中增加存储/读取自定义 accent 色的能力。

**Step 1: 在 settings.ts 中扩展 ThemeName**

```typescript
export type ThemeName = "cloud" | "obsidian" | "sage" | "breeze" | "taro" | "vanilla" | "custom"
```

**Step 2: 扩展 ThemeRepository 接口和实现**

在 `src/lib/config/theme-repository.ts` 中：

```typescript
const CUSTOM_ACCENT_KEY = "customAccentColor"
const NAMED_THEMES: ThemeName[] = ["cloud", "obsidian", "sage", "breeze", "taro", "vanilla", "custom"]

export interface ThemeRepository {
  getTheme(): Promise<ThemeOverride>
  setTheme(theme: ThemeName): Promise<void>
  getCustomAccent(): Promise<string | undefined>
  setCustomAccent(color: string): Promise<void>
}

// 在 ChromeThemeRepository 中实现：
async getCustomAccent(): Promise<string | undefined> {
  const result = await chrome.storage.local.get(CUSTOM_ACCENT_KEY)
  const value = result[CUSTOM_ACCENT_KEY] as string | undefined
  return typeof value === "string" && value.startsWith("#") ? value : undefined
}

async setCustomAccent(color: string): Promise<void> {
  await chrome.storage.local.set({ [CUSTOM_ACCENT_KEY]: color })
}
```

**Step 3: Commit**

```bash
git add src/types/settings.ts src/lib/config/theme-repository.ts
git commit -m "feat(theme): add custom ThemeName and custom accent color storage"
```

---

## Task 6: 扩展 use-theme.ts 以支持自定义颜色

**Files:**
- Modify: `src/ui/use-theme.ts`

**Background:** `buildThemeFromOverride` 目前只处理已知 ThemeName。需要支持 `"custom"` 主题，用自定义 accent 色替换默认颜色。

**Step 1: 修改 useTheme hook 存储自定义 accent**

在 `useTheme` 中新增 `customAccent` state 并在初始化时读取：

```typescript
const [customAccent, setCustomAccent] = useState<string | undefined>(undefined)

useEffect(() => {
  void repo.getCustomAccent().then(setCustomAccent)
}, [repo])
```

**Step 2: 修改 buildThemeFromOverride 为函数，接受可选 customAccent 参数**

将 `buildThemeFromOverride` 改为接受两个参数：

```typescript
export function buildThemeFromOverride(override: ThemeOverride, customAccent?: string): Theme {
  if (!override) return THEME_TOKEN_MAP[FALLBACK_THEME]
  if (override === "custom") {
    const accent = customAccent ?? "#9D8CBA" // 默认紫芋色
    const accentHover = accent // 简化处理，可后续优化
    return {
      ...lightTokens,
      name: "custom",
      accent,
      accentHover,
      accentSoft: `${accent}1A`, // 10% opacity hex
      borderFocus: accent,
      shadow: shadow.light,
      isDark: false
    }
  }
  return THEME_TOKEN_MAP[override] ?? THEME_TOKEN_MAP[FALLBACK_THEME]
}
```

**Step 3: 在 useTheme 中使用 customAccent**

将 `const currentTheme = buildThemeFromOverride(override)` 改为：
```typescript
const currentTheme = buildThemeFromOverride(override, customAccent)
```

**Step 4: 导出 applyTheme 时支持更新 customAccent**

新增 `setCustomAccent` 到 `ThemeWithToggle` 类型，并在 hook 中实现：

```typescript
export type ThemeWithToggle = Theme & {
  setTheme: (theme: ThemeName) => void
  setCustomAccentColor: (color: string) => void
  toggle: () => void
}

function applyCustomAccent(color: string): void {
  setCustomAccent(color)
  void repo.setCustomAccent(color)
  if (override !== "custom") {
    setOverride("custom")
    void repo.setTheme("custom")
  }
}

return {
  ...currentTheme,
  setTheme: applyTheme,
  setCustomAccentColor: applyCustomAccent,
  toggle
}
```

**Step 5: 监听 storage 变更以响应 customAccent 变化（跨页面同步）**

在 `useTheme` 中添加：
```typescript
useEffect(() => {
  const listener = (message: { type?: string; customAccent?: string }) => {
    if (message?.type === "CUSTOM_ACCENT_CHANGED" && typeof message.customAccent === "string") {
      setCustomAccent(message.customAccent)
    }
  }
  globalThis.chrome?.runtime?.onMessage?.addListener(listener)
  return () => globalThis.chrome?.runtime?.onMessage?.removeListener(listener)
}, [])
```

并在 `applyCustomAccent` 中广播：
```typescript
globalThis.chrome?.runtime?.sendMessage({ type: "CUSTOM_ACCENT_CHANGED", customAccent: color })
```

**Step 6: Commit**

```bash
git add src/ui/use-theme.ts
git commit -m "feat(theme): support custom accent color in useTheme"
```

---

## Task 7: 修改 options.tsx — 自定义颜色按钮 + color picker UI

**Files:**
- Modify: `src/options.tsx`

**Background:** 当前 `THEME_CARDS` 中 `taro` 是「自定义」，但实际对应紫芋主题。需要：
1. 恢复 `taro` 为正常预设主题（芋色）
2. 新增 `custom` 卡片，点击后展开 color picker
3. Color picker 中提供预设色（第一个是紫芋 `#9D8CBA`）

**Step 1: 修改 THEME_CARDS，恢复 taro 并添加 custom**

```typescript
const THEME_CARDS: ThemeCardDefinition[] = [
  { theme: "sage", label: "鼠尾草", chipColor: "#6B8E73" },
  { theme: "breeze", label: "海风蓝", chipColor: "#5B7C99" },
  { theme: "vanilla", label: "香草色", chipColor: "#D4A373" },
  { theme: "cloud", label: "极简浅", chipColor: "#FAFAFA" },
  { theme: "obsidian", label: "深邃暗", chipColor: "#121214", dark: true },
  { theme: "taro", label: "芋色", chipColor: "#9D8CBA" },
  { theme: "custom", label: "自定义", chipColor: "#9D8CBA", emoji: "🎨" }
]
```

同时更新 `ThemeCardDefinition` 类型以包含 `"custom"`:
```typescript
type ThemeCardDefinition = {
  theme: ThemeName  // 已包含 "custom"
  label: string
  chipColor: string
  dark?: boolean
  emoji?: string
}
```

**Step 2: 在 SettingsContent 中添加自定义颜色状态**

```typescript
const [showColorPicker, setShowColorPicker] = React.useState(false)
const [customColorDraft, setCustomColorDraft] = React.useState("#9D8CBA")

// 预设色列表（紫色放第一）
const PRESET_COLORS = [
  "#9D8CBA", // 芋紫
  "#6B8E73", // 鼠尾草绿
  "#5B7C99", // 海风蓝
  "#D4A373", // 香草橙
  "#E07B54", // 赤陶橙
  "#C2587B", // 玫瑰红
  "#4A90B8", // 天蓝
  "#7B9E6B", // 苔绿
]
```

**Step 3: 修改主题按钮 onClick 逻辑**

```typescript
onClick={() => {
  if (themeOption.theme === "custom") {
    setShowColorPicker((prev) => !prev)
    return
  }
  setShowColorPicker(false)
  setAppSettings((currentSettings) => ({
    ...currentSettings,
    theme: themeOption.theme
  }))
  theme.setTheme(themeOption.theme)
}}
```

**Step 4: 在主题按钮列表之后添加 color picker 面板**

在 `</div>` (主题按钮 grid) 之后插入：

```tsx
{showColorPicker && (
  <div
    style={{
      marginTop: "12px",
      padding: "16px",
      borderRadius: "10px",
      border: `1px solid ${theme.border}`,
      backgroundColor: theme.surfaceSubtle,
      display: "grid",
      gap: "12px"
    }}
  >
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => {
            setCustomColorDraft(color)
            theme.setCustomAccentColor(color)
            setAppSettings((s) => ({ ...s, theme: "custom" }))
          }}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "999px",
            backgroundColor: color,
            border: customColorDraft === color ? `2px solid ${theme.textPrimary}` : `2px solid transparent`,
            cursor: "pointer",
            flexShrink: 0
          }}
          title={color}
          type="button"
        />
      ))}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <input
        type="color"
        value={customColorDraft}
        onChange={(e) => {
          setCustomColorDraft(e.target.value)
          theme.setCustomAccentColor(e.target.value)
          setAppSettings((s) => ({ ...s, theme: "custom" }))
        }}
        style={{ width: "40px", height: "32px", border: "none", cursor: "pointer", borderRadius: "6px" }}
      />
      <span style={{ fontSize: "0.75rem", color: theme.textMuted }}>{customColorDraft}</span>
    </div>
  </div>
)}
```

**Step 5: 初始化 customColorDraft**

在 `SettingsContent` 中，当 `appSettings.theme === "custom"` 时，需要从 `theme` 中读取当前 accent 作为初始 draft：

在 `showColorPicker` state 初始化后加：
```typescript
React.useEffect(() => {
  if (appSettings.theme === "custom") {
    setCustomColorDraft(theme.accent)
  }
}, [appSettings.theme, theme.accent])
```

**Step 6: 处理 `theme.setCustomAccentColor` 类型**

`theme` 是 `ReturnType<typeof useTheme>`，已经在 Task 6 中扩展了 `ThemeWithToggle`，此处直接使用即可。

**Step 7: Commit**

```bash
git add src/options.tsx
git commit -m "feat(settings): add custom color picker with presets, restore taro as preset theme"
```

---

## Task 8: 更新 default-settings.ts（如果 taro 是默认主题需要核查）

**Files:**
- Read: `src/features/settings/default-settings.ts`

**Step 1: 检查默认主题**

确认 `DEFAULT_APP_SETTINGS.theme` 不是 `"taro"` 硬编码为「自定义」语义的值。如果是，改为 `"sage"`。

**Step 2: Commit（如有改动）**

```bash
git add src/features/settings/default-settings.ts
git commit -m "fix(settings): ensure default theme is not custom placeholder"
```

---

## Task 9: 在 options.tsx header/subtitle 也用 t() 处理

**Files:**
- Modify: `src/options.tsx:391-392`

**Background:** `options.tsx` line 391-392 中 subtitle 文字是硬编码中文（不走 `t()`）。

**Step 1: 检查现有 i18n key**

`settings.subtitle` 已有对应的中英文翻译，直接使用 `t("settings.subtitle")`。

line 391 当前是：
```tsx
"配置大语言模型 (LLM) 接口协议、体验外观和自动化行为。"
```

替换为：
```tsx
{t("settings.subtitle")}
```

**Step 2: Commit**

```bash
git add src/options.tsx
git commit -m "fix(settings): use i18n key for page subtitle"
```

---

## Task 10: 最终验证

**手动测试清单：**

1. 在 settings 将界面语言切换为 English → sidebar nav 应显示 "Architecture" / "Knowledge Base"
2. 切回中文 → sidebar nav 显示 "架构配置" / "知识库管理"
3. 打开 sidepanel，切换 settings 中的语言 → sidepanel 文字实时更新
4. 点击「自定义」主题按钮 → 展开 color picker 面板
5. 点击预设紫色 `#9D8CBA` → accent 变为紫色，主题应用正常
6. 拖动颜色选择器选一个红色 → accent 实时变红
7. 点击「芋色」（taro）按钮 → 应用芋紫色预设主题（与之前「自定义」直接变紫的效果相同，但现在是明确的预设）
8. 保存设置并刷新页面 → 自定义颜色持久化

**Step: Commit 确认完整**

```bash
git log --oneline -10
```
