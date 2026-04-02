module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./tests/**/*.{ts,tsx}",
    "./design/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        subtle: "var(--border-subtle)",
        "accent-primary": "var(--accent-primary)",
        "accent-hover": "var(--accent-hover)",
        "accent-muted": "var(--accent-muted)"
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.03)",
        "soft-hover": "0 8px 24px rgba(0, 0, 0, 0.05)"
      }
    }
  },
  plugins: []
}
