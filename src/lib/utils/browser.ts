export function getBrowserName(userAgent: string = navigator.userAgent): string {
  if (userAgent.includes("Edg/")) return "Edge"
  if (userAgent.includes("OPR/") || userAgent.includes("Opera/")) return "Opera"
  if (userAgent.includes("Brave") || (navigator as any).brave) return "Brave"
  if (userAgent.includes("Firefox/")) return "Firefox"
  if (userAgent.includes("Chrome")) return "Chrome"
  return "Browser"
}
