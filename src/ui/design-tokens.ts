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
