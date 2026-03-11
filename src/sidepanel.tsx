import React, { useState } from "react"
import { spacing } from "./ui/design-tokens"

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
    <main style={{ padding: spacing.md }}>
      <header>
        <h1>TabVault Pro</h1>
        <p>Manage your bookmarks.</p>
      </header>
      <section>
        <button disabled={isImporting} onClick={() => void handleImport()} type="button">
          {isImporting ? "Importing..." : "Import Chrome Bookmarks"}
        </button>
        {status && <p>{status}</p>}
      </section>
    </main>
  )
}
