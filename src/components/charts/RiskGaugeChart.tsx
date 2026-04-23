"use client";

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface RiskGaugeProps {
    score: number; // 0-100 arası
    title: string;
}

export const RiskGaugeChart: React.FC<RiskGaugeProps> = ({ score, title }) => {
    // Score'a göre renk belirleme (Mockuptaki gibi kırmızıdan yeşile)
    let color = '#ef4444'; // Red (Düşük)
    if (score > 40) color = '#f59e0b'; // Amber (Orta)
    if (score > 60) color = '#10b981'; // Green (İyi)

    const data = {
        labels: ['Skor', 'Kalan'],
        datasets: [
            {
                data: [score, 100 - score],
                backgroundColor: [color, '#e2e8f0'],
                borderWidth: 0,
                circumference: 270,
                rotation: 225,
                cutout: '80%',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        },
    };

    return (
        <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '20px' }}>
                <Doughnut data={data} options={options} />
            </div>
            <div style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{Math.round(score)}</div>
            </div>
            <div style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                textAlign: 'center',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                fontWeight: 500
            }}>
                {title}
            </div>
        </div>
    );
};
