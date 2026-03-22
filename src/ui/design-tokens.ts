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
  page: "#FAFAFA",           // zinc-50
  surface: "#FFFFFF",        // white
  surfaceElevated: "#F4F4F5", // zinc-100
  surfaceSubtle: "#F4F4F5",  // zinc-100
  surfaceHover: "#F4F4F5",   // zinc-100
  border: "#E4E4E7",         // zinc-200
  borderMuted: "#F4F4F5",    // zinc-100
  borderStrong: "#A1A1AA",   // zinc-400
  borderFocus: "#4F46E5",    // indigo-600
  accent: "#4F46E5",         // indigo-600
  accentSoft: "#EEF2FF",     // indigo-50
  textPrimary: "#18181B",    // zinc-900
  textSecondary: "#3F3F46",  // zinc-700
  textMuted: "#71717A",      // zinc-500
  textSuccess: "#16A34A",    // green-600
  textDanger: "#DC2626",     // red-600
  successSoft: "#DCFCE7",    // green-100
  dangerSoft: "#FEE2E2"      // red-100
}

export const darkTokens: ThemeTokens = {
  page: "#09090B",           // zinc-950
  surface: "#18181B",        // zinc-900
  surfaceElevated: "#27272A", // zinc-800
  surfaceSubtle: "#27272A",  // zinc-800
  surfaceHover: "#3F3F46",   // zinc-700
  border: "#27272A",         // zinc-800
  borderMuted: "#27272A",    // zinc-800
  borderStrong: "#52525B",   // zinc-600
  borderFocus: "#6366F1",    // indigo-500
  accent: "#6366F1",         // indigo-500
  accentSoft: "rgba(99,102,241,0.15)",
  textPrimary: "#F4F4F5",    // zinc-100
  textSecondary: "#D4D4D8",  // zinc-300
  textMuted: "#A1A1AA",      // zinc-400
  textSuccess: "#34D399",    // emerald-400
  textDanger: "#F87171",     // red-400
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

export function buildGlobalStyles(tokens: ThemeTokens): string {
  return `
input:focus, select:focus, textarea:focus {
  border-color: ${tokens.borderFocus} !important;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
  outline: none !important;
}
button:focus-visible {
  box-shadow: 0 0 0 3px rgba(99,102,241,0.16) !important;
  outline: none !important;
}
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: ${tokens.page};
}
::-webkit-scrollbar-thumb {
  background: ${tokens.borderStrong};
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: ${tokens.textMuted};
}
* {
  scrollbar-width: thin;
  scrollbar-color: ${tokens.borderStrong} ${tokens.page};
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
