"use client";

import React from 'react';

interface ArsabilLogoProps {
    size?: number;
    showText?: boolean;
    className?: string;
    textClassName?: string;
    variant?: 'full' | 'icon';
}

/** Proje logosu: lacivert kare + eğik çizgi ve üçgen (public/icon.svg). Tek renk, her temada aynı. */
export function ArsabilLogo({
    size = 36,
    showText = false,
    className = "",
    textClassName = "",
    variant = 'full',
}: ArsabilLogoProps) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} className={className}>
            <img src="/icon.svg" width={size} height={size} alt="" aria-hidden="true" style={{ flexShrink: 0 }} />

            {showText && variant === 'full' && (
                <span
                    className={textClassName}
                    style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: 'var(--card-title, #0f172a)',
                        fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                >
                    ArsaBil
                </span>
            )}
        </div>
    );
}
