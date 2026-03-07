import React from "react"

import type { BookmarkRecord } from "../types/bookmark"

type BookmarkListProps = {
  bookmarks: BookmarkRecord[]
}

export function BookmarkList({ bookmarks }: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return <p>No bookmarks found.</p>
  }

  return (
    <ul>
      {bookmarks.map((bookmark) => (
        <li key={bookmark.id}>
          <a href={bookmark.url} rel="noreferrer" target="_blank">
            {bookmark.title}
          </a>
          <div>{bookmark.url}</div>
          {bookmark.summary ? <p>{bookmark.summary}</p> : null}
          {bookmark.tags.length > 0 ? <p>Tags: {bookmark.tags.join(", ")}</p> : null}
        </li>
      ))}
    </ul>
  )
}
