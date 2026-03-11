export const colors = {
  page: "#fafafa",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  surfaceMuted: "#f4f4f5",
  border: "#e4e4e7",
  borderMuted: "#f4f4f5",
  borderStrong: "#94a3b8",
  borderFocus: "#2563eb",
  textPrimary: "#18181b",
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
  small: "6px",
  medium: "8px",
  large: "12px",
  pill: "999px"
} as const

export const shadow = {
  soft: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
  medium: "0 4px 12px rgba(0,0,0,0.1)"
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
    background: "#18181b",
    foreground: "#fafafa"
  },
  secondary: {
    background: "#f4f4f5",
    foreground: "#18181b"
  },
  input: {
    background: "#ffffff",
    border: "#d4d4d8"
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
