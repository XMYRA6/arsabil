"use client";

interface Props {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function FizibiliteScoreBadge({ score, size = 'md', showLabel = false }: Props) {
    const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)';
    const bgColor = score >= 80 ? 'rgba(var(--green-rgb),.15)' : score >= 60 ? 'rgba(var(--orange-rgb),.15)' : 'rgba(var(--red-rgb),.15)';
    const label = score >= 80 ? 'Yüksek' : score >= 60 ? 'Orta' : 'Riskli';

    const sizeMap = { sm: 36, md: 46, lg: 58 };
    const fontMap = { sm: '0.7rem', md: '0.85rem', lg: '1.1rem' };
    const dim = sizeMap[size];

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
                width: dim, height: dim,
                borderRadius: '50%',
                background: bgColor,
                border: `2.5px solid ${color}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <span style={{ color, fontWeight: 900, fontSize: fontMap[size], lineHeight: 1 }}>{score}</span>
                {size !== 'sm' && (
                    <span style={{ color, fontSize: '0.5rem', fontWeight: 700 }}>/100</span>
                )}
            </div>
            {showLabel && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{label}</span>
            )}
        </div>
    );
}
