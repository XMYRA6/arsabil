"use client";

import { useRef } from 'react';
import { computeEffectiveLandShareX, ORNEK_APARTMENT_SIZE } from '../calculatorUiHelpers';
import { LocationHeader, RiskSection, AreaSection } from '../SmartContextCardSections';
import { useBufferedNumberInput } from '../useBufferedNumberInput';
import { kaynakEtiketi, type BirimMaliyetKaynagi } from './unitPriceSource';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from '../riskSuggestionHelpers';
import type { RiskKaynagi } from './riskSource';
import styles from './mobile.module.css';

export type GirdiKartiProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
    /** Parsel doğrulama modalını açar */
    onParselDogrulaAc: () => void;
    luxLevel: number;
    onLuxLevel: (v: number) => void;
    apartmentSize: number | null;
    onApartmentSize: (v: number | null) => void;
    globalUnitPrice: number | null;
    birimMaliyetKaynagi: BirimMaliyetKaynagi;
    onBirimMaliyet: (v: number) => void;
    landShareRatio: number;
    onLandShareRatio: (v: number) => void;
    isApartmentCountEnabled: boolean;
    onApartmentCountEnabled: (v: boolean) => void;
    totalApartments: number;
    onTotalApartments: (v: number) => void;
    ownerApartmentShare: number;
    onOwnerApartmentShare: (v: number) => void;
};

/**
 * Segment glifleri. Tasarim (2a.html:24-26) burada DOLU ikonlar kullaniyor;
 * `@/components/icons` setindeki cizgi ikonlardan bilerek farklilar — o set
 * navigasyon/aksiyon ikonlari icin.
 */
const GLIF: Record<string, string> = {
    Standart: 'M12 3L2 12h3v8h14v-8h3L12 3zm0 2.84L17.5 12h-11L12 5.84z',
    Orta: 'M3 21h18v-2H3v2zm6-4h6V5H9v12zm8 0h6v-8h-6v8zm-16 0h6v-6H1v6z',
    'Lüks': 'M5 21h14V3H5v18zm2-14h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z',
};

/** Yapi standardi segmentleri — degerler motorun `L` katsayisidir. */
const YAPI_STANDARTLARI = [
    { etiket: 'Standart', deger: 1.0 },
    { etiket: 'Orta', deger: 1.2 },
    { etiket: 'Lüks', deger: 1.4 },
] as const;

/** Slider dolgusunun yuzdesi. CSS `--progress` olarak okur (RangeSlider deseni). */
function ilerleme(deger: number, min: number, max: number): React.CSSProperties {
    const aralik = max - min;
    const yuzde = aralik > 0 ? ((deger - min) / aralik) * 100 : 0;
    return { '--progress': `${Math.min(Math.max(yuzde, 0), 100)}%` } as React.CSSProperties;
}

const M2_ADIM = 5;
const M2_MIN = 50;
const M2_MAX = 400;

const AA_ADIM = 10;
const AA_MIN = 10;

/**
 * `2a` cam girdi karti (tasarim kaynagi:
 * docs/tasarim/mobil-2026-07-28/kartlar/2a.html).
 *
 * KRITIK — korunan davranis: `isApartmentCountEnabled` acikken arsa payi
 * yuzdesi SALT-OKUNURDUR ve `ownerApartmentShare/totalApartments` tek gercek
 * kaynaktir. Bu, 2026-07-24'te kapatilan gercek bir bugun (arsa payinin
 * sessizce 8/N'de donmasi) cozumudur; iki girdi ayni anda duzenlenebilir
 * olsaydi sessizce ayrisirlardi.
 */
export function GirdiKarti({
    parcelContext,
    arsaAlani,
    onArsaAlani,
    riskLevel,
    riskLevels,
    onRiskLevel,
    riskKaynagi,
    isAaEnabled,
    onIsAaEnabled,
    luxLevel,
    onLuxLevel,
    apartmentSize,
    onApartmentSize,
    globalUnitPrice,
    birimMaliyetKaynagi,
    onBirimMaliyet,
    landShareRatio,
    onLandShareRatio,
    isApartmentCountEnabled,
    onApartmentCountEnabled,
    totalApartments,
    onTotalApartments,
    ownerApartmentShare,
    onOwnerApartmentShare,
    onParselDogrulaAc,
}: GirdiKartiProps) {
    // Sd acikken gosterilen yuzde TURETILMISTIR, ayri bir state degildir.
    // Formul KOPYALANMAZ: motora giden deger de ayni yardimcidan gelir
    // (page.tsx), satir ici bir kopya zamanla ayrisirdi (A1 minor).
    const turetilmisYuzde = Math.round(computeEffectiveLandShareX({
        isApartmentCountEnabled: true,
        ownerApartmentShare,
        totalApartments,
        landShareRatio,
    }) * 100);

    const { girdi: birimMaliyetGirdi, handleChange: handleBirimMaliyetChange } =
        useBufferedNumberInput(globalUnitPrice, onBirimMaliyet);

    const stepperInputRef = useRef<HTMLInputElement>(null);

    return (
        <section className={styles.girdiKarti} aria-label="Proje girdileri">
            <LocationHeader parcelContext={parcelContext} onOpenMap={onParselDogrulaAc} />

            <AreaSection
                parcelContext={parcelContext}
                arsaAlani={arsaAlani}
                onArsaAlani={onArsaAlani}
                isAaEnabled={isAaEnabled}
                onIsAaEnabled={onIsAaEnabled}
                stepper={{ step: AA_ADIM, min: AA_MIN }}
            />

            <div className={styles.girdiSatir} data-girdi-blok="yapi-standardi">
                <span className={styles.girdiEtiket}>Yapı standardı</span>
                <div className={styles.segmentKap} role="tablist" aria-label="Yapı standardı">
                    {YAPI_STANDARTLARI.map(({ etiket, deger }) => {
                        const secili = luxLevel === deger;
                        return (
                            <button
                                key={etiket}
                                type="button"
                                role="tab"
                                aria-selected={secili}
                                className={`${styles.segment} ${secili ? styles.segmentAktif : ''}`}
                                onClick={() => onLuxLevel(deger)}
                            >
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d={GLIF[etiket]} />
                                </svg>
                                {etiket}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Daire buyuklugu ── */}
            <div className={styles.girdiSatir} data-girdi-blok="daire-buyuklugu">
                <span className={styles.girdiEtiket}>Daire büyüklüğü</span>
                <div className={styles.stepperSatir}>
                    <div
                        className={styles.stepperTextGrup}
                        onClick={() => stepperInputRef.current?.focus()}
                    >
                        <input
                            ref={stepperInputRef}
                            type="number"
                            inputMode="numeric"
                            className={`${styles.stepperInput} mNum`}
                            value={apartmentSize ?? ''}
                            placeholder="—"
                            aria-label="Daire büyüklüğü, m²"
                            onChange={(e) => onApartmentSize(e.target.value === '' ? null : Number(e.target.value))}
                        />
                        <span className={styles.stepperBirim}>m²</span>
                    </div>
                    <button
                        type="button"
                        className={styles.stepperAzalt}
                        aria-label="Metrekareyi azalt"
                        onClick={() => {
                            if (apartmentSize === null) return;
                            const yeni = apartmentSize - M2_ADIM;
                            if (yeni >= M2_MIN) onApartmentSize(yeni);
                        }}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        className={styles.stepperArtir}
                        aria-label="Metrekareyi artır"
                        onClick={() => {
                            if (apartmentSize === null) { onApartmentSize(ORNEK_APARTMENT_SIZE); return; }
                            const yeni = apartmentSize + M2_ADIM;
                            if (yeni <= M2_MAX) onApartmentSize(yeni);
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* ── Birim insaat maliyeti — YENI, ana karta tasindi ── */}
            <div className={styles.girdiSatir} data-girdi-blok="birim-maliyet">
                <span className={styles.girdiEtiket}>
                    Birim inşaat maliyeti
                    <span className={styles.girdiEtiketKaynak}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
                </span>
                <div className={styles.birimMaliyetSatir}>
                    <input
                        type="text"
                        inputMode="decimal"
                        className={`${styles.birimMaliyetInput} mNum`}
                        value={birimMaliyetGirdi}
                        placeholder="—"
                        aria-label="Birim inşaat maliyeti, TL/m²"
                        onChange={(e) => handleBirimMaliyetChange(e.target.value)}
                    />
                    <span className={styles.birimMaliyetBirim}>TL/m²</span>
                </div>
            </div>

            {/* ── Arsa payi modu ── */}
            <div className={styles.girdiSatir} data-girdi-blok="arsa-payi">
                <div className={styles.modSatir}>
                    <span className={styles.modEtiket}>
                        Daire sayısıyla gir{' '}
                        <span className={styles.modIpucu}>
                            ({totalApartments}&rsquo;de {ownerApartmentShare})
                        </span>
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isApartmentCountEnabled}
                        aria-label="Toplam daire sayısı üzerinden hesapla"
                        className={`${styles.anahtar} ${isApartmentCountEnabled ? styles.anahtarAcik : ''}`}
                        onClick={() => onApartmentCountEnabled(!isApartmentCountEnabled)}
                    >
                        <span className={styles.anahtarTopu} />
                    </button>
                </div>

                {isApartmentCountEnabled ? (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Toplam daire</span>
                            <span className={`${styles.sliderDeger} mNum`}>{totalApartments}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={1}
                            max={80}
                            step={1}
                            value={totalApartments}
                            style={ilerleme(totalApartments, 1, 80)}
                            aria-label="Toplam daire sayısı"
                            onChange={e => onTotalApartments(Number(e.target.value))}
                        />

                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa sahibinin daire sayısı</span>
                            <span className={`${styles.sliderDeger} mNum`}>{ownerApartmentShare}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={totalApartments}
                            step={1}
                            value={ownerApartmentShare}
                            style={ilerleme(ownerApartmentShare, 0, totalApartments)}
                            aria-label="Arsa sahibinin daire sayısı"
                            onChange={e => onOwnerApartmentShare(Number(e.target.value))}
                        />

                        {/* Salt-okunur: bu mod acikken yuzde TURETILIR, girilmez. */}
                        <p className={styles.turetilmisNot}>
                            Arsa payı <span className={`${styles.turetilmisYuzde} mNum`}>%{turetilmisYuzde}</span>
                            {' '}olarak hesaplanıyor.
                        </p>
                    </>
                ) : (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa payı</span>
                            <span className={`${styles.sliderDeger} mNum`}>%{landShareRatio}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={100}
                            step={1}
                            value={landShareRatio}
                            style={ilerleme(landShareRatio, 0, 100)}
                            aria-label="Arsa payı yüzdesi"
                            onChange={e => onLandShareRatio(Number(e.target.value))}
                        />
                    </>
                )}
            </div>

            <RiskSection
                riskLevel={riskLevel}
                riskLevels={riskLevels}
                onRiskLevel={onRiskLevel}
                riskKaynagi={riskKaynagi}
            />
        </section>
    );
}
