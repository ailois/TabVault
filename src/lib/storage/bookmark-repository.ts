import type { BookmarkRecord } from "../../types/bookmark"

export interface BookmarkRepository {
  save(bookmark: BookmarkRecord): Promise<void>
  list(): Promise<BookmarkRecord[]>
  getById(id: string): Promise<BookmarkRecord | null>
  update(bookmark: BookmarkRecord): Promise<void>
  delete(id: string): Promise<void>
}
