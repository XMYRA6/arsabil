"use client";

import { useEffect, useRef } from 'react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import {
    MarketField,
    RiskCostFields,
    BirimMaliyetField,
    type MarketFieldProps,
    type RiskCostProps,
    type BirimMaliyetFieldProps,
} from '../AdvancedSettingsSections';
import styles from './mobile.module.css';

/**
 * Yaprak acilirken odaklanilacak bolum.
 */
export type AyarBolumu = 'kar' | 'iksa' | 'piyasa';

export type GelismisAyarlarSheetProps =
    & RiskCostProps
    & MarketFieldProps
    & BirimMaliyetFieldProps
    & {
        open: boolean;
        onClose: () => void;
        onUygula: () => void;
        onSifirla: () => void;
        acilisBolumu?: AyarBolumu;
    };

/**
 * `4f` gelismis ayarlar yapragi (tasarim kaynagi:
 * docs/tasarim/mobil-2026-07-28/kartlar/4f.html).
 *
 * Alan icerikleri mevcut `RiskCostFields` / `MarketField` /
 * `ArsaAlaniFields` bilesenlerinden gelir — mantik KOPYALANMAZ. Bu,
 * masaustu cekmecesiyle davranis paritesini garanti eder: ayni state,
 * ayni dogrulama, ayni kenar durumlari.
 *
 * NOT (Task 11): tasarimin segment kontrollu gorunumu heniz uygulanmadi;
 * su an masaustu cekmece isaretlemesi yapragin icinde yeniden kullaniliyor.
 * Gorsel uyum final dogrulamada ele alinacak (bkz. task-11-acik-kalemler.md).
 *
 * T2'nin acik kalemi burada kapaniyor: `ParcelPicker` ve
 * `RiskSuggestionCard` masaustu-only idi, artik mobilde de erisilebilir.
 *
 * A1 I4: daire-sayisi kontrolleri (Toplam Daire Sayisi, Arsa Sahibine Dusen
 * Daire) yapraktan cikarildi — bunlar yalnizca girdi kartina ait; ayni ucu
 * hem kartta hem yaprakta gostermek, birini degistirince digerini sessizce
 * yeniden yaziyordu. `FormulParamsFields` masaustu cekmecesinde degismeden
 * kaliyor (bkz. `AdvancedSettingsSections.tsx`).
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

    return (
        <BottomSheet open={open} onClose={onClose} title="Gelişmiş ayarlar">
            <div className={styles.ayarlarGovde}>
                <section
                    ref={piyasaRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Piyasa fiyatı"
                    data-acilis={bolum('piyasa')}
                >
                    <BirimMaliyetField
                        globalUnitPrice={alanlar.globalUnitPrice}
                        birimMaliyetKaynagi={alanlar.birimMaliyetKaynagi}
                        onBirimMaliyet={alanlar.onBirimMaliyet}
                    />
                    <MarketField
                        manualMarketPrice={alanlar.manualMarketPrice}
                        setManualMarketPrice={alanlar.setManualMarketPrice}
                    />
                </section>

                <section
                    ref={maliyetRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Maliyet ve riskler"
                    data-acilis={bolum('kar', 'iksa')}
                >
                    <RiskCostFields
                        iksaMode={alanlar.iksaMode}
                        setIksaMode={alanlar.setIksaMode}
                        iksaPercentage={alanlar.iksaPercentage}
                        setIksaPercentage={alanlar.setIksaPercentage}
                        iksaManualTL={alanlar.iksaManualTL}
                        setIksaManualTL={alanlar.setIksaManualTL}
                        builderProfit={alanlar.builderProfit}
                        setBuilderProfit={alanlar.setBuilderProfit}
                        profitLevels={alanlar.profitLevels}
                    />
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
