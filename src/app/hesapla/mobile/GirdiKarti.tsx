"use client";

import styles from './mobile.module.css';

export type GirdiKartiProps = {
    luxLevel: number;
    onLuxLevel: (v: number) => void;
    apartmentSize: number;
    onApartmentSize: (v: number) => void;
    landShareRatio: number;
    onLandShareRatio: (v: number) => void;
    isApartmentCountEnabled: boolean;
    onApartmentCountEnabled: (v: boolean) => void;
    totalApartments: number;
    onTotalApartments: (v: number) => void;
    ownerApartmentShare: number;
    onOwnerApartmentShare: (v: number) => void;
};

/** Yapi standardi segmentleri — degerler motorun `L` katsayisidir. */
const YAPI_STANDARTLARI = [
    { etiket: 'Standart', deger: 1.0 },
    { etiket: 'Orta', deger: 1.2 },
    { etiket: 'Lüks', deger: 1.4 },
] as const;

const M2_ADIM = 5;
const M2_MIN = 50;
const M2_MAX = 400;

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
    luxLevel,
    onLuxLevel,
    apartmentSize,
    onApartmentSize,
    landShareRatio,
    onLandShareRatio,
    isApartmentCountEnabled,
    onApartmentCountEnabled,
    totalApartments,
    onTotalApartments,
    ownerApartmentShare,
    onOwnerApartmentShare,
}: GirdiKartiProps) {
    // Sd acikken gosterilen yuzde TURETILMISTIR, ayri bir state degildir.
    const turetilmisYuzde = totalApartments > 0
        ? Math.round((ownerApartmentShare / totalApartments) * 100)
        : 0;

    return (
        <section className={styles.girdiKarti} aria-label="Proje girdileri">
            {/* ── Yapi standardi ── */}
            <div className={styles.girdiSatir}>
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
                                {etiket}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Daire buyuklugu ── */}
            <div className={styles.girdiSatir}>
                <span className={styles.girdiEtiket}>Daire büyüklüğü</span>
                <div className={styles.stepperSatir}>
                    <button
                        type="button"
                        className={styles.stepperAzalt}
                        aria-label="Metrekareyi azalt"
                        onClick={() => {
                            const yeni = apartmentSize - M2_ADIM;
                            if (yeni >= M2_MIN) onApartmentSize(yeni);
                        }}
                    >
                        −
                    </button>
                    <span className={`${styles.stepperDeger} mNum`}>
                        {apartmentSize}
                        <span className={styles.stepperBirim}> m²</span>
                    </span>
                    <button
                        type="button"
                        className={styles.stepperArtir}
                        aria-label="Metrekareyi artır"
                        onClick={() => {
                            const yeni = apartmentSize + M2_ADIM;
                            if (yeni <= M2_MAX) onApartmentSize(yeni);
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* ── Arsa payi modu ── */}
            <div className={styles.girdiSatir}>
                <div className={styles.modSatir}>
                    <span className={styles.girdiEtiket}>Toplam daire sayısı üzerinden</span>
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
                            aria-label="Arsa payı yüzdesi"
                            onChange={e => onLandShareRatio(Number(e.target.value))}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
