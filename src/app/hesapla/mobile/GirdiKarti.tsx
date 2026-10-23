"use client";

import { useState, type ReactNode } from 'react';
import { computeEffectiveLandShareX, ORNEK_APARTMENT_SIZE, type QualityTier } from '../calculatorUiHelpers';
import { riskNotu } from '../SmartContextCardSections';
import { useBufferedNumberInput } from '../useBufferedNumberInput';
import { kaynakEtiketi, type BirimMaliyetKaynagi } from './unitPriceSource';
import { riskKaynakEtiketi, type RiskKaynagi } from './riskSource';
import { Toggle } from '@/components/ui/Toggle';
import { IconPin, IconChevronRight } from '@/components/icons';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from '../riskSuggestionHelpers';
import styles from './girdiArazi.module.css';

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
    luxTier: QualityTier;
    onLuxTier: (v: QualityTier) => void;
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
    /** Gelişmiş ayarlar sheet'ini açar — Figma'da kartın son satırı (mobil). */
    onAyarlarAc?: () => void;
    /** Verilirse masaüstü düzeni: tek sütun alanlar, arsa maliyeti modeli,
     * −/+ metrekare ve satır içinde açılan Gelişmiş ayarlar (Figma 05 masaüstü). */
    masaustu?: {
        landCostModel: 'proportional' | 'comparable';
        onLandCostModel: (m: 'proportional' | 'comparable') => void;
        canUseComparable: boolean;
        comparableNote: string;
        comparableTitle: string;
        ayarlarAlani: ReactNode;
    };
};

/**
 * Yapı standardı glifleri — Figma 05 (Icon/home, Icon/building, Icon/star):
 * çizgi ikonlar, seçili kart amber.
 */
const GLIF: Record<string, React.ReactNode> = {
    Standart: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    Orta: (
        <>
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
        </>
    ),
    'Lüks': <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />,
};

/** Yapi standardi segmentlerinin SABIT kimligi (etiket+tier) — sayisal
 * katsayi (`deger`) artik `qualityLevels` prop'undan (admin panelinden)
 * geliyor, burada sabit kodlanmiyor (denetim bulgusu C3). */
const YAPI_STANDARTLARI_SIRASI: { tier: QualityTier; etiket: string }[] = [
    { tier: 'standart', etiket: 'Standart' },
    { tier: 'orta', etiket: 'Orta' },
    { tier: 'luks', etiket: 'Lüks' },
];

/** Slider dolgusunun yuzdesi. CSS `--progress` olarak okur (RangeSlider deseni). */
function ilerleme(deger: number, min: number, max: number): React.CSSProperties {
    const aralik = max - min;
    const yuzde = aralik > 0 ? ((deger - min) / aralik) * 100 : 0;
    return { '--progress': `${Math.min(Math.max(yuzde, 0), 100)}%` } as React.CSSProperties;
}

/**
 * Mobil "Proje bilgileri" kartı (Figma 05 · Hesapla Mobil 390 · 2045:46).
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
    luxTier,
    onLuxTier,
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
    onAyarlarAc,
    masaustu,
}: GirdiKartiProps) {
    const [ayarlarAcik, setAyarlarAcik] = useState(false);
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

    const parsel = parcelContext?.parcel ?? null;
    const adres = parsel?.mahalle
        ? [parsel.il, parsel.ilce, `${parsel.mahalle} Mah.`].filter(Boolean).join(' · ')
        : parcelContext
            ? 'Haritadan seçilen nokta'
            : null;
    const alanDogrulandi = parcelContext?.status === 'verified' && !!parsel?.areaSqm;

    return (
        <section className={`${styles.kart} ${masaustu ? styles.kartMasaustu : ''}`} aria-label="Proje girdileri">
            <h2 className={styles.baslik}>Proje bilgileri</h2>

            {/* ── Konum ── */}
            <div className={styles.alan} data-girdi-blok="konum">
                <button type="button" className={styles.konum} onClick={onParselDogrulaAc}>
                    <IconPin size={20} className={styles.konumIkon} />
                    {adres ? (
                        <span className={styles.konumMetin}>{adres}</span>
                    ) : (
                        <span className={`${styles.konumMetin} ${styles.konumBos}`}>Haritadan parsel seç</span>
                    )}
                    {adres && <span className="sr-only">Değiştir</span>}
                    <IconChevronRight size={18} className={styles.konumOk} />
                </button>
                {alanDogrulandi && <span className={styles.resmiRozet}>Resmi parsel verisi</span>}
            </div>

            {/* ── Arsa alanı + Ort. daire ── */}
            <div className={styles.ikiSutun}>
                <div className={styles.alan} data-girdi-blok="arsa-alani">
                    <label className={styles.etiket} htmlFor="hesapla-arsa-alani">Arsa alanı</label>
                    <div className={styles.girdi} data-devre-disi={!isAaEnabled}>
                        <input
                            id="hesapla-arsa-alani"
                            type="number"
                            inputMode="numeric"
                            className={styles.girdiInput}
                            value={arsaAlani || ''}
                            placeholder="—"
                            disabled={!isAaEnabled}
                            onChange={(e) => onArsaAlani(Number(e.target.value))}
                        />
                        <span className={styles.girdiBirim}>m²</span>
                    </div>
                </div>

                <div className={styles.alan} data-girdi-blok="daire-buyuklugu">
                    <label className={styles.etiket} htmlFor="hesapla-daire-m2">Ort. daire</label>
                    <div className={styles.girdi}>
                        <input
                            id="hesapla-daire-m2"
                            type="number"
                            inputMode="numeric"
                            className={styles.girdiInput}
                            value={apartmentSize ?? ''}
                            placeholder="—"
                            aria-label="Daire büyüklüğü, m²"
                            onChange={(e) => onApartmentSize(e.target.value === '' ? null : Number(e.target.value))}
                        />
                        <span className={styles.girdiBirim}>m²</span>
                        {masaustu && (
                            <>
                                <button
                                    type="button"
                                    className={styles.adimBtn}
                                    aria-label="Metrekareyi azalt"
                                    onClick={() => { if (apartmentSize !== null) onApartmentSize(Math.max(50, apartmentSize - 5)); }}
                                >
                                    −
                                </button>
                                <button
                                    type="button"
                                    className={styles.adimBtn}
                                    aria-label="Metrekareyi artır"
                                    onClick={() => onApartmentSize(apartmentSize === null ? ORNEK_APARTMENT_SIZE : apartmentSize + 5)}
                                >
                                    +
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.anahtarSatir}>
                <span>Arsa alanını hesaba kat</span>
                <Toggle
                    checked={isAaEnabled}
                    aria-label="Arsa alanını hesaba kat"
                    onChange={(e) => onIsAaEnabled(e.target.checked)}
                />
            </div>

            {masaustu && (
                <div className={styles.alan}>
                    <span className={styles.etiket}>Arsa maliyeti modeli</span>
                    <div className={styles.segmentSerit} role="group" aria-label="Arsa maliyeti modeli">
                        <button
                            type="button"
                            aria-pressed={masaustu.landCostModel === 'proportional'}
                            className={`${styles.segmentSecenek} ${masaustu.landCostModel === 'proportional' ? styles.segmentSecili : ''}`}
                            onClick={() => masaustu.onLandCostModel('proportional')}
                        >
                            Oransal
                        </button>
                        <button
                            type="button"
                            aria-pressed={masaustu.landCostModel === 'comparable'}
                            className={`${styles.segmentSecenek} ${masaustu.landCostModel === 'comparable' ? styles.segmentSecili : ''}`}
                            disabled={!masaustu.canUseComparable}
                            title={masaustu.comparableTitle}
                            onClick={() => masaustu.onLandCostModel('comparable')}
                        >
                            Emsal
                        </button>
                    </div>
                    <p className={styles.altNot}>{masaustu.comparableNote}</p>
                </div>
            )}

            {/* ── Birim maliyet ── */}
            <div className={styles.alan} data-girdi-blok="birim-maliyet">
                <label className={styles.etiket} htmlFor="hesapla-birim-maliyet">Birim maliyet</label>
                <div className={styles.girdi}>
                    <input
                        id="hesapla-birim-maliyet"
                        type="text"
                        inputMode="decimal"
                        className={styles.girdiInput}
                        value={birimMaliyetGirdi}
                        placeholder="—"
                        aria-label="Birim inşaat maliyeti, TL/m²"
                        onChange={(e) => handleBirimMaliyetChange(e.target.value)}
                    />
                    <span className={styles.girdiBirim}>₺/m²</span>
                </div>
                <p className={styles.altNot}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</p>
            </div>

            {/* ── Daire standardı ── */}
            <div className={styles.alan} data-girdi-blok="yapi-standardi">
                <span className={styles.etiket}>Daire standardı</span>
                <div className={styles.standartSatir} role="tablist" aria-label="Yapı standardı">
                    {YAPI_STANDARTLARI_SIRASI.map(({ etiket, tier }) => {
                        const secili = luxTier === tier;
                        return (
                            <button
                                key={etiket}
                                type="button"
                                role="tab"
                                aria-selected={secili}
                                className={`${styles.standart} ${secili ? styles.standartAktif : ''}`}
                                onClick={() => onLuxTier(tier)}
                            >
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    {GLIF[etiket]}
                                </svg>
                                {etiket}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Arsa payı ── */}
            <div className={styles.alan} data-girdi-blok="arsa-payi">
                {isApartmentCountEnabled ? (
                    <>
                        <div className={styles.payBaslik}>
                            <span className={styles.etiket}>Toplam daire</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                className={styles.payDegerInput}
                                value={totalApartments}
                                min={1}
                                max={80}
                                aria-label="Toplam daire sayısı, sayı ile"
                                onChange={e => {
                                    if (e.target.value === '') return;
                                    onTotalApartments(Number(e.target.value));
                                }}
                            />
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

                        <div className={styles.payBaslik}>
                            <span className={styles.etiket}>Arsa sahibinin daire sayısı</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                className={styles.payDegerInput}
                                value={ownerApartmentShare}
                                min={0}
                                max={Math.max(totalApartments - 1, 0)}
                                aria-label="Arsa sahibinin daire sayısı, sayı ile"
                                onChange={e => {
                                    if (e.target.value === '') return;
                                    onOwnerApartmentShare(Number(e.target.value));
                                }}
                            />
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={Math.max(totalApartments - 1, 0)}
                            step={1}
                            value={ownerApartmentShare}
                            style={ilerleme(ownerApartmentShare, 0, Math.max(totalApartments - 1, 0))}
                            aria-label="Arsa sahibinin daire sayısı"
                            onChange={e => onOwnerApartmentShare(Number(e.target.value))}
                        />

                        {/* Salt-okunur: bu mod acikken yuzde TURETILIR, girilmez. */}
                        <p className={styles.altNot}>
                            Arsa payı <span className={styles.payDeger}>%{turetilmisYuzde}</span>
                            {' '}olarak hesaplanıyor.
                        </p>
                    </>
                ) : (
                    <>
                        <div className={styles.payBaslik}>
                            <span className={styles.etiket}>Arsa payı</span>
                            <span className={styles.payDeger}>%{landShareRatio}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={masaustu ? 10 : 0}
                            max={100}
                            step={1}
                            value={landShareRatio}
                            style={ilerleme(landShareRatio, masaustu ? 10 : 0, 100)}
                            aria-label="Arsa payı yüzdesi"
                            onChange={e => onLandShareRatio(Number(e.target.value))}
                        />
                        {masaustu && (
                            <div className={styles.olcekUclar} aria-hidden="true">
                                <span>%10</span>
                                <span>%100</span>
                            </div>
                        )}
                        {/* Musteri bilerek %100'e kadar cikabilmesini istedi —
                            kelepce yerine seffaflik: x=1'e yaklasinca engine_v2.ts
                            maliyeti matematiksel olarak buyutuyor (M=Mi/(1-x)),
                            bu bir hata degil, arsa sahibinin projenin neredeyse
                            tamamini aldigi senaryonun dogru sonucu (denetim-2
                            bulgusu, desktop page.tsx'teki ayni satirin ikizi). */}
                        {landShareRatio >= 90 && (
                            <p className={styles.uyari}>
                                Bu kadar yüksek bir arsa payında proje maliyeti matematiksel olarak çok yükselir — arsa sahibi projenin neredeyse tamamını alıyor demektir.
                            </p>
                        )}
                    </>
                )}

                <div className={styles.anahtarSatir}>
                    <span>
                        Daire sayısıyla belirle{' '}
                        ({totalApartments}&rsquo;de {ownerApartmentShare})
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
            </div>

            {/* ── Risk seviyesi ── */}
            <div className={styles.alan} data-girdi-blok="deprem-riski">
                <span className={styles.etiket}>
                    Risk seviyesi
                    <span className={styles.etiketKaynak}>{riskKaynakEtiketi(riskKaynagi)}</span>
                </span>
                <div className={styles.cipSatir}>
                    {riskLevels.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            aria-pressed={riskLevel === opt.value}
                            className={`${styles.cip} ${riskLevel === opt.value ? styles.cipAktif : ''}`}
                            onClick={() => onRiskLevel(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <p className={styles.altNot}>{riskNotu(riskLevel)}</p>
            </div>

            <button
                type="button"
                className={styles.gelismis}
                aria-expanded={masaustu ? ayarlarAcik : undefined}
                onClick={masaustu ? () => setAyarlarAcik(a => !a) : onAyarlarAc}
            >
                Gelişmiş ayarlar
                <IconChevronRight size={18} className={masaustu && ayarlarAcik ? styles.gelismisAcik : undefined} />
            </button>
            {masaustu && ayarlarAcik && (
                <div className={styles.ayarlarAcilan}>{masaustu.ayarlarAlani}</div>
            )}
        </section>
    );
}
