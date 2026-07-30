"use client";

import { useEffect, useRef } from 'react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { ParcelPicker, type ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import { RiskSuggestionCard } from '@/components/risk/RiskSuggestionCard';
import type { RiskMeasurement } from '@/lib/risk/types';
import {
    ArsaAlaniFields,
    MarketField,
    RiskCostFields,
    type ArsaAlaniProps,
    type MarketFieldProps,
    type RiskCostProps,
} from '../AdvancedSettingsSections';
import styles from './mobile.module.css';

/**
 * Yaprak acilirken odaklanilacak bolum.
 *
 * `parsel` ayri bir deger (Task 10, canli dogrulamada bulundu): onceden
 * `onParselAc` de `risk`i kullaniyordu, ama `risk` zaten "Maliyet ve
 * riskler" bolumunun (kar/risk/iksa) bir uyesiydi — parsel butonuna
 * basinca IKI bolum birden isaretleniyor ve hicbiri gorunur alana
 * kaymiyordu (yaprak 1129px icerik / 652px gorunur, parsel EN ALTTA).
 */
export type AyarBolumu = 'kar' | 'risk' | 'iksa' | 'piyasa' | 'parsel';

export type GelismisAyarlarSheetProps =
    & RiskCostProps
    & MarketFieldProps
    & ArsaAlaniProps
    & {
        open: boolean;
        onClose: () => void;
        onUygula: () => void;
        onSifirla: () => void;
        acilisBolumu?: AyarBolumu;
        parcelValue: ParcelPickerValue;
        onParcelChange: (patch: Partial<ParcelPickerValue>) => void;
        risk: RiskMeasurement | null;
        onRiskUygula: (percent: number) => void;
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
    parcelValue,
    onParcelChange,
    risk,
    onRiskUygula,
    ...alanlar
}: GelismisAyarlarSheetProps) {
    const bolum = (...adaylar: AyarBolumu[]) =>
        String(acilisBolumu !== undefined && adaylar.includes(acilisBolumu));

    // Her bolum kendi DOM elemanina bir ref tutar; acilista hedef bolume
    // kaydirilir. `.ayarBolum`in `scroll-margin-top`u zaten bunun icin
    // vardi ama hic cagrilmiyordu (Task 10, canli dogrulamada bulundu):
    // parsel EN ALTTAKI bolum ve yaprak 1129px icerik / 652px gorunur —
    // kaydirmadan hedef ekran disinda kaliyordu.
    const maliyetRef = useRef<HTMLElement | null>(null);
    const piyasaRef = useRef<HTMLElement | null>(null);
    const arsaRef = useRef<HTMLElement | null>(null);
    const parselRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open || acilisBolumu === undefined) return;
        const hedefRef =
            acilisBolumu === 'piyasa' ? piyasaRef :
            acilisBolumu === 'parsel' ? parselRef :
            maliyetRef; // 'kar' | 'risk' | 'iksa' ayni bolume dusuyor
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
                {/* Kar, risk ve iksa tek bir mevcut bilesende yasiyor; ucu de
                    bu bolume dusuyor. */}
                <section
                    ref={maliyetRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Maliyet ve riskler"
                    data-acilis={bolum('kar', 'risk', 'iksa')}
                >
                    <RiskCostFields
                        iksaMode={alanlar.iksaMode}
                        setIksaMode={alanlar.setIksaMode}
                        iksaPercentage={alanlar.iksaPercentage}
                        setIksaPercentage={alanlar.setIksaPercentage}
                        iksaManualTL={alanlar.iksaManualTL}
                        setIksaManualTL={alanlar.setIksaManualTL}
                        riskLevel={alanlar.riskLevel}
                        setRiskLevel={alanlar.setRiskLevel}
                        riskLevels={alanlar.riskLevels}
                        builderProfit={alanlar.builderProfit}
                        setBuilderProfit={alanlar.setBuilderProfit}
                        profitLevels={alanlar.profitLevels}
                    />
                </section>

                <section
                    ref={piyasaRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Piyasa fiyatı"
                    data-acilis={bolum('piyasa')}
                >
                    <MarketField
                        manualMarketPrice={alanlar.manualMarketPrice}
                        setManualMarketPrice={alanlar.setManualMarketPrice}
                    />
                </section>

                <section
                    ref={arsaRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Arsa alanı"
                    data-acilis="false"
                >
                    <ArsaAlaniFields
                        isAaEnabled={alanlar.isAaEnabled}
                        setIsAaEnabled={alanlar.setIsAaEnabled}
                        arsaAlani={alanlar.arsaAlani}
                        setArsaAlani={alanlar.setArsaAlani}
                    />
                </section>

                <section
                    ref={parselRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Konum ve resmi risk"
                    data-acilis={bolum('parsel')}
                >
                    <ParcelPicker
                        value={parcelValue}
                        onChange={onParcelChange}
                        hint="Parselin resmi risk verilerini (yakın fay, taşkın) görmek isterseniz haritadan konum seçebilirsiniz — bu adım isteğe bağlıdır."
                        notFoundText="Bu noktada kayıtlı parsel bulunamadı. Pini parselin içine taşıyın — yol, dere veya kadastro dışı bir noktaya denk gelmiş olabilir. Doğrulama olmadan da hesaplama yapabilirsiniz."
                        unavailableText="TKGM servisi şu an yanıt vermiyor. Doğrulama olmadan da hesaplama yapabilirsiniz, daha sonra tekrar deneyebilirsiniz."
                    />
                    {risk && <RiskSuggestionCard risk={risk} onApply={onRiskUygula} />}
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
