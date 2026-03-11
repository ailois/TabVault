import React from "react"
import { spacing } from "./ui/design-tokens"

export default function SidePanel() {
  return (
    <main style={{ padding: spacing.md }}>
      <header>
        <h1>TabVault Pro</h1>
        <p>Manage your bookmarks.</p>
      </header>
      <section>
        <button type="button">Import Chrome Bookmarks</button>
      </section>
    </main>
  )
}