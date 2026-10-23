"use client";

import { IconFile } from '@/components/icons';
import styles from './sonucCubugu.module.css';

export type SonucCubuguProps = {
    minDaireFiyati: number | null;
    arsaPayiYuzde: number;
    hasEnoughDataForResult: boolean;
    /** Rapor düğmesinin erişilebilir adı ve kayıt sırasındaki metni. */
    ctaMetni: string;
    ctaDevreDisi: boolean;
    onCta: () => void;
    /** Çubuğun sol tarafına dokunmak sonuç ayrıntısını açar. */
    onDetayAc: () => void;
};

const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/**
 * Alt menünün hemen üstünde sabit sonuç çubuğu: girdiler yukarıdan aşağıya
 * doldurulurken sonuç (min. daire fiyatı, arsa payı) aynı ekranda canlı değişir.
 * "Özet Rapor Oluştur" ayrı bir çubuk olmak yerine bu çubuğun sağındaki düğmedir.
 */
export function SonucCubugu({
    minDaireFiyati,
    arsaPayiYuzde,
    hasEnoughDataForResult,
    ctaMetni,
    ctaDevreDisi,
    onCta,
    onDetayAc,
}: SonucCubuguProps) {
    const kaydediliyor = ctaMetni !== 'Özet Rapor Oluştur';
    return (
        <div className={styles.cubuk} role="region" aria-label="Hesap sonucu">
            <button type="button" className={styles.sonuc} onClick={onDetayAc}>
                <span className={styles.etiket}>Min. daire fiyatı</span>
                {hasEnoughDataForResult && minDaireFiyati !== null ? (
                    <span className={styles.deger}>
                        {trFormat.format(minDaireFiyati)} ₺
                        <span className={styles.pay}>Pay %{trFormat.format(arsaPayiYuzde)}</span>
                    </span>
                ) : (
                    <span className={styles.bos}>Daire m² ve birim maliyet girin</span>
                )}
            </button>
            <button
                type="button"
                className={styles.rapor}
                onClick={onCta}
                disabled={ctaDevreDisi}
                aria-label={ctaMetni}
            >
                <IconFile size={18} />
                {kaydediliyor ? ctaMetni : 'Rapor'}
            </button>
        </div>
    );
}
