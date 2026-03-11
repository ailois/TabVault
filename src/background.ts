import { importChromeBookmarks } from "./features/bookmarks/import-chrome-bookmarks"
import { IndexedDbBookmarkRepository } from "./lib/storage/indexeddb-bookmark-repository"

const repo = new IndexedDbBookmarkRepository()

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "IMPORT_BOOKMARKS") {
    importChromeBookmarks({
      getTree: async () => chrome.bookmarks.getTree(),
      bookmarkRepository: repo
    })
      .then(count => {
        sendResponse({ success: true, count })
        chrome.runtime.sendMessage({ type: "IMPORT_COMPLETE", count })
      })
      .catch(error => {
        sendResponse({ success: false, error: String(error) })
      })
    return true // Keep message channel open for async response
  }
})
