"use client";

import { MobileScreen } from '@/components/mobile/MobileScreen';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { IconPin, IconSettings } from '@/components/icons';
import { SonucKarti, type SonucKartiProps } from './SonucKarti';
import { GirdiKarti, type GirdiKartiProps } from './GirdiKarti';
import { FiyatAciklamasi, type FiyatAciklamasiProps } from './FiyatAciklamasi';
import { AnalizSekmesi, SekmeSecici, type AnalizSekmesiProps, type MobilSekme } from './AnalizSekmesi';
import styles from './mobile.module.css';

export type HesaplaMobileProps = {
    /** Baslik satirindaki konum ipucu (secili ilce/il, yoksa varsayilan metin). */
    konumEtiketi: string;
    sonuc: SonucKartiProps;
    girdi: GirdiKartiProps;
    /** `4a` acik mi. Durum `page.tsx`te yasar; bu bilesen state tutmaz. */
    fisAcik: boolean;
    fiyatAciklamasi: FiyatAciklamasiProps;
    /** Baslik satirindaki ayarlar butonu `4f` yapragini acar. */
    onAyarlarAc: () => void;
    aktifSekme: MobilSekme;
    onSekmeDegis: (sekme: MobilSekme) => void;
    analiz: AnalizSekmesiProps;
    /** Sabit CTA — masaustundeki "Ozet Rapor Olustur" akisinin mobil karsiligi. */
    ctaMetni: string;
    ctaDevreDisi: boolean;
    onCta: () => void;
};

/**
 * Mobil `/hesapla` ekraninin koku.
 *
 * State SAHIPLENMEZ — tum girdi/sonuc state'i `page.tsx`'te yasar, buraya
 * prop olarak gelir (bkz. plan mimari karari: masaustu JSX'e hic dokunmadan
 * mobil ekran kendi agacinda kurulur).
 */
export function HesaplaMobile({
    konumEtiketi,
    sonuc,
    girdi,
    fisAcik,
    fiyatAciklamasi,
    onAyarlarAc,
    aktifSekme,
    onSekmeDegis,
    analiz,
    ctaMetni,
    ctaDevreDisi,
    onCta,
}: HesaplaMobileProps) {
    return (
        <>
        {/* `hasBottomNav={false}` BILEREK: bu sayfanin alt cubuk dolgusunu
            `SiteChrome.tsx:20` zaten `--mobile-nav-pb` ile <main>'e veriyor.
            Varsayilan `true` birakilsaydi dolgu IKI KEZ uygulanip ~180px olu
            kaydirma alani olusurdu. Dolgunun sahibi bu sayfa icin SiteChrome'dur.
            `hasStickyCta` ise asagidaki sabit CTA'nin yuksekligini ekler. */}
        <MobileScreen hasBottomNav={false} hasStickyCta>
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
                        <button
                            type="button"
                            className={styles.headerIconBtn}
                            aria-label="Gelişmiş ayarlar"
                            onClick={onAyarlarAc}
                        >
                            <IconSettings size={17} />
                        </button>
                    </div>
                </header>

                <SekmeSecici aktif={aktifSekme} onDegis={onSekmeDegis} />

                {aktifSekme === 'analiz'
                    ? <AnalizSekmesi {...analiz} />
                    : (
                        <>
                            <SonucKarti {...sonuc} />
                            {fisAcik
                                ? <FiyatAciklamasi {...fiyatAciklamasi} />
                                : <GirdiKarti {...girdi} />}
                        </>
                    )}
            </div>
        </MobileScreen>

        {/* CTA cubugu `MobileScreen`in DISINDA: `.screen > *` kurali her
            dogrudan cocuga `position: relative` veriyor ve StickyActionBar
            `position: fixed` — ikisi ayni specificity'de (0,1,0) oldugu icin
            kazanan CSS modul sirasina kalirdi. Kardes olarak birakilinca
            catisma hic dogmuyor. */}
        <StickyActionBar aboveBottomNav>
            <button
                type="button"
                className={styles.mobilCta}
                onClick={onCta}
                disabled={ctaDevreDisi}
            >
                {ctaMetni}
            </button>
        </StickyActionBar>
        </>
    );
}
