"use client";

import { useState } from 'react';
import type { CalculationOutput } from '@/lib/calculator/engine_v2';
import { formatTRThousands } from '../trNumberFormat';
import styles from './masaustu.module.css';

export type SonucPaneliProps = {
    result: CalculationOutput | null;
    hasEnoughDataForResult: boolean;
    isDemoData: boolean;
    isApartmentCountEnabled: boolean;
    isAaEnabled: boolean;
    /** Risk seviyesi yüzdesi (motor çıktısında risk oranı ayrı alan değil). */
    riskLevel: number;
    /** Girilen piyasa daire fiyatı (TL); yoksa 0. */
    marketPriceNum: number;
    manualMarketPrice: string;
    onManualMarketPrice: (v: string) => void;
    onOrnekProjeIleDene: () => void;
};

const tl0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const tl2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const yuzde1 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const para = (n: number) => `${tl2.format(n)} ₺`;

/**
 * Masaüstü "Hesap sonuçları" — Figma 05 · Hesapla Masaüstü 1440:
 * Hesap fişi kartı + üç stat kartı (Min. daire fiyatı, Piyasa değerine göre,
 * Maks. sürdürülebilir arsa payı). Tüm değerler motor çıktısından gelir.
 */
export function SonucPaneli({
    result,
    hasEnoughDataForResult,
    isDemoData,
    isApartmentCountEnabled,
    isAaEnabled,
    riskLevel,
    marketPriceNum,
    manualMarketPrice,
    onManualMarketPrice,
    onOrnekProjeIleDene,
}: SonucPaneliProps) {
    const [duzenleniyor, setDuzenleniyor] = useState(false);
    const [taslak, setTaslak] = useState(manualMarketPrice);

    const baslik = (
        <div className={styles.baslikSatir}>
            <h2 className={styles.baslikMetin}>Hesap sonuçları</h2>
            <span className={`${styles.rozet} ${styles.rozetMavi}`}>Engine v2</span>
            {isDemoData && <span className={`${styles.rozet} ${styles.rozetAmber}`}>Örnek veri</span>}
        </div>
    );

    if (!hasEnoughDataForResult || !result) {
        return (
            <section aria-label="Hesap sonuçları">
                {baslik}
                <div className={`${styles.kart} ${styles.bosDurum}`}>
                    <p className={styles.bosMetin}>Sonuçları görmek için daire m² ve birim maliyeti gir.</p>
                    <button type="button" className={styles.birincilBtn} onClick={onOrnekProjeIleDene}>
                        Örnek proje ile dene
                    </button>
                </div>
            </section>
        );
    }

    const risk = Math.max(result.Mi - result.Mi_base - result.Mz, 0);
    const insaat = result.Mi - risk;
    const kar = result.FD_total - result.M;
    const katsayi = result.M > 0 ? result.FD_total / result.M : null;

    // İşaret mobil kartla AYNI: negatif = hesaplanan fiyat piyasanın altında.
    const fark = marketPriceNum > 0 ? ((result.FD_total - marketPriceNum) / marketPriceNum) * 100 : null;
    const ucuz = fark !== null && fark < 0;
    const igne = fark === null ? 50 : Math.max(0, Math.min(100, ((fark + 30) / 60) * 100));

    const kaydet = () => {
        const kirpilmis = taslak.trim();
        if (kirpilmis.length > 0) onManualMarketPrice(kirpilmis);
        setDuzenleniyor(false);
    };

    return (
        <section aria-label="Hesap sonuçları">
            {baslik}

            <div className={styles.kart}>
                <h3 className={styles.kartBaslik}>Hesap fişi</h3>
                <dl className={styles.fisSatirlar}>
                    <div className={styles.fisSatir}>
                        <dt>İnşaat maliyeti (Mi)</dt>
                        <dd>{para(insaat)}</dd>
                    </div>
                    {risk > 0 && (
                        <div className={styles.fisSatir}>
                            <dt>Risk payı (%{riskLevel})</dt>
                            <dd>{para(risk)}</dd>
                        </div>
                    )}
                    <div className={styles.fisSatir}>
                        <dt>Arsa maliyeti (Ma)</dt>
                        <dd>{para(result.Ma)}</dd>
                    </div>
                    <div className={`${styles.fisSatir} ${styles.fisToplam}`}>
                        <dt>Toplam maliyet (M)</dt>
                        <dd>{para(result.M)}</dd>
                    </div>
                    <div className={styles.fisSatir}>
                        <dt>× Kâr katsayısı (K)</dt>
                        <dd>{katsayi !== null ? `× ${katsayi.toFixed(2).replace('.', ',')}` : '—'}</dd>
                    </div>
                    <div className={styles.fisSatir}>
                        <dt>Hedef kâr</dt>
                        <dd>{para(kar)}</dd>
                    </div>
                    <div className={styles.fisSatir}>
                        <dt>Min. daire fiyatı (FD)</dt>
                        <dd>{para(result.FD_total)}</dd>
                    </div>
                    <div className={styles.fisSatir}>
                        <dt>Daire birim (FDbirim)</dt>
                        <dd>{tl0.format(result.FD_per_m2)} ₺/m²</dd>
                    </div>
                    {result.FA != null && (
                        <div className={`${styles.fisSatir} ${styles.fisToplam}`}>
                            {/* "Min." — FA piyasa değeri DEĞİL, hesaplanan minimum
                                daire fiyatına (FD_total) dayalı (denetim bulgusu C5). */}
                            <dt>Min. arsa fiyatı (FA)</dt>
                            <dd>{para(result.FA)}</dd>
                        </div>
                    )}
                </dl>
            </div>

            <div className={`${styles.statSatir} ${styles.statSatirUst}`}>
                <div className={styles.stat}>
                    {/* "Min." — piyasa değeri DEĞİL, hesaplanan minimum daire
                        fiyatına dayalı (denetim bulgusu C5). */}
                    <span className={styles.statEtiket}>Min. daire fiyatı</span>
                    <span className={styles.statDeger}>
                        {tl0.format(Math.round(result.FD_total))}
                        <span className={styles.statDegerKucuk}>₺</span>
                    </span>
                    <p className={styles.statAlt}>
                        {isApartmentCountEnabled && result.Sdx != null
                            ? `Arsa sahibine düşen: ${yuzde1.format(result.Sdx)} daire · müteahhit kârı korunarak`
                            : 'Müteahhit kârı korunarak hesaplanan minimum satış fiyatı'}
                    </p>
                    {isAaEnabled && result.FAbirim != null && (
                        <p className={styles.statAlt}>Arsa birim: {tl0.format(result.FAbirim)} ₺/m²</p>
                    )}
                </div>

                <div className={styles.stat}>
                    <span className={styles.statEtiket}>Piyasa değerine göre</span>
                    {fark !== null && !duzenleniyor ? (
                        <>
                            <span className={`${styles.statDeger} ${ucuz ? styles.iyi : styles.kotu}`}>
                                %{yuzde1.format(Math.abs(fark))} {ucuz ? 'altında' : 'üstünde'}
                            </span>
                            <div className={styles.olcek} aria-hidden="true">
                                <span
                                    className={`${styles.olcekDolgu} ${ucuz ? '' : styles.olcekDolguKotu}`}
                                    style={{ width: `${igne}%` }}
                                />
                                <span className={styles.olcekIgne} style={{ left: `${igne}%` }} />
                            </div>
                            <p className={styles.statAlt}>Piyasa: {tl0.format(marketPriceNum)} ₺ / daire</p>
                            <button
                                type="button"
                                className={styles.duzenleBtn}
                                onClick={() => { setTaslak(manualMarketPrice); setDuzenleniyor(true); }}
                            >
                                Piyasa fiyatını değiştir
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Taslak yerel state'te tutulur, yalnız Enter/blur'da commit
                                edilir: aksi halde ilk rakamdan itibaren (1 -> 1 TL) saçma
                                bir yüzde hesaplanırdı (2026-08-14 UX kararı). */}
                            <div className={styles.piyasaGiris}>
                                <input
                                    className={styles.piyasaGirisInput}
                                    type="text"
                                    inputMode="decimal"
                                    aria-label="Yaklaşık Piyasa Fiyatı"
                                    placeholder="Piyasa fiyatını gir"
                                    value={taslak}
                                    autoFocus={duzenleniyor}
                                    onFocus={() => setDuzenleniyor(true)}
                                    onChange={(e) => setTaslak(formatTRThousands(e.target.value))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') kaydet(); }}
                                    onBlur={kaydet}
                                />
                                <span className={styles.etiket}>₺</span>
                            </div>
                            <p className={styles.statAlt}>
                                Hesaplanan fiyatla karşılaştıralım ve bırakabileceğin maksimum arsa payını gösterelim.
                            </p>
                        </>
                    )}
                </div>

                {/* Yalnız piyasa fiyatı girilmişse görünür (denetim bulgusu C6) —
                    Pmarket olmadan x_max motor tarafından zaten null döner. */}
                {result.x_max != null && (
                    <div className={styles.stat}>
                        <span className={styles.statEtiket}>Maks. sürdürülebilir arsa payı</span>
                        {result.x_max >= 0 ? (
                            <>
                                <span className={styles.statDeger}>%{yuzde1.format(result.x_max * 100)}</span>
                                <p className={styles.statAlt}>Kâr hedefini koruyarak verilebilecek en yüksek pay</p>
                            </>
                        ) : (
                            <p className={styles.statAlt}>
                                Bu birim maliyet ve kâr hedefiyle, girilen piyasa fiyatında proje mümkün değil (maliyet piyasa fiyatını aşıyor).
                            </p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
