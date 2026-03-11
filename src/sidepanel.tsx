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
