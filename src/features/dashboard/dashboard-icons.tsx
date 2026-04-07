import React from "react"

type DashboardIconName =
  | "all"
  | "recents"
  | "highlights"
  | "settings"
  | "search"
  | "external"
  | "delete"
  | "send"
  | "loading"
  | "folderExpanded"
  | "folderCollapsed"
  | "star"
  | "edit"
  | "save"
  | "close"
  | "bold"
  | "italic"
  | "quote"
  | "spark"
  | "select"

type DashboardIconProps = {
  name: DashboardIconName
  size?: number
  testId?: string
}

export function DashboardIcon({ name, size = 14, testId }: DashboardIconProps) {
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      style={{ display: "inline-flex", width: `${size}px`, height: `${size}px`, flexShrink: 0 }}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 16 16"
        width={size}
      >
        {renderIconPath(name)}
      </svg>
    </span>
  )
}

function renderIconPath(name: DashboardIconName): React.ReactNode {
  if (name === "all") {
    return (
      <>
        <rect x="2.5" y="2.5" width="4" height="4" rx="1" />
        <rect x="9.5" y="2.5" width="4" height="4" rx="1" />
        <rect x="2.5" y="9.5" width="4" height="4" rx="1" />
        <rect x="9.5" y="9.5" width="4" height="4" rx="1" />
      </>
    )
  }

  if (name === "recents") {
    return (
      <>
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 5.2v3.2l2.2 1.3" />
      </>
    )
  }

  if (name === "highlights") {
    return <path d="M8 2.3l1.7 3.5 3.8.6-2.8 2.7.7 3.9L8 11.2 4.6 13l.7-3.9L2.5 6.4l3.8-.6z" />
  }

  if (name === "settings") {
    return (
      <>
        <circle cx="8" cy="8" r="2.2" />
        <path d="M8 2.2v1.5M8 12.3v1.5M13.8 8h-1.5M3.7 8H2.2M12.1 3.9l-1 1M4.9 11.1l-1 1M12.1 12.1l-1-1M4.9 4.9l-1-1" />
      </>
    )
  }

  if (name === "search") {
    return (
      <>
        <circle cx="7" cy="7" r="3.8" />
        <path d="M9.8 9.8l3 3" />
      </>
    )
  }

  if (name === "external") {
    return (
      <>
        <path d="M6 4h6v6" />
        <path d="M10.8 5.2L5 11" />
        <path d="M11 9.8V12H4V5h2.2" />
      </>
    )
  }

  if (name === "delete") {
    return (
      <>
        <path d="M3.5 4.5h9" />
        <path d="M6 4.5V3h4v1.5" />
        <path d="M5 6.5v5M8 6.5v5M11 6.5v5" />
        <path d="M4.5 4.5l.6 8a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8" />
      </>
    )
  }

  if (name === "send") {
    return (
      <>
        <path d="M2.5 8L13 3.5l-2.7 9L7.3 8.7 2.5 8z" />
        <path d="M7.2 8.8l2.2-2.2" />
      </>
    )
  }

  if (name === "loading") {
    return (
      <>
        <path d="M8 2.4a5.6 5.6 0 1 1-4 1.6" opacity="0.35" />
        <path d="M8 2.4a5.6 5.6 0 0 1 4 1.6" />
      </>
    )
  }

  if (name === "folderExpanded") {
    return <path d="M4.5 6.5L8 10l3.5-3.5" />
  }

  if (name === "folderCollapsed") {
    return <path d="M6.5 4.5L10 8l-3.5 3.5" />
  }

  if (name === "edit") {
    return (
      <>
        <path d="M3 11.8l.4-2.6L9.9 2.7a1.2 1.2 0 0 1 1.7 0l1.7 1.7a1.2 1.2 0 0 1 0 1.7L6.8 12.6 4.2 13z" />
        <path d="M8.9 3.7l3.4 3.4" />
      </>
    )
  }

  if (name === "save") {
    return (
      <>
        <path d="M3 3.5h8l2 2V12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
        <path d="M5 3.5V6h5V3.5" />
        <path d="M5.2 10.2h5.6" />
      </>
    )
  }

  if (name === "close") {
    return (
      <>
        <path d="M4.5 4.5l7 7" />
        <path d="M11.5 4.5l-7 7" />
      </>
    )
  }

  if (name === "bold") {
    return (
      <>
        <path d="M5.2 3.2h3.1a2.1 2.1 0 0 1 0 4.2H5.2z" />
        <path d="M5.2 7.4h3.7a2.2 2.2 0 0 1 0 4.4H5.2z" />
      </>
    )
  }

  if (name === "italic") {
    return (
      <>
        <path d="M9.8 3.2H6.5" />
        <path d="M8.5 12.8H5.2" />
        <path d="M8.1 3.2L6.9 12.8" />
      </>
    )
  }

  if (name === "quote") {
    return (
      <>
        <path d="M4.5 5.2h2v2.2H4.9v1.5h1.6V11H3.7V8.1c0-1.6.5-2.6 1.8-2.9z" />
        <path d="M9.5 5.2h2v2.2H9.9v1.5h1.6V11H8.7V8.1c0-1.6.5-2.6 1.8-2.9z" />
      </>
    )
  }

  if (name === "spark") {
    return (
      <>
        <path d="M8 2.2l1 2.8L11.8 6l-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z" />
        <path d="M12 10.4l.5 1.4 1.3.5-1.3.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" />
      </>
    )
  }

  if (name === "select") {
    return (
      <>
        <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
        <path d="M5.2 8l1.8 1.8 3.8-3.8" />
      </>
    )
  }

  return <path d="M8 2.5l1.7 3.5 3.8.6-2.8 2.7.7 3.7L8 11.6 4.6 13l.7-3.7L2.5 6.6l3.8-.6z" fill="currentColor" stroke="none" />
}
