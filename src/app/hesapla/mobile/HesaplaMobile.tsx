"use client";

import { MobileScreen } from '@/components/mobile/MobileScreen';
import { IconPin, IconSettings } from '@/components/icons';
import { SonucKarti, type SonucKartiProps } from './SonucKarti';
import styles from './mobile.module.css';

export type HesaplaMobileProps = SonucKartiProps & {
    /** Baslik satirindaki konum ipucu (secili ilce/il, yoksa varsayilan metin). */
    konumEtiketi: string;
};

/**
 * Mobil `/hesapla` ekraninin koku.
 *
 * State SAHIPLENMEZ — tum girdi/sonuc state'i `page.tsx`'te yasar, buraya
 * prop olarak gelir (bkz. plan mimari karari: masaustu JSX'e hic dokunmadan
 * mobil ekran kendi agacinda kurulur).
 *
 * Bu turda yalnizca baslik satiri + degrade `SonucKarti` render edilir;
 * girdi karti Task 7'de, "Bu fiyat nereden geliyor" Task 8'de eklenecek.
 */
export function HesaplaMobile({ konumEtiketi, ...sonucKarti }: HesaplaMobileProps) {
    return (
        // `hasBottomNav={false}` BILEREK: bu sayfanin alt cubuk dolgusunu
        // `SiteChrome.tsx:20` zaten `--mobile-nav-pb` ile <main>'e veriyor.
        // Varsayilan `true` birakilsaydi dolgu IKI KEZ uygulanip ~180px olu
        // kaydirma alani olusurdu. Dolgunun sahibi bu sayfa icin SiteChrome'dur.
        <MobileScreen hasBottomNav={false}>
            <div className={styles.hesaplaMobilKok}>
                <header className={styles.headerRow}>
                    <div className={styles.logoBox} aria-hidden="true">
                        <div className={styles.logoDot} />
                    </div>
                    <span className={styles.headerTitle}>Hesapla</span>
                    <div className={styles.headerActions}>
                        <button type="button" className={styles.headerChip}>
                            <span className={styles.headerChipIcon}>
                                <IconPin size={15} strokeWidth={2.2} />
                            </span>
                            {konumEtiketi}
                        </button>
                        <button type="button" className={styles.headerIconBtn} aria-label="Ayarlar">
                            <IconSettings size={17} />
                        </button>
                    </div>
                </header>

                <SonucKarti {...sonucKarti} />
            </div>
        </MobileScreen>
    );
}
