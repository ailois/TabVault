export type ThemeTokens = {
  page: string
  surface: string
  surfaceElevated: string
  surfaceSubtle: string
  surfaceHover: string
  border: string
  borderMuted: string
  borderStrong: string
  borderFocus: string
  accent: string
  accentHover: string
  accentSoft: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  textSuccess: string
  textDanger: string
  successSoft: string
  dangerSoft: string
}

export const lightTokens: ThemeTokens = {
  page: "#F4F6F9",           // design/:root --bg-color
  surface: "#FFFFFF",        // design/:root --surface-color
  surfaceElevated: "#F4F6F9", // same as page — cards sit on page bg
  surfaceSubtle: "#F4F6F9",
  surfaceHover: "#EEF0F3",
  border: "#DEE2E6",         // design/:root --border-color
  borderMuted: "#DEE2E6",
  borderStrong: "#ADB5BD",
  borderFocus: "#5E6AD2",    // design/:root --accent-color
  accent: "#5E6AD2",         // design/:root --accent-color
  accentHover: "#4A55A2",    // design/:root --accent-hover
  accentSoft: "rgba(94,106,210,0.10)",
  textPrimary: "#212529",    // design/:root --primary-text
  textSecondary: "#6C757D",  // design/:root --secondary-text
  textMuted: "#6C757D",
  textSuccess: "#16A34A",
  textDanger: "#DC2626",
  successSoft: "#DCFCE7",
  dangerSoft: "#FEE2E2"
}

export const darkTokens: ThemeTokens = {
  page: "#1C1E23",           // design/.dark --bg-color
  surface: "#25282E",        // design/.dark --surface-color
  surfaceElevated: "#25282E",
  surfaceSubtle: "#25282E",
  surfaceHover: "#2E3139",
  border: "#383C42",         // design/.dark --border-color
  borderMuted: "#383C42",
  borderStrong: "#52575F",
  borderFocus: "#7986CB",    // design/.dark --accent-color
  accent: "#7986CB",         // design/.dark --accent-color
  accentHover: "#5C6BC0",    // design/.dark --accent-hover
  accentSoft: "rgba(121,134,203,0.15)",
  textPrimary: "#E1E1E1",    // design/.dark --primary-text
  textSecondary: "#8A8F98",  // design/.dark --secondary-text
  textMuted: "#8A8F98",
  textSuccess: "#34D399",
  textDanger: "#F87171",
  successSoft: "rgba(52,211,153,0.12)",
  dangerSoft: "rgba(248,113,113,0.12)"
}

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px"
} as const

export const radius = {
  small: "5px",
  medium: "8px",
  large: "12px",
  xl: "16px",
  pill: "999px"
} as const

export const shadow = {
  soft: "0 -1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  dark: "0 -1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.5)",
  light: "0 -1px 0 rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.06)"
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

function hexToRgb(hex: string): string {
  const normalized = hex.replace("#", "")
  const value = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized

  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)

  return `${red},${green},${blue}`
}

export function buildGlobalStyles(tokens: ThemeTokens): string {
  const accentRgb = hexToRgb(tokens.accent)

  return `
input:focus, select:focus, textarea:focus {
  border-color: ${tokens.borderFocus} !important;
  box-shadow: 0 0 0 3px rgba(${accentRgb},0.12) !important;
  outline: none !important;
}
button:focus-visible {
  box-shadow: 0 0 0 3px rgba(${accentRgb},0.16) !important;
  outline: none !important;
}
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: ${tokens.page};
}
::-webkit-scrollbar-thumb {
  background: ${tokens.border};
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: ${tokens.borderStrong};
}
* {
  scrollbar-width: thin;
  scrollbar-color: ${tokens.border} ${tokens.page};
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes tabvault-spin {
  to { transform: rotate(360deg); }
}
`
}

// Keep for backward compat
export const GLOBAL_FOCUS_STYLES = buildGlobalStyles(lightTokens)
