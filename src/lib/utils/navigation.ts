export async function openDashboardTab(): Promise<void> {
  const url = globalThis.chrome?.runtime?.getURL?.("tabs/dashboard.html")
  if (!url) return

  await globalThis.chrome?.tabs?.create?.({ url })
}

export async function openCurrentTabSidePanel(): Promise<void> {
  const [activeTab] = await (globalThis.chrome?.tabs?.query?.({
    active: true,
    currentWindow: true
  }) ?? Promise.resolve([]))

  if (typeof activeTab?.id !== "number") {
    return
  }

  await (globalThis.chrome as any)?.sidePanel?.open?.({ tabId: activeTab.id })
}

export async function openSettingsPage(): Promise<void> {
  await globalThis.chrome?.runtime?.openOptionsPage?.()
}
