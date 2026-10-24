import React from 'react'
import styles from './MobileState.module.css'

export type MobileStateVariant = 'empty' | 'loading' | 'error' | 'offline'

type MotionTransition = { duration: number; ease?: [number, number, number, number] }

function renderHeading(level: 2 | 3 | 4, className: string, children: React.ReactNode) {
    if (level === 3) return <h3 className={className}>{children}</h3>
    if (level === 4) return <h4 className={className}>{children}</h4>
    return <h2 className={className}>{children}</h2>
}

interface MobileStateProps {
    variant: MobileStateVariant
    title?: string
    description?: string
    action?: React.ReactNode
    className?: string
    headingLevel?: 2 | 3 | 4
}

const copyByVariant: Record<MobileStateVariant, { title: string; description: string }> = {
    empty: {
        title: 'Henüz kayıt yok',
        description: 'İlk kayıt geldiğinde burada görünecek.',
    },
    loading: {
        title: 'Yükleniyor',
        description: 'Veriler hazırlanıyor.',
    },
    error: {
        title: 'Bir sorun oluştu',
        description: 'Lütfen tekrar dene.',
    },
    offline: {
        title: 'Çevrimdışısın',
        description: 'Bağlantı geri geldiğinde kaldığın yerden devam et.',
    },
}

export function mobileStateTransition(reducedMotion: boolean): MotionTransition {
    if (reducedMotion) return { duration: 0 }
    return { duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }
}

function StateIcon({ variant }: { variant: MobileStateVariant }) {
    if (variant === 'loading') {
        return <span className={styles.spinner} role="progressbar" aria-label="Yükleniyor" />
    }

    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {variant === 'empty' && (
                <>
                    <rect x="4" y="5" width="16" height="14" rx="3" />
                    <path d="M8 10h8" />
                    <path d="M8 14h5" />
                </>
            )}
            {variant === 'error' && (
                <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v6" />
                    <path d="M12 17h.01" />
                </>
            )}
            {variant === 'offline' && (
                <>
                    <path d="M3 9.5a13.5 13.5 0 0 1 18 0" />
                    <path d="M6.5 13a8.5 8.5 0 0 1 11 0" />
                    <path d="M10 16.5a3.5 3.5 0 0 1 4 0" />
                    <path d="M4 4l16 16" />
                </>
            )}
        </svg>
    )
}

export function MobileState({
    variant,
    title,
    description,
    action,
    className,
    headingLevel = 2,
}: MobileStateProps) {
    const copy = copyByVariant[variant]
    const Heading = `h${headingLevel}` as React.ElementType
    const isAssertive = variant === 'error' || variant === 'offline'

    return (
        <section
            className={`${styles.state} ${styles[variant]}${className ? ` ${className}` : ''}`}
            role={isAssertive ? 'alert' : 'status'}
            aria-live={isAssertive ? 'assertive' : 'polite'}
        >
            <div className={styles.iconShell} data-testid="mobile-state-icon" aria-hidden={variant === 'loading' ? undefined : 'true'}>
                <StateIcon variant={variant} />
            </div>
            <div className={styles.copy}>
                {renderHeading(headingLevel, styles.title, title ?? copy.title)}
                <p className={styles.description}>{description ?? copy.description}</p>
            </div>
            {action && <div className={styles.action}>{action}</div>}
        </section>
    )
}



