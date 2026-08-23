"use client";

import { MobileScreen } from '@/components/mobile/MobileScreen';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { IconSettings } from '@/components/icons';
import { SonucKarti, type SonucKartiProps } from './SonucKarti';
import { GirdiKarti, type GirdiKartiProps } from './GirdiKarti';
import { SonucDetayiMobileLeaf, type SonucDetayiMobileLeafProps } from './SonucDetayiMobileLeaf';
import { TasarimStudyosuHub } from './TasarimStudyosuHub';
import { SenaryoKarsilastirmaSekmesi } from './SenaryoKarsilastirmaSekmesi';
import { StudioMobileLeaf, type StudioMobileLeafProps } from './StudioMobileLeaf';
import { ProgramMixMobileLeaf, type ProgramMixMobileLeafProps } from './ProgramMixMobileLeaf';
import { LandownerOfferMobileLeaf, type LandownerOfferMobileLeafProps } from './LandownerOfferMobileLeaf';
import { Studio2DMobileLeaf, type Studio2DMobileLeafProps } from './Studio2DMobileLeaf';
import { StudioScenarioMobileLeaf, type StudioScenarioMobileLeafProps } from './StudioScenarioMobileLeaf';
import type { Scenario } from '@/components/ScenarioCompare';
import styles from './mobile.module.css';

export type HesaplaMobileProps = {
    sonuc: SonucKartiProps;
    girdi: GirdiKartiProps;
    /** Parsel doğrulama modalını açar */
    onParselDogrulaAc: () => void;
    /** "Sonuç Detayı" yaprağı açık mı — Hesap Fişi + Analiz birleşimi
        (2026-08-23 IA sadeleştirmesi). Durum `page.tsx`te yaşar. */
    sonucDetayiAcik: boolean;
    sonucDetayi: SonucDetayiMobileLeafProps;
    /** Girdi kartinin altindaki etiketli buton `4f` yapragini acar — gelismis
        ayarlara TEK kapi (spec K4/K5: basliktaki disli ve konum cipi kalkti). */
    onAyarlarAc: () => void;
    /** Studio 3D onizleme derinlestirme yapragi acik mi. Bilinen bosluk
        kapatildi: oncesi Studio yalnizca masaustu dalinda kabloluydu. */
    studioAcik: boolean;
    studio: StudioMobileLeafProps;
    /** Program Dagilimi derinlestirme yapragi acik mi (Faz 2A Task 3). */
    programMixAcik: boolean;
    programMix: ProgramMixMobileLeafProps;
    /** Arsa Sahibi Teklifi derinlestirme yapragi acik mi (Faz 2B Task 3). */
    landownerOfferAcik: boolean;
    landownerOffer: LandownerOfferMobileLeafProps;
    /** 2D Yerleşim Tahtası derinlestirme yapragi acik mi (Faz 3A). */
    studio2DAcik: boolean;
    studio2D: Studio2DMobileLeafProps;
    /** Senaryolar & Karşılaştırma derinlestirme yapragi acik mi (Faz 3B). */
    studioScenarioAcik?: boolean;
    studioScenario?: StudioScenarioMobileLeafProps;
    /** "Tasarım Stüdyosu" iç-içe hub menüsü açık mı — hiçbir alt-yaprak
        (studioAcik/programMixAcik/studio2DAcik/studioScenarioAcik) açık
        DEĞİLKEN ve bu true iken görünür (2026-08-23 IA sadeleştirmesi). */
    studioHubAcik: boolean;
    onStudioHubKapat: () => void;
    /** Hub'ın 4 alt-butonunun açtığı yapraklar — `SonucKarti`'nin eski
        `onStudioAc`/`onProgramMixAc`/`onStudio2DAc`/`onStudioScenarioAc`
        callback'leriyle AYNI setter'lara (`page.tsx`te) bağlanır, yalnızca
        artık `SonucKarti` yerine `TasarimStudyosuHub`'tan çağrılırlar. */
    onYerlesimAc: () => void;
    onProgramAc: () => void;
    on3DAc: () => void;
    onSenaryolarAc: () => void;
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
    sonucDetayiAcik,
    sonucDetayi,
    onParselDogrulaAc,
    onAyarlarAc,
    studioAcik,
    studio,
    programMixAcik,
    programMix,
    landownerOfferAcik,
    landownerOffer,
    studio2DAcik,
    studio2D,
    studioScenarioAcik,
    studioScenario,
    studioHubAcik,
    onStudioHubKapat,
    onYerlesimAc,
    onProgramAc,
    on3DAc,
    onSenaryolarAc,
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

                {studioScenarioAcik && studioScenario
                    ? <StudioScenarioMobileLeaf {...studioScenario} />
                    : studio2DAcik
                    ? <Studio2DMobileLeaf {...studio2D} />
                    : landownerOfferAcik
                    ? <LandownerOfferMobileLeaf {...landownerOffer} />
                    : programMixAcik
                    ? <ProgramMixMobileLeaf {...programMix} />
                    : studioAcik
                    ? <StudioMobileLeaf {...studio} />
                    : studioHubAcik
                    ? <TasarimStudyosuHub
                        onKapat={onStudioHubKapat}
                        onYerlesimAc={onYerlesimAc}
                        onProgramAc={onProgramAc}
                        on3DAc={on3DAc}
                        onSenaryolarAc={onSenaryolarAc}
                      />
                    : sonucDetayiAcik
                    ? <SonucDetayiMobileLeaf {...sonucDetayi} />
                    : karsilastirmaAcik
                    ? <SenaryoKarsilastirmaSekmesi scenarios={savedScenarios} onKapat={onKarsilastirmaKapat} onShareRequest={onShareRequest} />
                    : (
                        <>
                            <SonucKarti {...sonuc} />
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
