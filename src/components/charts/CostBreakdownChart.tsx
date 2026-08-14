"use client";

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CostBreakdownChartProps {
    constructionCost: number;  // İnşaat maliyeti
    landValue: number;         // Arsa değeri
    profit: number;            // Kâr payı
    risk: number;              // Risk payı
}

export const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({
    constructionCost,
    landValue,
    profit,
    risk,
}) => {
    const total = constructionCost + landValue + profit + risk;
    if (total <= 0) {
        return (
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 1rem' }}>
                Hesaplama bekleniyor...
            </div>
        );
    }

    const data = {
        labels: ['İnşaat (risksiz)', 'Arsa', 'Kâr', 'Risk'],
        datasets: [
            {
                data: [constructionCost, landValue, profit, risk],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ff5a5f'],
                borderColor: ['#2563eb', '#059669', '#d97706', '#dc2626'],
                borderWidth: 2,
                hoverOffset: 6,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '62%',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleFont: { family: 'Inter', size: 13, weight: 600 as const },
                bodyFont: { family: 'Inter', size: 12 },
                padding: 12,
                cornerRadius: 10,
                callbacks: {
                    label: function (context: { label: string; raw: unknown }) {
                        const value = context.raw as number;
                        const percent = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${value.toLocaleString('tr-TR')} TL (${percent}%)`;
                    },
                },
            },
        },
    };

    const items = [
        { label: 'İnşaat (risksiz)', color: '#3b82f6', value: constructionCost },
        { label: 'Arsa', color: '#10b981', value: landValue },
        { label: 'Kâr', color: '#f59e0b', value: profit },
        { label: 'Risk', color: '#ff5a5f', value: risk }, // --red'in literal degeri (canvas var() cozemez)
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
            {/* Donut Chart */}
            <div style={{ width: '160px', height: '160px' }}>
                <Doughnut data={data} options={options} />
            </div>

            {/* Detailed TL Breakdown */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {items.map((item) => {
                    const percent = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                        <div key={item.label} style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 0',
                            borderBottom: '1px solid var(--border)',
                            gap: '10px',
                        }}>
                            {/* Color dot */}
                            <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: item.color,
                                flexShrink: 0,
                            }} />
                            {/* Label */}
                            <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--text)',
                                minWidth: 52,
                            }}>
                                {item.label}
                            </span>
                            {/* Bar */}
                            <div style={{
                                flex: 1,
                                height: 6,
                                background: 'var(--border)',
                                borderRadius: 3,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${percent}%`,
                                    height: '100%',
                                    background: item.color,
                                    borderRadius: 3,
                                    transition: 'width 0.4s ease',
                                }} />
                            </div>
                            {/* Percentage */}
                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: 'var(--muted)',
                                minWidth: 36,
                                textAlign: 'right',
                            }}>
                                %{percent.toFixed(1)}
                            </span>
                            {/* TL Value */}
                            <span style={{
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                color: 'var(--text)',
                                minWidth: 90,
                                textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {item.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                            </span>
                        </div>
                    );
                })}

                {/* Total Row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 0 4px',
                    gap: '10px',
                }}>
                    <div style={{ width: 8, flexShrink: 0 }} />
                    <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: 'var(--text)',
                        minWidth: 52,
                    }}>
                        Toplam
                    </span>
                    <div style={{ flex: 1 }} />
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--muted)',
                        minWidth: 36,
                        textAlign: 'right',
                    }}>
                        %100
                    </span>
                    <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        color: 'var(--primary)',
                        minWidth: 90,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                    </span>
                </div>
            </div>
        </div>
    );
};
