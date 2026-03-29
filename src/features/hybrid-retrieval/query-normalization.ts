export function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase()
}

export function tokenizeQuery(query: string): string[] {
  return normalizeQuery(query).split(/\s+/).filter(Boolean)
}
