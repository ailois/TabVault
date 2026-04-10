import { describe, expect, it } from "vitest"

import { buildGhostreaderContent } from "../../src/features/hybrid-retrieval/ghostreader"

describe("ghostreader prompt context", () => {
  it("includes recent turns, follow-up memory summary, and recent added bookmarks in session block", () => {
    const content = buildGhostreaderContent({
      language: "zh",
      query: "为什么值得收藏？",
      currentPageContext: null,
      rankedResults: [],
      mode: "current-only",
      sessionContext: {
        intentSummary: "用户当前关注：杨幂采访",
        recentTurns: [{ user: "帮我找一个相关书签", assistant: "我找到一个采访合集" }],
        followUpMemory: {
          lastQuery: "帮我找一个相关书签",
          lastAnswer: "我找到一个采访合集",
          lastReferencedBookmarkIds: ["bm-1"],
          lastQueryMode: "cross-bookmark",
          updatedAt: "2026-04-10T00:00:00.000Z"
        },
        recentAddedBookmarks: [{ title: "杨幂采访合集", url: "https://yangmi.example" }]
      }
    })

    expect(content).toContain("最近对话")
    expect(content).toContain("帮我找一个相关书签")
    expect(content).toContain("我找到一个采访合集")
    expect(content).toContain("最近新增书签")
    expect(content).toContain("杨幂采访合集")
    expect(content).toContain("follow-up")
  })
})
