"use client";

import React from 'react';

interface Scenario {
    id: string;
    name: string;
    luxLevel: number;
    apartmentSize: number;
    landShareRatio: number;
    totalApartments?: number | null;
    riskLevel: number;
    builderProfit: number;
    fdTotal: number;
    fdPerM2: number;
    mi: number;
    ma: number;
    totalCost: number;
    fa?: number | null;
    sdx?: number | null;
}

interface Props {
    scenarios: Scenario[];
}

export const ScenarioCompare: React.FC<Props> = ({ scenarios }) => {
    if (scenarios.length < 2) {
        return (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Karşılaştırma için en az 2 senaryo gereklidir.
            </div>
        );
    }

    const formatTL = (v: number) => '₺' + v.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
    const luxLabels: Record<number, string> = { 1.0: 'Standart', 1.2: 'Orta', 1.5: 'Lüks' };

    const rows: { label: string; values: string[]; highlight?: boolean }[] = [
        { label: 'Kalite', values: scenarios.map(s => luxLabels[s.luxLevel] || `x${s.luxLevel}`) },
        { label: 'Daire Alanı', values: scenarios.map(s => `${s.apartmentSize} m²`) },
        { label: 'Arsa Payı', values: scenarios.map(s => `%${(s.landShareRatio * 100).toFixed(0)}`) },
        { label: 'Kâr (K)', values: scenarios.map(s => `x${s.builderProfit}`) },
        { label: 'Daire Fiyatı', values: scenarios.map(s => formatTL(s.fdTotal)), highlight: true },
        { label: 'Birim Fiyat', values: scenarios.map(s => `${s.fdPerM2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²`) },
        { label: 'İnşaat', values: scenarios.map(s => formatTL(s.mi)) },
        { label: 'Arsa', values: scenarios.map(s => formatTL(s.ma)) },
        { label: 'Toplam Maliyet', values: scenarios.map(s => formatTL(s.totalCost)), highlight: true },
        { label: 'Kâr Tutarı', values: scenarios.map(s => formatTL(s.fdTotal - s.totalCost)) },
    ];

    // Find best (lowest cost) scenario index
    const bestIdx = scenarios.reduce((best, s, i) =>
        s.fdTotal < scenarios[best].fdTotal ? i : best, 0
    );

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                <thead>
                    <tr>
                        <th style={{ padding: '0.85rem 1rem', background: 'var(--panel-2)', fontWeight: 800, fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Parametre
                        </th>
                        {scenarios.map((s, i) => (
                            <th key={s.id} style={{
                                padding: '0.85rem 1rem',
                                background: i === bestIdx ? 'rgba(31,111,235,0.08)' : 'var(--panel-2)',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                color: i === bestIdx ? 'var(--primary)' : 'var(--card-title)',
                                textAlign: 'center',
                                borderLeft: '1px solid var(--border)',
                            }}>
                                {s.name} {i === bestIdx && '⭐'}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri}>
                            <td style={{
                                padding: '0.75rem 1rem',
                                borderTop: '1px solid var(--border)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: 'var(--label-color)',
                            }}>
                                {row.label}
                            </td>
                            {row.values.map((v, vi) => (
                                <td key={vi} style={{
                                    padding: '0.75rem 1rem',
                                    borderTop: '1px solid var(--border)',
                                    borderLeft: '1px solid var(--border)',
                                    fontWeight: row.highlight ? 900 : 600,
                                    fontSize: row.highlight ? '1rem' : '0.85rem',
                                    color: row.highlight ? 'var(--primary)' : 'var(--text)',
                                    textAlign: 'center',
                                    background: vi === bestIdx ? 'rgba(31,111,235,0.03)' : 'transparent',
                                }}>
                                    {v}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
