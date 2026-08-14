"use client";

import React, { useState } from 'react';
import { formatTRThousands } from '@/app/hesapla/trNumberFormat';

interface PriceEvaluationChartProps {
    minPrice: number;
    marketPrice: number;
    manualMarketPrice: string;
    onManualMarketPriceChange: (v: string) => void;
}

export const PriceEvaluationChart: React.FC<PriceEvaluationChartProps> = ({ minPrice, marketPrice, manualMarketPrice, onManualMarketPriceChange }) => {
    // Piyasa fiyati artik Gelismis Ayarlar'da degil — bu kart kendi bos
    // durumunu bir davete cevirip degeri yerinde topluyor (2026-08-14 UX
    // karari). Yazarken her tus vurusunda ebeveyne bildirilseydi `marketPrice`
    // ilk rakamdan itibaren (orn. "1" -> 1 TL) sacma bir yuzde hesaplatirdi;
    // bu yuzden taslak yerel state'te tutulup yalnizca Enter/blur'da commit
    // ediliyor.
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(manualMarketPrice);

    const openEditor = () => {
        setDraft(manualMarketPrice);
        setIsEditing(true);
    };

    const commit = () => {
        const trimmed = draft.trim();
        if (trimmed.length > 0) {
            onManualMarketPriceChange(trimmed);
        }
        setIsEditing(false);
    };

    if (!marketPrice || isEditing) {
        if (!isEditing) {
            return (
                <button
                    type="button"
                    onClick={openEditor}
                    style={{
                        display: 'flex', gap: '0.75rem', alignItems: 'flex-start', width: '100%',
                        background: 'var(--card-bg-subtle, #f7faff)', border: '1px dashed var(--primary, #1f6feb)',
                        borderRadius: '12px', padding: '0.9rem', cursor: 'pointer', textAlign: 'left', font: 'inherit',
                    }}
                >
                    <span style={{
                        flex: 'none', width: '30px', height: '30px', borderRadius: '8px',
                        background: 'var(--primary, #1f6feb)', color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                    }}>₺</span>
                    <span>
                        <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                            Piyasa Fiyatını Gir
                        </span>
                        <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                            Hesaplanan fiyatla karşılaştıralım ve bırakabileceğin maksimum arsa payını gösterelim.
                        </span>
                    </span>
                </button>
            );
        }

        return (
            <div style={{ background: 'var(--card-bg-subtle, #f7faff)', border: '1.5px solid var(--primary, #1f6feb)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Yaklaşık Piyasa Fiyatı"
                        value={draft}
                        autoFocus
                        onChange={(e) => setDraft(formatTRThousands(e.target.value))}
                        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
                        onBlur={commit}
                        style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.7rem', font: 'inherit', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>TL</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                    Yaz ve Enter&apos;a bas · boş bırakıp dışarı tıklarsan iptal olur
                </div>
            </div>
        );
    }

    // Mobil karttaki `piyasaFarkiYuzdesi` (hesaplaMobileProps.ts) ile AYNI
    // formul/isaret: pozitif = hesaplanan min. fiyat piyasadan YUKSEK
    // (Pahalı), negatif = piyasadan DUSUK (Ucuz). Onceki formul
    // ((market-min)/min) TERS isaretliydi — ayni veri icin masaustu
    // "Pahalı" derken mobil "Ucuz" diyordu (denetim bulgusu C2).
    const diffPercent = ((minPrice - marketPrice) / marketPrice) * 100;

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

            <button
                type="button"
                onClick={openEditor}
                style={{
                    alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
                    color: 'var(--primary, #1f6feb)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                }}
            >
                Değiştir
            </button>
        </div>
    );
};
