"use client";

import styles from './sonucArazi.module.css';

export type SonucKartiProps = {
    minDaireFiyati: number | null;
    arsaPayiYuzde: number;
    /** Müteahhidin kârını koruyarak verebileceği en yüksek arsa payı (0-1);
     * yalnız piyasa fiyatı girilmişse motor döndürür, aksi halde `null`. */
    maksPayOrani: number | null;
    /** Toplam daire sayısı — yalnız "Daire sayısıyla belirle" açıkken bilinir. */
    daireSayisi: number | null;
    /** Girilen piyasa daire fiyatı (TL); yoksa `null`. */
    piyasaFiyati: number | null;
    /** Piyasaya göre fark yüzdesi (negatif = piyasanın altında); `null` -> rozet yok. */
    farkYuzde: number | null;
    hasEnoughDataForResult: boolean;
    isDemoData: boolean;
    onOrnekProjeIleDene: () => void;
    /** Piyasa fiyatı girmek için Gelişmiş ayarlar sheet'ini piyasa bölümüyle açar. */
    onPiyasaEkle: () => void;
};

// `maximumFractionDigits: 0` SART: Intl varsayilani 3'tur ve motor ciktisi
// (FD_total = M * K) neredeyse hicbir zaman tam sayi degildir — varsayilanla
// kart "8.964.000,371" yazar. Bicimleme kuralinin cagri yerlerine dagilmamasi
// icin tek kaynak burasi.
const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const trFormat1 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** null -> em-dash. Sonuc yoksa "0" DEGIL "—" gosterilir (0, bos ile ayni sey degil). */
function fmt(n: number | null): string {
    return n === null ? '—' : trFormat.format(n);
}

/**
 * Mobil sonuç kartı — Figma 05 · Hesapla Mobil 390 (2045:24).
 *
 * "Sonuç Detayı" / "Tasarım Stüdyosu" / "Arsa Sahibi Teklifi" kısayolları
 * artık bu kartta değil: Hesap özeti ve Yapı kütlesi kartlarında (Figma).
 * Piyasa fiyatı girişi de Gelişmiş ayarlar sheet'inde (tek giriş noktası);
 * kart yalnızca sonucu ve karşılaştırma rozetini gösterir.
 */
export function SonucKarti({
    minDaireFiyati,
    arsaPayiYuzde,
    maksPayOrani,
    daireSayisi,
    piyasaFiyati,
    farkYuzde,
    hasEnoughDataForResult,
    isDemoData,
    onOrnekProjeIleDene,
    onPiyasaEkle,
}: SonucKartiProps) {
    if (!hasEnoughDataForResult) {
        return (
            <section className={styles.kart} aria-label="Hesap sonucu">
                <p className={styles.bosMetin}>
                    Sonuçları görmek için daire m² ve birim maliyeti gir.
                </p>
                <button type="button" className={styles.birincilBtn} onClick={onOrnekProjeIleDene}>
                    Örnek proje ile dene
                </button>
            </section>
        );
    }

    const ucuz = farkYuzde !== null && farkYuzde < 0;

    return (
        <section className={styles.kart} aria-label="Hesap sonucu">
            <div className={styles.kartBaslikSatir}>
                <span className={styles.etiket}>Min. daire fiyatı</span>
                {isDemoData && <span className={`${styles.rozet} ${styles.rozetAmber}`}>Örnek veri</span>}
            </div>

            <div className={styles.fiyat}>
                {fmt(minDaireFiyati)}
                {minDaireFiyati !== null && <span className={styles.fiyatBirim}>₺</span>}
            </div>

            <div className={styles.karsilastirma}>
                {farkYuzde !== null ? (
                    <span className={`${styles.rozet} ${ucuz ? styles.rozetYesil : styles.rozetKirmizi}`}>
                        Piyasanın %{Math.abs(farkYuzde)} {ucuz ? 'altında' : 'üstünde'}
                    </span>
                ) : (
                    <button type="button" className={styles.piyasaEkle} onClick={onPiyasaEkle}>
                        Piyasa fiyatı ekle
                    </button>
                )}
                {piyasaFiyati !== null && (
                    <span className={styles.piyasaDeger}>{trFormat.format(piyasaFiyati)} ₺</span>
                )}
            </div>

            <div className={styles.metrikler}>
                <div className={styles.metrik}>
                    <span className={styles.metrikEtiket}>Arsa payı</span>
                    <span className={styles.metrikDeger}>%{trFormat.format(arsaPayiYuzde)}</span>
                </div>
                <div className={styles.metrik}>
                    <span className={styles.metrikEtiket}>Maks. pay</span>
                    <span className={styles.metrikDeger}>
                        {maksPayOrani !== null && maksPayOrani >= 0 ? `%${trFormat1.format(maksPayOrani * 100)}` : '—'}
                    </span>
                </div>
                <div className={styles.metrik}>
                    <span className={styles.metrikEtiket}>Daire</span>
                    <span className={styles.metrikDeger}>{daireSayisi ?? '—'}</span>
                </div>
            </div>
        </section>
    );
}
