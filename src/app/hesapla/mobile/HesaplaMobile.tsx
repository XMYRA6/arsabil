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
    /** Konum cipi `4f` yapragini konum/risk bolumunde acar. */
    onKonumAc: () => void;
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
    onKonumAc,
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
                        {/* Cip, yapragin "Konum ve resmi risk" bolumunu acar —
                            ParcelPicker orada yasiyor. Onceden hicbir isleve
                            bagli degildi ama buton olarak duyuruluyordu. */}
                        <button
                            type="button"
                            className={styles.headerChip}
                            aria-label={`Konum: ${konumEtiketi}. Değiştirmek için dokunun`}
                            onClick={onKonumAc}
                        >
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

                <div className={styles.sekmeKap}>
                    <SekmeSecici aktif={aktifSekme} onDegis={onSekmeDegis} />
                </div>

                {aktifSekme === 'analiz'
                    ? <AnalizSekmesi {...analiz} />
                    : (
                        <>
                            <SonucKarti {...sonuc} />
                            {fisAcik
                                ? <FiyatAciklamasi {...fiyatAciklamasi} />
                                : (
                                    <>
                                        <GirdiKarti {...girdi} />
                                        {/* Tasarim 2a.html:39 — girdi kartinin ALTINDA birincil
                                            kesif yolu. Baslikaki disli ikonu tek basina kalsaydi
                                            kullanici bu ekrani zor bulurdu. */}
                                        <button
                                            type="button"
                                            className={styles.gelismisAyarlarBtn}
                                            onClick={onAyarlarAc}
                                        >
                                            <span className={styles.gelismisAyarlarIkon}>
                                                <IconSettings size={16} strokeWidth={2.2} />
                                            </span>
                                            Gelişmiş ayarlar · risk, iksa, kâr
                                        </button>
                                    </>
                                )}
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
