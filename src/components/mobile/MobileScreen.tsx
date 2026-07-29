'use client'

import type { ReactNode } from 'react'
import styles from './MobileScreen.module.css'

interface Props {
    children: ReactNode
    /** Sayfada sabit alt navigasyon var mi (dolgu buna gore verilir). */
    hasBottomNav?: boolean
    /** Alt navigasyonun USTUNDE ayrica sabit bir CTA var mi. */
    hasStickyCta?: boolean
    /** Canli mesh zemin. Alt ekranlarda kapatilabilir. */
    mesh?: boolean
    className?: string
}

/**
 * Mobil ekranlarin kaydirilabilir kabi.
 *
 * Alt cubuk/CTA dolgusu TEK yerde burada cozulur. Tasarim handoff'u bu
 * hatanin prototipte uc kez tekrarlandigini soyluyor; sayfalar dolguyu elle
 * tekrarlamamali.
 */
export function MobileScreen({
    children,
    hasBottomNav = true,
    hasStickyCta = false,
    mesh = true,
    className,
}: Props) {
    return (
        <div
            className={`${styles.screen} ${className ?? ''}`.trim()}
            data-bottomnav={String(hasBottomNav)}
            data-cta={String(hasStickyCta)}
            data-mesh={String(mesh)}
        >
            {children}
        </div>
    )
}
