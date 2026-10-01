// Ícones em SVG inline (sem biblioteca). Herdam a cor do texto via currentColor.
import type { SVGProps } from 'react'

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  )
}

type P = SVGProps<SVGSVGElement>

export const HomeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </Icon>
)

export const HistoryIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

export const SettingsIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h10" />
    <path d="M18 7h2" />
    <circle cx="16" cy="7" r="2" />
    <path d="M4 17h2" />
    <path d="M10 17h10" />
    <circle cx="8" cy="17" r="2" />
  </Icon>
)

export const LogoutIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 4H5v16h4" />
    <path d="M16 8l4 4-4 4" />
    <path d="M20 12H9" />
  </Icon>
)

export const CopyIcon = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Icon>
)

export const FileIcon = (p: P) => (
  <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Icon>
)

export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
)

export const ClockIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

export const AlertIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 4 3 20h18z" />
    <path d="M12 10v4" />
    <path d="M12 17.5v.01" />
  </Icon>
)
