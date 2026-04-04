const EN_STOPWORDS = new Set([
  "a",
  "about",
  "an",
  "are",
  "for",
  "how",
  "i",
  "in",
  "is",
  "me",
  "of",
  "please",
  "related",
  "show",
  "tell",
  "the",
  "to",
  "what",
  "which",
  "why"
])

const CJK_PHRASE_STOPWORDS = [
  "\u5173\u4e8e",
  "\u6709\u5173",
  "\u4e66\u7b7e",
  "\u54ea\u4e9b",
  "\u54ea\u4e2a",
  "\u4ec0\u4e48",
  "\u6709\u54ea\u4e9b",
  "\u6709\u6ca1\u6709",
  "\u8bf7\u95ee",
  "\u5e2e\u6211",
  "\u544a\u8bc9\u6211",
  "\u76f8\u5173",
  "\u67e5\u8be2",
  "\u641c\u7d22",
  "\u627e\u4e00\u4e0b",
  "\u770b\u770b"
]

const CJK_CHAR_SEPARATORS = /[\u7684\u4e86\u5417\u5462\u554a\u5440\u5427\u6709\u548c\u4e0e\u53ca\u5728\u662f\u628a\u5c06\u7ed9]/gu

export function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase()
}

export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeQuery(query)
  if (!normalized) {
    return []
  }

  const segments = normalized.match(/[\p{L}\p{N}]+/gu) ?? []
  const tokens = new Set<string>()

  for (const segment of segments) {
    if (containsCjk(segment)) {
      addCjkTokens(tokens, segment)
      continue
    }

    if (segment.length <= 1 || EN_STOPWORDS.has(segment)) {
      continue
    }

    tokens.add(segment)
  }

  return [...tokens]
}

function containsCjk(value: string): boolean {
  return /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/u.test(value)
}

function addCjkTokens(tokens: Set<string>, segment: string): void {
  for (const keyword of extractCjkKeywords(segment)) {
    if (containsCjk(keyword)) {
      if (keyword.length < 2) {
        continue
      }

      tokens.add(keyword)

      for (const size of [2, 3, 4]) {
        if (keyword.length < size) {
          continue
        }

        for (let index = 0; index <= keyword.length - size; index += 1) {
          tokens.add(keyword.slice(index, index + size))
        }
      }
      continue
    }

    if (keyword.length > 1 && !EN_STOPWORDS.has(keyword)) {
      tokens.add(keyword)
    }
  }
}

function extractCjkKeywords(segment: string): string[] {
  let normalized = segment

  for (const phrase of CJK_PHRASE_STOPWORDS) {
    normalized = normalized.split(phrase).join(" ")
  }

  normalized = normalized.replace(CJK_CHAR_SEPARATORS, " ")

  return normalized
    .split(/\s+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}
