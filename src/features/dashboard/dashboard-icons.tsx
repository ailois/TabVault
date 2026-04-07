import React from "react"

type DashboardIconName =
  | "all"
  | "recents"
  | "highlights"
  | "settings"
  | "search"
  | "external"
  | "delete"
  | "folderExpanded"
  | "folderCollapsed"
  | "star"

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

  if (name === "folderExpanded") {
    return <path d="M4.5 6.5L8 10l3.5-3.5" />
  }

  if (name === "folderCollapsed") {
    return <path d="M6.5 4.5L10 8l-3.5 3.5" />
  }

  return <path d="M8 2.5l1.7 3.5 3.8.6-2.8 2.7.7 3.7L8 11.6 4.6 13l.7-3.7L2.5 6.6l3.8-.6z" fill="currentColor" stroke="none" />
}
