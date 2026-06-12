"use client";

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    onShareRequest?: (ids: string[]) => Promise<string | null>;
}

export const ScenarioCompare: React.FC<Props> = ({ scenarios, onShareRequest }) => {
    // Hooks must be at the top level, before any early returns
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);
    const [copied, setCopied] = useState(false);

    if (scenarios.length < 2) {
        return (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Karşılaştırma için en az 2 senaryo gereklidir.
            </div>
        );
    }

    const formatTL = (v: number) => '₺' + v.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
    const luxLabels: Record<number, string> = { 1.0: 'Standart', 1.2: 'Orta', 1.4: 'Lüks' };

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

    const handlePdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text('ArsaBil — Senaryo Karşılaştırma', 14, 18);
        doc.setFontSize(9);
        doc.text(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, 14, 25);
        autoTable(doc, {
            startY: 30,
            head: [['Parametre', ...scenarios.map(s => s.name)]],
            body: rows.map(r => [r.label, ...r.values]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
        });
        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`arsabil-karsilastirma-${dateStr}.pdf`);
    };

    const handleShare = async () => {
        if (!onShareRequest) return;
        setSharing(true);
        const url = await onShareRequest(scenarios.map(s => s.id));
        setShareUrl(url);
        setSharing(false);
    };

    const handleCopy = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                <button onClick={handlePdf} style={{
                    padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--panel)',
                    border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                }}>
                    📄 PDF İndir
                </button>
                {onShareRequest && (
                    <button onClick={handleShare} disabled={sharing} style={{
                        padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--panel)',
                        border: '1px solid var(--border)', color: 'var(--text)', cursor: sharing ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit', opacity: sharing ? 0.6 : 1,
                    }}>
                        {sharing ? 'Link oluşturuluyor...' : '🔗 Paylaş'}
                    </button>
                )}
            </div>
            {shareUrl && (
                <div style={{
                    display: 'flex', gap: 8, alignItems: 'center', padding: '0.625rem 0.875rem',
                    background: 'rgba(59,130,246,.07)', border: '1px solid rgba(59,130,246,.2)',
                    borderRadius: 10, marginBottom: '0.875rem',
                }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl}</span>
                    <button onClick={handleCopy} style={{
                        padding: '3px 10px', borderRadius: 6, background: 'var(--primary)', border: 'none',
                        color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                    }}>
                        {copied ? '✓ Kopyalandı' : 'Kopyala'}
                    </button>
                </div>
            )}
            {/* Original table content */}
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
                                    background: i === bestIdx ? 'rgba(var(--primary-rgb),0.08)' : 'var(--panel-2)',
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
                                        background: vi === bestIdx ? 'rgba(var(--primary-rgb),0.03)' : 'transparent',
                                    }}>
                                        {v}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
