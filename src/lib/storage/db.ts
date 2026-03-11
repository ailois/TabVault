import type { BookmarkRecord } from "../../types/bookmark"

const DATABASE_NAME = "tabvault"
const DATABASE_VERSION = 1
const BOOKMARK_STORE_NAME = "bookmarks"

export interface BookmarkStorage {
  put(bookmark: BookmarkRecord): Promise<void>
  get(id: string): Promise<BookmarkRecord | null>
  getAll(): Promise<BookmarkRecord[]>
  delete(id: string): Promise<void>
}

export class IndexedDbBookmarkStorage implements BookmarkStorage {
  constructor(private readonly databaseFactory: () => Promise<IDBDatabase> = openBookmarkDatabase) {}

  async put(bookmark: BookmarkRecord): Promise<void> {
    const database = await this.databaseFactory()
    const transaction = database.transaction(BOOKMARK_STORE_NAME, "readwrite")
    const store = transaction.objectStore(BOOKMARK_STORE_NAME)

    store.put(bookmark)

    await waitForTransaction(transaction)
  }

  async get(id: string): Promise<BookmarkRecord | null> {
    const database = await this.databaseFactory()
    const transaction = database.transaction(BOOKMARK_STORE_NAME, "readonly")
    const store = transaction.objectStore(BOOKMARK_STORE_NAME)
    const bookmark = await runRequest<BookmarkRecord | undefined>(store.get(id))

    return bookmark ?? null
  }

  async getAll(): Promise<BookmarkRecord[]> {
    const database = await this.databaseFactory()
    const transaction = database.transaction(BOOKMARK_STORE_NAME, "readonly")
    const store = transaction.objectStore(BOOKMARK_STORE_NAME)

    return runRequest<BookmarkRecord[]>(store.getAll())
  }

  async delete(id: string): Promise<void> {
    const database = await this.databaseFactory()
    const transaction = database.transaction(BOOKMARK_STORE_NAME, "readwrite")
    const store = transaction.objectStore(BOOKMARK_STORE_NAME)

    store.delete(id)

    await waitForTransaction(transaction)
  }
}

export function openBookmarkDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(BOOKMARK_STORE_NAME)) {
        database.createObjectStore(BOOKMARK_STORE_NAME, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Failed to open bookmark database"))
  })
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"))
  })
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"))
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"))
  })
}
