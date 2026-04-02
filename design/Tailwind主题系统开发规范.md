### 🎯 给 Coding Agent 的 Tailwind 主题系统开发规范

**【核心指令 (System Prompt)】** “你现在是一个精通 Tailwind CSS 的高级前端架构师。本项目需要实现一套支持多主题无缝切换的 UI 系统。 **绝对禁止**在 HTML 组件中硬编码具体的颜色值（如 `text-[#333]`、`bg-white`、`bg-gray-900` 等）。 你必须严格按照以下定义的**语义化 Token**，通过修改 `tailwind.config.js` 和 CSS 变量来实现整体界面的渲染。UI 必须具备高级感、低饱和度和柔和的质感。”

------

#### 1. 语义化颜色字典 (Color Tokens mapping)

请在 `tailwind.config.js` 的 `theme.extend.colors` 中配置以下映射，并在后续开发中**仅使用**这些 Tailwind 类名：

- `bg-base`: 底层背景 (如 `body` 或最外层容器)
- `bg-surface`: 表面背景 (如卡片、弹窗、侧边栏)
- `text-primary`: 主文本 (标题、正文)
- `text-secondary`: 次文本 (说明、时间、占位符)
- `border-subtle`: 柔和边框 (分割线、卡片边框)
- `accent-primary`: 主强调色 (主按钮、激活状态、Logo)
- `accent-hover`: 强调色悬浮 (按钮 Hover)
- `accent-muted`: 极弱强调色 (标签背景、选中项的底色)

------

#### 2. 全局 CSS 变量定义 (Global CSS Variables)

请在全局样式文件（如 `globals.css` 或 `style.css` 的 `@layer base` 中）注入以下 6 套主题的 CSS 变量。默认主题为 `[data-theme="cloud"]`。

CSS

```
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* 1. ☁️ 极简白 (Cloud Light) - 替代传统纯白，带有极弱的暖灰，温润护眼 */
  :root, [data-theme="cloud"] {
    --bg-base: #FAFAFA;
    --bg-surface: #FFFFFF;
    --text-primary: #18181B; /* 柔和的深灰替代纯黑 */
    --text-secondary: #71717A;
    --border-subtle: #E4E4E7;
    --accent-primary: #475569; /* 高级岩石灰 */
    --accent-hover: #334155;
    --accent-muted: #F1F5F9;
  }

  /* 2. 🌌 深邃黑 (Obsidian Dark) - 替代传统纯黑，带有微弱蓝紫倾向的深渊色 */
  [data-theme="obsidian"] {
    --bg-base: #121214;
    --bg-surface: #1C1C1F;
    --text-primary: #EDEDF0; /* 柔和的偏灰白 */
    --text-secondary: #909096;
    --border-subtle: #2C2C2F;
    --accent-primary: #8BA1B7; /* 莫兰迪月光蓝 */
    --accent-hover: #A5B8CE;
    --accent-muted: #27272A;
  }

  /* 3. 🌿 鼠尾草绿 (Sage Green) - 专注、护眼、自然 */
  [data-theme="sage"] {
    --bg-base: #F4F7F4;
    --bg-surface: #FFFFFF;
    --text-primary: #2A332C;
    --text-secondary: #7A8A7D;
    --border-subtle: #E8ECE8;
    --accent-primary: #6B8E73;
    --accent-hover: #5A7A61;
    --accent-muted: #EBF0EC;
  }

  /* 4. 🌊 海风蓝 (Breeze Blue) - 清冷、理性的专业感 */
  [data-theme="breeze"] {
    --bg-base: #F4F6F9;
    --bg-surface: #FFFFFF;
    --text-primary: #2C353D;
    --text-secondary: #798A9C;
    --border-subtle: #E2E8F0;
    --accent-primary: #5B7C99;
    --accent-hover: #4A6782;
    --accent-muted: #EBF0F5;
  }

  /* 5. 🍠 芋泥紫 (Taro Purple) - 优雅、柔和的品牌延伸 */
  [data-theme="taro"] {
    --bg-base: #F8F6F9;
    --bg-surface: #FFFFFF;
    --text-primary: #352E3D;
    --text-secondary: #8D7B9C;
    --border-subtle: #EAE6EE;
    --accent-primary: #9D8CBA;
    --accent-hover: #8573A1;
    --accent-muted: #F0EBF5;
  }

  /* 6. 🍦 香草焦糖 (Vanilla) - 温暖的阅读质感，像拿铁咖啡 */
  [data-theme="vanilla"] {
    --bg-base: #FDFBF7;
    --bg-surface: #FFFFFF;
    --text-primary: #3A3530;
    --text-secondary: #8C857E;
    --border-subtle: #F5F2E9;
    --accent-primary: #D4A373;
    --accent-hover: #C39362;
    --accent-muted: #F8F3ED;
  }
}
```

------

#### 3. Tailwind Config 配置要求 (`tailwind.config.js`)

必须配置 `colors` 将 CSS 变量桥接到 Tailwind 类中。

JavaScript

```
module.exports = {
  content: ["./**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        subtle: 'var(--border-subtle)',
        'accent-primary': 'var(--accent-primary)',
        'accent-hover': 'var(--accent-hover)',
        'accent-muted': 'var(--accent-muted)',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.03)',
        'soft-hover': '0 8px 24px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
```

------

#### 4. UI 编写规范 (Coding Rules for HTML)

1. **全局背景与文字：** `body` 必须使用 `bg-base text-primary`。
2. **卡片与面板：** 使用 `bg-surface border border-subtle shadow-soft`。禁止使用深色或高对比度阴影。
3. **主要按钮：** 使用 `bg-accent-primary hover:bg-accent-hover text-surface transition-colors`。
4. **次要文本/说明：** 使用 `text-secondary text-sm`。
5. **选中状态/Tag：** 使用 `bg-accent-muted text-accent-primary`。

**代码示例 (Agent Reference):**

HTML

```
<div class="bg-white border-gray-200 text-black">...</div>

<div class="bg-surface border border-subtle text-primary shadow-soft">
    <h2 class="text-primary font-bold">标题</h2>
    <p class="text-secondary text-sm">辅助说明文字...</p>
    <button class="bg-accent-primary hover:bg-accent-hover text-surface px-4 py-2 rounded-lg">
        确认操作
    </button>
</div>
```

------

你可以把上面这段直接扔给像 Cursor、GitHub Copilot 或其他大语言模型编写代码的 Agent。它们理解了这套配置后，就能直接为你产出完美支持 6 种主题无缝切换（只需要用 JS 改变 `<body>` 上的 `data-theme` 属性即可）的前端代码，并且保证所有的页面风格完全统一！