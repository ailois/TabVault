type ChromeStorageRecord = Record<string, unknown>

type ChromeStorageArea = {
  get(key: string): Promise<ChromeStorageRecord>
  set(items: ChromeStorageRecord): Promise<void>
}

type ChromeNamespace = {
  storage: {
    sync: ChromeStorageArea
  }
  tabs?: {
    query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<ChromeTab[]>
  }
  scripting?: {
    executeScript(input: {
      target: { tabId: number }
      func: () => string
    }): Promise<Array<{ result?: unknown }>>
  }
}

type ChromeTab = {
  id?: number
  title?: string
  url?: string
}

declare global {
  var chrome: ChromeNamespace
}

export {}
