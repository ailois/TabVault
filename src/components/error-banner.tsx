import React from "react"

type ErrorBannerProps = {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <p aria-live="polite" role="alert">
      {message}
    </p>
  )
}
