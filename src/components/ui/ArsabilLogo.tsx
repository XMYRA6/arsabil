"use client";

import React from 'react';

interface ArsabilLogoProps {
    size?: number;
    showText?: boolean;
    className?: string;
    textClassName?: string;
    variant?: 'full' | 'icon';
}

export function ArsabilLogo({
    size = 36,
    showText = false,
    className = "",
    textClassName = "",
    variant = 'full',
}: ArsabilLogoProps) {
    const logoId = React.useId().replace(/:/g, '');
    const gradientId = `arsabil-grad-${logoId}`;
    const glowId = `arsabil-glow-${logoId}`;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} className={className}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 44 44"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(37, 99, 235, 0.25))' }}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="60%" stopColor="#1D4ED8" />
                        <stop offset="100%" stopColor="#0284C7" />
                    </linearGradient>

                    <linearGradient id={`${gradientId}-accent`} x1="12" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>

                    <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Outer Rounded Container with Modern Shadow */}
                <rect width="44" height="44" rx="12" fill={`url(#${gradientId})`} />

                {/* Background Subtle Isometric Grid Pattern */}
                <path
                    d="M10 28 L22 34 L34 28 L22 22 Z"
                    fill="rgba(255, 255, 255, 0.08)"
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="0.8"
                />

                {/* Stylized 'A' + Land Parcel & Building Elevation Mark */}
                {/* Left Leg of 'A' */}
                <path
                    d="M14 31 L21.5 13.5 C21.8 12.8 22.2 12.8 22.5 13.5 L25 19.5"
                    stroke="white"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Right Skyscraper Elevation Integration */}
                <path
                    d="M25 19.5 L30 31 M25 19.5 L30 19.5 L30 31"
                    stroke={`url(#${gradientId}-accent)`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Horizontal Arsa Grid Crossbar */}
                <path
                    d="M16.5 25.5 L27.5 25.5"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />

                {/* Land Parcel Diamond Base (Arsa Foundation) */}
                <polygon
                    points="22,27.5 27,30.5 22,33.5 17,30.5"
                    fill="#38BDF8"
                    opacity="0.9"
                />

                {/* Smart Feasibility Indicator Point (Intelligence Node) */}
                <circle
                    cx="22"
                    cy="11.5"
                    r="2.2"
                    fill="#10B981"
                    stroke="white"
                    strokeWidth="1.2"
                    filter={`url(#${glowId})`}
                />
            </svg>

            {showText && variant === 'full' && (
                <span
                    className={textClassName}
                    style={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        letterSpacing: '-0.02em',
                        color: 'var(--card-title, #0f172a)',
                        fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                >
                    Arsa<span style={{ color: '#2563eb' }}>Bil</span>
                </span>
            )}
        </div>
    );
}
