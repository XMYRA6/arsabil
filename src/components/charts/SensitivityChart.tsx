"use client";

import React, { useMemo } from 'react';
import { CalculatorEngineV2, CalculationInput } from '@/lib/calculator/engine_v2';

/**
 * HassasiyetAnalizi — x (arsa payı) değiştikçe FD nasıl değişir
 * Canvas-based line chart (no dependency)
 */
interface Props {
    baseInput: CalculationInput;
}

export const SensitivityChart: React.FC<Props> = ({ baseInput }) => {
    const data = useMemo(() => {
        const points: { x: number; fd: number }[] = [];
        for (let xPercent = 10; xPercent <= 50; xPercent += 2) {
            const input = { ...baseInput, x: xPercent / 100 };
            const result = CalculatorEngineV2.calculate(input);
            points.push({ x: xPercent, fd: result.FD_total });
        }
        return points;
    }, [baseInput]);

    const maxFd = Math.max(...data.map(d => d.fd));
    const minFd = Math.min(...data.map(d => d.fd));
    const range = maxFd - minFd || 1;

    const width = 320;
    const height = 180;
    const padL = 65;
    const padR = 10;
    const padT = 15;
    const padB = 30;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const toX = (i: number) => padL + (i / (data.length - 1)) * chartW;
    const toY = (fd: number) => padT + chartH - ((fd - minFd) / range) * chartH;

    // Current x marker
    const currentXPercent = baseInput.x * 100;
    const currentResult = CalculatorEngineV2.calculate(baseInput);

    const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.fd).toFixed(1)}`).join(' ');

    // Y axis labels (4 ticks)
    const yTicks = [0, 0.33, 0.66, 1].map(t => minFd + t * range);

    const formatTL = (v: number) => {
        if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
        if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
        return v.toFixed(0);
    };

    return (
        <div style={{ width: '100%' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--card-title)', margin: '0 0 8px 0' }}>
                📈 Hassasiyet Analizi
            </h5>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0 0 12px 0' }}>
                Arsa payı (x) değiştikçe daire fiyatı nasıl değişir
            </p>
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                {/* Grid lines */}
                {yTicks.map((tick, i) => (
                    <g key={i}>
                        <line x1={padL} y1={toY(tick)} x2={width - padR} y2={toY(tick)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
                        <text x={padL - 5} y={toY(tick) + 3} fill="var(--muted)" fontSize="8" textAnchor="end" fontWeight="600">
                            ₺{formatTL(tick)}
                        </text>
                    </g>
                ))}

                {/* X axis labels */}
                {data.filter((_, i) => i % 5 === 0).map((d, i) => (
                    <text key={i} x={toX(data.indexOf(d))} y={height - 5} fill="var(--muted)" fontSize="8" textAnchor="middle" fontWeight="600">
                        %{d.x}
                    </text>
                ))}

                {/* Line */}
                <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Gradient fill */}
                <defs>
                    <linearGradient id="sensGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={`${pathD} L${toX(data.length - 1).toFixed(1)},${padT + chartH} L${padL},${padT + chartH} Z`} fill="url(#sensGrad)" />

                {/* Current position marker */}
                {(() => {
                    const nearest = data.reduce((prev, curr) => Math.abs(curr.x - currentXPercent) < Math.abs(prev.x - currentXPercent) ? curr : prev);
                    const idx = data.indexOf(nearest);
                    const cx = toX(idx);
                    const cy = toY(nearest.fd);
                    return (
                        <g>
                            <circle cx={cx} cy={cy} r="5" fill="var(--primary)" stroke="white" strokeWidth="2" />
                            <text x={cx} y={cy - 10} fill="var(--primary)" fontSize="9" textAnchor="middle" fontWeight="800">
                                ₺{formatTL(currentResult.FD_total)}
                            </text>
                        </g>
                    );
                })()}
            </svg>
        </div>
    );
};
