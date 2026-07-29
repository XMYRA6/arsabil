import type { ReactNode } from 'react'

export type IconProps = { size?: number; className?: string; strokeWidth?: number }

function Svg({ size = 24, className, strokeWidth = 2, children }: IconProps & { children: ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {children}
        </svg>
    )
}

/* ── Alt navigasyon: path'ler mevcut BottomNavbar.tsx'ten korundu ── */
export const IconBox = (p: IconProps) => (
    <Svg {...p}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </Svg>
)
export const IconFile = (p: IconProps) => (
    <Svg {...p}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </Svg>
)
export const IconMessage = (p: IconProps) => (
    <Svg {...p}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
)
export const IconUser = (p: IconProps) => (
    <Svg {...p}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </Svg>
)
export const IconHome = (p: IconProps) => (
    <Svg {...p}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
)

/* ── Genel ── */
export const IconCalculator = (p: IconProps) => (
    <Svg {...p}>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="11" x2="8" y2="11" />
        <line x1="12" y1="11" x2="12" y2="11" />
        <line x1="16" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="8" y2="15" />
        <line x1="12" y1="15" x2="12" y2="15" />
        <line x1="16" y1="15" x2="16" y2="18" />
    </Svg>
)
export const IconPin = (p: IconProps) => (
    <Svg {...p}>
        <path d="M12 21s-7-4.35-7-10a7 7 0 1114 0c0 5.65-7 10-7 10z" />
        <circle cx="12" cy="11" r="2.5" />
    </Svg>
)
export const IconSettings = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
)
export const IconChevronRight = (p: IconProps) => (<Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>)
export const IconCheckCircle = (p: IconProps) => (
    <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9" /></Svg>
)
export const IconHeart = (p: IconProps) => (
    <Svg {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" /></Svg>
)
export const IconHeartFilled = (p: IconProps) => (
    <Svg {...p}>
        {/* Dolu varyant: govde currentColor ile boyanir. `fill` kalitimli bir
            sunum ozelligi oldugu icin path'teki deger, sarmalayicinin
            fill="none" degerini gecersiz kilar; sozlesme bozulmaz. */}
        <path
            d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"
            fill="currentColor"
        />
    </Svg>
)
export const IconEdit = (p: IconProps) => (
    <Svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></Svg>
)
export const IconMap = (p: IconProps) => (
    <Svg {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></Svg>
)
export const IconChart = (p: IconProps) => (
    <Svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Svg>
)
export const IconMoney = (p: IconProps) => (
    <Svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><line x1="6" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="18" y2="12" /></Svg>
)
export const IconRuler = (p: IconProps) => (
    <Svg {...p}><path d="M16 2l6 6L8 22l-6-6z" /><line x1="12" y1="6" x2="14" y2="8" /><line x1="9" y1="9" x2="11" y2="11" /><line x1="6" y1="12" x2="8" y2="14" /></Svg>
)
export const IconFlame = (p: IconProps) => (
    <Svg {...p}><path d="M12 2s5 5 5 9a5 5 0 0 1-10 0c0-1.5.7-2.8 1.5-3.8C9 8.5 12 6 12 2z" /></Svg>
)
