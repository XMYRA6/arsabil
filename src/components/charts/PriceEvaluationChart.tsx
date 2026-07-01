"use client";

import React from 'react';

interface PriceEvaluationChartProps {
    minPrice: number;
    marketPrice: number;
}

export const PriceEvaluationChart: React.FC<PriceEvaluationChartProps> = ({ minPrice, marketPrice }) => {
    if (!marketPrice) return <div style={{ color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center', width: '100%', padding: '1rem' }}>Piyasa Fiyatı Girilmedi</div>;

    // Positive = Market price is higher (Pahalı)
    // Negative = Market price is lower (Ucuz)
    const diffPercent = ((marketPrice - minPrice) / minPrice) * 100;

    // Varsayılan: Fırsat / Ucuz
    let color = 'var(--green)';
    let statusText = "Fırsat / Ucuz";
    let bgColor = "#dcfce7";

    if (diffPercent > 10) {
        color = 'var(--red)'; // Pahalı
        statusText = "Pahalı";
        bgColor = "#fee2e2";
    } else if (diffPercent >= -5 && diffPercent <= 10) {
        color = 'var(--orange)'; // Adil
        statusText = "Adil Değer";
        bgColor = "#fef3c7";
    }

    // İbrenin pozisyonu (-30% en sol, +30% en sağ, %0 tam orta)
    const needlePosition = Math.max(0, Math.min(100, ((diffPercent + 30) / 60) * 100));

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>

            {/* Üst Kısım: Rozet ve Yüzde Yan Yana */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                    backgroundColor: bgColor,
                    color: color,
                    padding: '0.4rem 0.8rem',
                    borderRadius: '2rem',
                    fontSize: '0.85rem',
                    fontWeight: 700
                }}>
                    {statusText}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
                    {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                </span>
            </div>

            {/* Alt Kısım: Linear İbre Grafiği */}
            <div style={{ position: 'relative', width: '100%', height: '8px', background: 'linear-gradient(to right, var(--green), var(--orange), var(--red))', borderRadius: '4px', marginTop: '0.5rem' }}>
                <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: `${needlePosition}%`,
                    width: '4px',
                    height: '20px',
                    backgroundColor: 'white',
                    border: '1px solid var(--text)',
                    borderRadius: '2px',
                    transform: 'translateX(-50%)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'left 0.3s ease-out'
                }} />

                {/* Merkez Referans Çizgisi */}
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.65rem',
                    color: 'var(--muted)',
                    fontWeight: 600
                }}>Adil (0%)</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)' }}>
                <span>-30%</span>
                <span>+30%</span>
            </div>

        </div>
    );
};
