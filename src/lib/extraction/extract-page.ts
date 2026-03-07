type BrowserScriptExecutor = (input: {
  target: { tabId: number }
  func: () => string
}) => Promise<Array<{ result?: unknown }>>

export async function extractPage(tabId: number, executeScript: BrowserScriptExecutor = defaultExecuteScript): Promise<string | undefined> {
  const [result] = await executeScript({
    target: { tabId },
    func: () => document.body?.innerText?.trim() ?? ""
  })

  const extractedText = typeof result?.result === "string" ? result.result.trim() : ""

  return extractedText || undefined
}

async function defaultExecuteScript(input: {
  target: { tabId: number }
  func: () => string
}): Promise<Array<{ result?: unknown }>> {
  const chromeApi = globalThis.chrome

  if (!chromeApi?.scripting?.executeScript) {
    return []
  }

  return chromeApi.scripting.executeScript(input)
}
