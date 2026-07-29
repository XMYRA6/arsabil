"use client";

import { BottomSheet } from '@/components/mobile/BottomSheet';
import { ParcelPicker, type ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import { RiskSuggestionCard } from '@/components/risk/RiskSuggestionCard';
import type { RiskMeasurement } from '@/lib/risk/types';
import {
    FormulParamsFields,
    MarketField,
    RiskCostFields,
    type FormulParamsProps,
    type MarketFieldProps,
    type RiskCostProps,
} from '../AdvancedSettingsSections';
import styles from './mobile.module.css';

/** Yaprak acilirken odaklanilacak bolum. */
export type AyarBolumu = 'kar' | 'risk' | 'iksa' | 'piyasa';

export type GelismisAyarlarSheetProps =
    & RiskCostProps
    & MarketFieldProps
    & FormulParamsProps
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
 * `FormulParamsFields` bilesenlerinden gelir — mantik KOPYALANMAZ. Bu,
 * masaustu cekmecesiyle davranis paritesini garanti eder: ayni state,
 * ayni dogrulama, ayni kenar durumlari.
 *
 * NOT (Task 11): tasarimin segment kontrollu gorunumu heniz uygulanmadi;
 * su an masaustu cekmece isaretlemesi yapragin icinde yeniden kullaniliyor.
 * Gorsel uyum final dogrulamada ele alinacak (bkz. task-11-acik-kalemler.md).
 *
 * T2'nin acik kalemi burada kapaniyor: `ParcelPicker` ve
 * `RiskSuggestionCard` masaustu-only idi, artik mobilde de erisilebilir.
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

    return (
        <BottomSheet open={open} onClose={onClose} title="Gelişmiş ayarlar">
            <div className={styles.ayarlarGovde}>
                {/* Kar, risk ve iksa tek bir mevcut bilesende yasiyor; ucu de
                    bu bolume dusuyor. */}
                <section
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
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Formül parametreleri"
                    data-acilis="false"
                >
                    <FormulParamsFields
                        isApartmentCountEnabled={alanlar.isApartmentCountEnabled}
                        setIsApartmentCountEnabled={alanlar.setIsApartmentCountEnabled}
                        totalApartments={alanlar.totalApartments}
                        setTotalApartments={alanlar.setTotalApartments}
                        ownerApartmentShare={alanlar.ownerApartmentShare}
                        setOwnerApartmentShare={alanlar.setOwnerApartmentShare}
                        isAaEnabled={alanlar.isAaEnabled}
                        setIsAaEnabled={alanlar.setIsAaEnabled}
                        arsaAlani={alanlar.arsaAlani}
                        setArsaAlani={alanlar.setArsaAlani}
                    />
                </section>

                <section
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Konum ve resmi risk"
                    data-acilis={bolum('risk')}
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
