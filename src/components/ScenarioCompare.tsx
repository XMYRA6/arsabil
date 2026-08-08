"use client";

import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './ScenarioCompare.module.css';

export interface Scenario {
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
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeCard, setActiveCard] = useState(0);
    const cardTrackRef = useRef<HTMLDivElement>(null);

    if (scenarios.length < 2) {
        return (
            <div className={styles.emptyMessage}>
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

    const onCardScroll = () => {
        const el = cardTrackRef.current;
        if (!el || el.clientWidth === 0) return;
        setActiveCard(Math.round(el.scrollLeft / el.clientWidth));
    };

    return (
        <div className={styles.root}>
            <div className={styles.actions}>
                <button onClick={handlePdf} className={styles.actionBtn}>
                    📄 PDF İndir
                </button>
                {onShareRequest && (
                    <button
                        onClick={handleShare}
                        disabled={sharing}
                        className={`${styles.actionBtn} ${sharing ? styles.actionBtnSharing : ''}`}
                    >
                        {sharing ? 'Link oluşturuluyor...' : '🔗 Paylaş'}
                    </button>
                )}
            </div>
            {shareUrl && (
                <div className={styles.shareBox}>
                    <span className={styles.shareUrlText}>{shareUrl}</span>
                    <button onClick={handleCopy} className={styles.copyBtn}>
                        {copied ? '✓ Kopyalandı' : 'Kopyala'}
                    </button>
                </div>
            )}
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.thLabel}>
                                Parametre
                            </th>
                            {scenarios.map((s, i) => (
                                <th
                                    key={s.id}
                                    className={`${styles.thScenario} ${i === bestIdx ? styles.thScenarioBest : ''}`}
                                >
                                    {s.name} {i === bestIdx && '⭐'}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri}>
                                <td className={styles.tdLabel}>
                                    {row.label}
                                </td>
                                {row.values.map((v, vi) => (
                                    <td
                                        key={vi}
                                        className={`${styles.tdValue} ${row.highlight ? styles.tdValueHighlight : ''} ${vi === bestIdx ? styles.tdValueBest : ''}`}
                                    >
                                        {v}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className={styles.mobileCards}>
                <div className={styles.cardTrack} ref={cardTrackRef} onScroll={onCardScroll}>
                    {scenarios.map((s, i) => (
                        <div
                            key={s.id}
                            className={`${styles.scenarioCard} ${i === bestIdx ? styles.scenarioCardBest : ''}`}
                        >
                            <div className={styles.cardHeader}>
                                <span className={styles.cardName}>{s.name}</span>
                                {i === bestIdx && <span className={styles.cardBadge}>⭐ En Uygun</span>}
                            </div>
                            {rows.map((row, ri) => (
                                <div key={ri} className={styles.cardRow}>
                                    <span className={styles.cardLabel}>{row.label}</span>
                                    <span className={`${styles.cardValue} ${row.highlight ? styles.cardValueHighlight : ''}`}>
                                        {row.values[i]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                {scenarios.length > 1 && (
                    <div className={styles.cardDots} aria-hidden="true">
                        {scenarios.map((_, i) => (
                            <span key={i} className={`${styles.dot} ${i === activeCard ? styles.dotActive : ''}`} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
