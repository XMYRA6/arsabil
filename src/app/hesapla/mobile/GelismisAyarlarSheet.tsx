"use client";

import { useEffect, useRef } from 'react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import {
    MarketField,
    RiskCostFields,
    type MarketFieldProps,
    type RiskCostProps,
} from '../AdvancedSettingsSections';
import styles from './mobile.module.css';

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
 * `4f` gelismis ayarlar yapragi (tasarim kaynagi:
 * docs/tasarim/mobil-2026-07-28/kartlar/4f.html).
 *
 * Alan icerikleri mevcut `RiskCostFields` / `MarketField` /
 * `BirimMaliyetField` bilesenlerinden gelir — mantik KOPYALANMAZ, ayni state,
 * ayni dogrulama, ayni kenar durumlari korunur.
 *
 * Yaprak sadece Muteahhit Kazanci + Iksa Masrafi (`RiskCostFields`), Piyasa
 * Fiyati (`MarketField`) ve Birim Maliyet (`BirimMaliyetField`) icerir.
 * Risk seviyesi ve arsa alani BURADA DEGIL — ikisi de `SmartContextCard`a
 * tasindi (2026-08-04 TKGM konsolidasyonu), cunku `GirdiKarti` her zaman
 * gorunur ve parsel secilmeden de kullanilabilir olmalari gerekiyordu; ayni
 * ucu hem kartta hem yaprakta gostermek onceki bir sessiz-ezilme kusuruna
 * yol acmisti (A1 I4, daire-sayisi kontrolleri icin de ayni gerekceyle
 * yapraktan cikarilmisti).
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
                    aria-label="Piyasa karşılaştırması"
                    data-acilis={bolum('piyasa')}
                >
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
