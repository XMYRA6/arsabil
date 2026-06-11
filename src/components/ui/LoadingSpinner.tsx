"use client";

import React from 'react';

/**
 * Architectural themed loading spinner.
 * Features a minimalist rotating compass/blueprint animation.
 */
export const LoadingSpinner: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            color: 'var(--primary)'
        }}>
            <svg
                width="64"
                height="64"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    animation: 'spin 3s linear infinite'
                }}
            >
                <style>
                    {`
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                        .blueprint-line { stroke: currentColor; stroke-width: 2; fill: none; stroke-dasharray: 4 4; }
                        .solid-line { stroke: currentColor; stroke-width: 3; fill: none; stroke-linecap: round; }
                    `}
                </style>

                {/* Outer blueprint circle */}
                <circle cx="50" cy="50" r="45" className="blueprint-line" />

                {/* Crosshairs */}
                <line x1="50" y1="0" x2="50" y2="100" className="blueprint-line" opacity="0.4" />
                <line x1="0" y1="50" x2="100" y2="50" className="blueprint-line" opacity="0.4" />

                {/* Inner Compass / Triangle structure */}
                <polygon points="50,15 85,75 15,75" className="solid-line" style={{ animation: 'pulse 2s ease-in-out infinite' }} />

                {/* Center dot */}
                <circle cx="50" cy="50" r="4" fill="currentColor" />
            </svg>
            <div style={{
                marginTop: '1.5rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                opacity: 0.8
            }}>
                Yükleniyor...
            </div>
        </div>
    );
};
