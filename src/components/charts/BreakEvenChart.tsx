"use client";

import React, { useMemo } from 'react';
import { CalculatorEngineV2, CalculationInput } from '@/lib/calculator/engine_v2';

/**
 * BreakEvenChart — Kârın 0 olduğu noktayı (K=1) gösterir
 * K değiştikçe FD nasıl değişir + kırılma noktası
 */
interface Props {
    baseInput: CalculationInput;
    marketPrice: number;
}

export const BreakEvenChart: React.FC<Props> = ({ baseInput, marketPrice }) => {
    const data = useMemo(() => {
        const points: { k: number; fd: number; profit: number }[] = [];
        for (let kPercent = 80; kPercent <= 160; kPercent += 5) {
            const K = kPercent / 100;
            const input = { ...baseInput, K };
            const result = CalculatorEngineV2.calculate(input);
            const profit = result.FD_total - result.M;
            points.push({ k: kPercent, fd: result.FD_total, profit });
        }
        return points;
    }, [baseInput]);

    // Break-even K: profit ≈ 0 → K = 1.0 (maliyet = fiyat)
    const breakEvenResult = CalculatorEngineV2.calculate({ ...baseInput, K: 1.0 });
    const breakEvenFD = breakEvenResult.FD_total;
    const currentResult = CalculatorEngineV2.calculate(baseInput);
    const currentProfit = currentResult.FD_total - currentResult.M;
    const profitPercent = currentResult.M > 0 ? ((currentProfit / currentResult.M) * 100).toFixed(1) : '0';

    const formatTL = (v: number) => {
        if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
        if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
        return v.toFixed(0);
    };

    return (
        <div style={{ width: '100%' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--card-title)', margin: '0 0 8px 0' }}>
                📊 Kırılma Noktası Analizi
            </h5>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(47,191,113,0.08)', border: '1px solid rgba(47,191,113,0.15)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>Kâr Tutarı</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: currentProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        ₺{formatTL(Math.abs(currentProfit))}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>{profitPercent}%</div>
                </div>
                <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(255,159,47,0.08)', border: '1px solid rgba(255,159,47,0.15)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>Kırılma Noktası</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--orange)' }}>
                        ₺{formatTL(breakEvenFD)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>K=1.0 (Sıfır Kâr)</div>
                </div>
            </div>

            {/* Market comparison */}
            {marketPrice > 0 && (
                <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(31,111,235,0.06)', border: '1px solid rgba(31,111,235,0.12)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                    Piyasa Fiyatı: ₺{formatTL(marketPrice)} — {' '}
                    {currentResult.FD_total <= marketPrice ? (
                        <span style={{ color: 'var(--green)' }}>✓ Piyasadan {((1 - currentResult.FD_total / marketPrice) * 100).toFixed(1)}% ucuz</span>
                    ) : (
                        <span style={{ color: 'var(--red)' }}>⚠ Piyasadan {((currentResult.FD_total / marketPrice - 1) * 100).toFixed(1)}% pahalı</span>
                    )}
                </div>
            )}
        </div>
    );
};
