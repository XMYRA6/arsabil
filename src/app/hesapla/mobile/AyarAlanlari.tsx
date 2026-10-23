"use client";

import type { MarketFieldProps, RiskCostProps } from '../AdvancedSettingsSections';
import { useBufferedNumberInput } from '../useBufferedNumberInput';
import { formatTRThousands } from '../trNumberFormat';
import arazi from './girdiArazi.module.css';

/**
 * Gelişmiş ayarların alanları — Figma 05 (Hesapla · Gelişmiş ayarlar):
 * mobil sheet ve masaüstü açılır bölüm AYNI bileşenleri kullanır.
 * State/doğrulama `page.tsx`ten prop olarak gelir; burada kopyalanmaz.
 */

/** İksa maliyeti (Yüzde / Elle ₺) + müteahhit kâr hedefi. */
export function MaliyetAlanlari(alanlar: RiskCostProps) {
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
        <>
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
        </>
    );
}

/** Piyasa daire fiyatı (isteğe bağlı). */
export function PiyasaAlani({ manualMarketPrice, setManualMarketPrice }: MarketFieldProps) {
    return (
        <div className={arazi.alan}>
            <label className={arazi.etiket} htmlFor="ayar-piyasa">Piyasa daire fiyatı (isteğe bağlı)</label>
            <div className={arazi.girdi}>
                <input
                    id="ayar-piyasa"
                    type="text"
                    inputMode="decimal"
                    className={arazi.girdiInput}
                    value={manualMarketPrice}
                    onChange={(e) => setManualMarketPrice(formatTRThousands(e.target.value))}
                />
                <span className={arazi.girdiBirim}>₺</span>
            </div>
        </div>
    );
}
