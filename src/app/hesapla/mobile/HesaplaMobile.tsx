"use client";

import { MobileScreen } from '@/components/mobile/MobileScreen';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { IconSettings } from '@/components/icons';
import { SonucKarti, type SonucKartiProps } from './SonucKarti';
import { GirdiKarti, type GirdiKartiProps } from './GirdiKarti';
import { FiyatAciklamasi, type FiyatAciklamasiProps } from './FiyatAciklamasi';
import { AnalizSekmesi, type AnalizSekmesiProps } from './AnalizSekmesi';
import { SenaryoKarsilastirmaSekmesi } from './SenaryoKarsilastirmaSekmesi';
import type { Scenario } from '@/components/ScenarioCompare';
import styles from './mobile.module.css';

export type HesaplaMobileProps = {
    sonuc: SonucKartiProps;
    girdi: GirdiKartiProps;
    /** Parsel doğrulama modalını açar */
    onParselDogrulaAc: () => void;
    /** `4a` acik mi. Durum `page.tsx`te yasar; bu bilesen state tutmaz. */
    fisAcik: boolean;
    fiyatAciklamasi: FiyatAciklamasiProps;
    /** Girdi kartinin altindaki etiketli buton `4f` yapragini acar — gelismis
        ayarlara TEK kapi (spec K4/K5: basliktaki disli ve konum cipi kalkti). */
    onAyarlarAc: () => void;
    /** Analiz derinlestirme yapragi acik mi. Durum `page.tsx`te yasar. */
    analizAcik: boolean;
    /** Kapatma affordance'i `AnalizSekmesi.onKapat` icinde yasar — bkz. o dosya. */
    analiz: AnalizSekmesiProps;
    /** Sabit CTA — masaustundeki "Ozet Rapor Olustur" akisinin mobil karsiligi. */
    ctaMetni: string;
    ctaDevreDisi: boolean;
    onCta: () => void;
    /** Masaustundeki savedScenarios ile AYNI state, page.tsx'ten prop olarak akar. */
    savedScenarios: Scenario[];
    onAddScenario: () => void;
    onRemoveScenario: (id: string) => void;
    /** `!!result` — sabit CTA cubugundaki "+ Karsilastir" butonunun etkinlik kosulu. */
    hasResult: boolean;
    /** Karsilastirma derinlestirme yapragi acik mi. Durum `page.tsx`te yasar. */
    karsilastirmaAcik: boolean;
    onKarsilastirmaAc: () => void;
    onKarsilastirmaKapat: () => void;
    onShareRequest: (ids: string[]) => Promise<string | null>;
};

/**
 * Mobil `/hesapla` ekraninin koku.
 *
 * State SAHIPLENMEZ — tum girdi/sonuc state'i `page.tsx`'te yasar, buraya
 * prop olarak gelir (bkz. plan mimari karari: masaustu JSX'e hic dokunmadan
 * mobil ekran kendi agacinda kurulur).
 */
export function HesaplaMobile({
    sonuc,
    girdi,
    fisAcik,
    fiyatAciklamasi,
    onParselDogrulaAc,
    onAyarlarAc,
    analizAcik,
    analiz,
    ctaMetni,
    ctaDevreDisi,
    onCta,
    savedScenarios,
    onAddScenario,
    onRemoveScenario,
    hasResult,
    karsilastirmaAcik,
    onKarsilastirmaAc,
    onKarsilastirmaKapat,
    onShareRequest,
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
                {/* Baslikta artik yalnizca logo + ad var: konum cipi girdi
                    kartina (`KonumBlogu`), disli ise etiketli "Gelismis
                    ayarlar" butonuna tasindi — gelismis ayarlara TEK kapi
                    (spec K4/K5). */}
                <header className={styles.headerRow}>
                    <div className={styles.logoBox} aria-hidden="true">
                        <div className={styles.logoDot} />
                    </div>
                    <span className={styles.headerTitle}>Hesapla</span>
                </header>

                {analizAcik
                    ? <AnalizSekmesi {...analiz} />
                    : karsilastirmaAcik
                    ? <SenaryoKarsilastirmaSekmesi scenarios={savedScenarios} onKapat={onKarsilastirmaKapat} onShareRequest={onShareRequest} />
                    : (
                        <>
                            <SonucKarti {...sonuc} />
                            {fisAcik
                                ? <FiyatAciklamasi {...fiyatAciklamasi} />
                                : (
                                    <>
                                        <GirdiKarti {...girdi} onParselDogrulaAc={onParselDogrulaAc} />
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
                                        {savedScenarios.length > 0 && (
                                            <div className={styles.senaryoPillSatiri}>
                                                {savedScenarios.map(s => (
                                                    <span key={s.id} className={styles.senaryoPill}>
                                                        {s.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemoveScenario(s.id)}
                                                            aria-label={`${s.name}'i kaldır`}
                                                            className={styles.senaryoPillKaldir}
                                                        >×</button>
                                                    </span>
                                                ))}
                                                {savedScenarios.length >= 2 && (
                                                    <button
                                                        type="button"
                                                        className={styles.senaryoKarsilastirCip}
                                                        onClick={onKarsilastirmaAc}
                                                    >
                                                        Karşılaştır ({savedScenarios.length}) ›
                                                    </button>
                                                )}
                                            </div>
                                        )}
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
            <button
                type="button"
                className={styles.mobilKarsilastirBtn}
                onClick={onAddScenario}
                disabled={!hasResult || savedScenarios.length >= 3}
                title={savedScenarios.length >= 3 ? 'Maksimum 3 senaryo' : undefined}
            >
                + Karşılaştır
            </button>
        </StickyActionBar>
        </>
    );
}
