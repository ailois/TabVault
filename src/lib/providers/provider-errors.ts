type ProviderErrorDetails = {
  code: string
  message: string
}

type NormalizedProviderError = Error & {
  code: string
  cause?: unknown
}

export function normalizeProviderError(
  error: unknown,
  fallback: ProviderErrorDetails
): NormalizedProviderError {
  if (isNormalizedProviderError(error)) {
    return error
  }

  const normalized = new Error(fallback.message, { cause: error }) as NormalizedProviderError
  normalized.name = "ProviderError"
  normalized.code = fallback.code

  return normalized
}

function isNormalizedProviderError(error: unknown): error is NormalizedProviderError {
  return error instanceof Error && typeof (error as { code?: unknown }).code === "string"
}
