import { describe, expect, it } from "vitest"

import { buildGhostreaderContent } from "../../src/features/hybrid-retrieval/ghostreader"

describe("ghostreader session content", () => {
  it("includes intent memory and recent added bookmarks in prompt content", () => {
    const content = buildGhostreaderContent({
      language: "zh",
      query: "把刚加的几个也一起总结",
      currentPageContext: { title: "当前书签", url: "https://current.example", extractedText: "当前内容" },
      rankedResults: [],
      mode: "current-only",
      sessionContext: {
        intentSummary: "用户正在收集杨幂相关资料",
        recentTurns: [{ user: "关于杨幂的书签有哪些？" }],
        recentAddedBookmarks: [{ title: "杨幂采访合集", url: "https://yangmi.example" }]
      }
    })

    expect(content).toContain("用户正在收集杨幂相关资料")
    expect(content).toContain("关于杨幂的书签有哪些？")
    expect(content).toContain("杨幂采访合集")
  })

  it("includes inherited memory summary and bookmark ids in prompt content", () => {
    const content = buildGhostreaderContent({
      language: "zh",
      query: "继续这个话题",
      currentPageContext: null,
      rankedResults: [],
      mode: "cross-bookmark",
      sessionContext: {
        followUpMemory: {
          lastQuery: "",
          lastAnswer: "",
          lastReferencedBookmarkIds: [],
          lastQueryMode: null,
          updatedAt: null
        },
        inheritedMemory: {
          recentTopicSummary: "之前聊过：杨幂采访与角色盘点",
          bookmarkIds: ["bm-yangmi-1", "bm-yangmi-2"]
        }
      }
    })

    expect(content).toContain("继承记忆")
    expect(content).toContain("之前聊过：杨幂采访与角色盘点")
    expect(content).toContain("bm-yangmi-1, bm-yangmi-2")
  })
})
