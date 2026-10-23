"use client";

import { useEffect, useRef } from 'react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import type { MarketFieldProps, RiskCostProps } from '../AdvancedSettingsSections';
import { useBufferedNumberInput } from '../useBufferedNumberInput';
import { formatTRThousands } from '../trNumberFormat';
import styles from './mobile.module.css';
import arazi from './girdiArazi.module.css';

/**
 * Yaprak acilirken odaklanilacak bolum.
 */
export type AyarBolumu = 'kar' | 'iksa' | 'piyasa';

export type GelismisAyarlarSheetProps =
    & RiskCostProps
    & MarketFieldProps
    & {
        open: boolean;
        onClose: () => void;
        onUygula: () => void;
        onSifirla: () => void;
        acilisBolumu?: AyarBolumu;
    };

/**
 * Gelismis ayarlar yapragi — Figma 05 (Hesapla · Gelismis ayarlar (sheet),
 * 2045:187 / 2045:404). Bolum sirasi: iksa, muteahhit kari, piyasa fiyati.
 *
 * Yaprak yalnizca Iksa + Muteahhit Kazanci ve Piyasa Karsilastirmasi icerir.
 * Risk seviyesi, arsa alani VE Birim Insaat Maliyeti `GirdiKarti`nin ana
 * govdesinde (2026-08-04 TKGM konsolidasyonu + 2026-08-13 alan sirasi/Birim
 * Maliyet konsolidasyonu): ayni ucu hem kartta hem yaprakta gostermek onceki
 * bir sessiz-ezilme kusuruna yol acmisti (A1 I4).
 *
 * State/dogrulama `page.tsx`ten prop olarak gelir; burada kopyalanmaz.
 */
export function GelismisAyarlarSheet({
    open,
    onClose,
    onUygula,
    onSifirla,
    acilisBolumu,
    ...alanlar
}: GelismisAyarlarSheetProps) {
    const bolum = (...adaylar: AyarBolumu[]) =>
        String(acilisBolumu !== undefined && adaylar.includes(acilisBolumu));

    // Her bolum kendi DOM elemanina bir ref tutar; acilista hedef bolume
    // kaydirilir.
    const maliyetRef = useRef<HTMLElement | null>(null);
    const piyasaRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open || acilisBolumu === undefined) return;
        const hedefRef =
            acilisBolumu === 'piyasa' ? piyasaRef :
            maliyetRef; // 'kar' | 'iksa' ayni bolume dusuyor
        const azaltilmisHareket = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        hedefRef.current?.scrollIntoView({
            block: 'start',
            behavior: azaltilmisHareket ? 'auto' : 'smooth',
        });
    }, [open, acilisBolumu]);

    const { girdi: iksaManualGirdi, handleChange: handleIksaManualChange } =
        useBufferedNumberInput(alanlar.iksaManualTL, alanlar.setIksaManualTL);

    // Figma: segment yalnizca `Yuzde / Elle (₺)`. `off` durumu "yuzde 0" olarak
    // gosterilir; yuzde 0 yazilirsa mod yeniden `off`a doner, boylece motor
    // girdisi (isExcavationEnabled) eski anlamini korur.
    const iksaSegment: 'percentage' | 'manual' = alanlar.iksaMode === 'manual' ? 'manual' : 'percentage';
    const iksaYuzdeGosterilen = alanlar.iksaMode === 'off' ? 0 : alanlar.iksaPercentage;
    const kazancEtiketi = (label: string, value: number) => {
        const yuzde = Math.round((value - 1) * 100);
        return `${label} ${yuzde < 0 ? '−' : ''}%${Math.abs(yuzde)}`;
    };

    return (
        <BottomSheet open={open} onClose={onClose} title="Gelişmiş ayarlar" showCloseButton keepGrabber>
            <div className={styles.ayarlarGovde}>
                <section
                    ref={maliyetRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Maliyet ve riskler"
                    data-acilis={bolum('kar', 'iksa')}
                >
                    <div className={arazi.sheetBolum}>
                        <span className={arazi.sheetBaslik}>İksa maliyeti</span>
                        <div className={arazi.segmentSerit} role="group" aria-label="İksa hesaplama biçimi">
                            <button
                                type="button"
                                aria-pressed={iksaSegment === 'percentage'}
                                className={`${arazi.segmentSecenek} ${iksaSegment === 'percentage' ? arazi.segmentSecili : ''}`}
                                onClick={() => alanlar.setIksaMode(alanlar.iksaPercentage > 0 ? 'percentage' : 'off')}
                            >
                                Yüzde
                            </button>
                            <button
                                type="button"
                                aria-pressed={iksaSegment === 'manual'}
                                className={`${arazi.segmentSecenek} ${iksaSegment === 'manual' ? arazi.segmentSecili : ''}`}
                                onClick={() => alanlar.setIksaMode('manual')}
                            >
                                Elle (₺)
                            </button>
                        </div>
                        {iksaSegment === 'percentage' ? (
                            <div className={arazi.alan}>
                                <label className={arazi.etiket} htmlFor="ayar-iksa-oran">İksa oranı</label>
                                <div className={arazi.girdi}>
                                    <span className={arazi.girdiBirim}>%</span>
                                    <input
                                        id="ayar-iksa-oran"
                                        type="number"
                                        inputMode="decimal"
                                        className={arazi.girdiInput}
                                        value={iksaYuzdeGosterilen}
                                        min={0}
                                        max={100}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            if (v > 0) {
                                                alanlar.setIksaPercentage(v);
                                                alanlar.setIksaMode('percentage');
                                            } else {
                                                alanlar.setIksaMode('off');
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className={arazi.alan}>
                                <label className={arazi.etiket} htmlFor="ayar-iksa-tutar">İksa tutarı</label>
                                <div className={arazi.girdi}>
                                    <input
                                        id="ayar-iksa-tutar"
                                        type="text"
                                        inputMode="decimal"
                                        className={arazi.girdiInput}
                                        value={iksaManualGirdi}
                                        onChange={(e) => handleIksaManualChange(e.target.value)}
                                    />
                                    <span className={arazi.girdiBirim}>₺</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={arazi.sheetBolum}>
                        <span className={arazi.sheetBaslik}>Müteahhit kâr hedefi</span>
                        <div className={arazi.cipSatir}>
                            {alanlar.profitLevels.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    aria-pressed={alanlar.builderProfit === opt.value}
                                    className={`${arazi.cip} ${alanlar.builderProfit === opt.value ? arazi.cipAktif : ''}`}
                                    onClick={() => alanlar.setBuilderProfit(opt.value)}
                                >
                                    {kazancEtiketi(opt.label, opt.value)}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section
                    ref={piyasaRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Piyasa karşılaştırması"
                    data-acilis={bolum('piyasa')}
                >
                    <div className={arazi.alan}>
                        <label className={arazi.etiket} htmlFor="ayar-piyasa">Piyasa daire fiyatı (isteğe bağlı)</label>
                        <div className={arazi.girdi}>
                            <input
                                id="ayar-piyasa"
                                type="text"
                                inputMode="decimal"
                                className={arazi.girdiInput}
                                value={alanlar.manualMarketPrice}
                                onChange={(e) => alanlar.setManualMarketPrice(formatTRThousands(e.target.value))}
                            />
                            <span className={arazi.girdiBirim}>₺</span>
                        </div>
                    </div>
                </section>
            </div>

            <footer className={styles.ayarlarAyak}>
                {/* Erisilebilir adlar BILEREK uzun: RiskSuggestionCard da
                    "Uygula" adli bir buton render ediyor, ayni diyalogda iki
                    "Uygula" ekran okuyucuda ayirt edilemezdi. */}
                <button
                    type="button"
                    className={styles.ayarlarSifirla}
                    aria-label="Ayarları sıfırla"
                    onClick={onSifirla}
                >
                    Sıfırla
                </button>
                <button
                    type="button"
                    className={styles.ayarlarUygula}
                    aria-label="Ayarları uygula ve kapat"
                    onClick={onUygula}
                >
                    Uygula
                </button>
            </footer>
        </BottomSheet>
    );
}
