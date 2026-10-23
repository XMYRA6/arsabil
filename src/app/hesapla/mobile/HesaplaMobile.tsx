"use client";

import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useState } from 'react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { SonucCubugu } from './SonucCubugu';
import { SonucKarti, type SonucKartiProps } from './SonucKarti';
import { HesapOzetiKarti } from './HesapOzetiKarti';
import { YapiKutlesiKarti, type YapiKutlesiKartiProps } from './YapiKutlesiKarti';
import { SenaryolarKarti } from './SenaryolarKarti';
import type { CalculationOutput } from '@/lib/calculator/engine_v2';
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
import kompakt from './sonucCubugu.module.css';
import ust from './hesaplaUst.module.css';

export type HesaplaMobileProps = {
    sonuc: Omit<SonucKartiProps, 'onPiyasaEkle'>;
    /** Hesap özeti kartı için motor çıktısı. */
    result: CalculationOutput | null;
    yapiKutlesi: Pick<YapiKutlesiKartiProps, 'katSayisi' | 'daireSayisi' | 'parselDogrulandi'>;
    /** Sonuç Detayı yaprağını açar (Hesap özeti > Analiz/Finans). */
    onSonucDetayiAc: () => void;
    /** Arsa Sahibi Teklifi yaprağını açar (Yapı kütlesi kartı). */
    onTeklifAc: () => void;
    /** Sonuç kartındaki "Piyasa fiyatı ekle" — sheet'i piyasa bölümüyle açar. */
    onPiyasaEkle: () => void;
    girdi: Omit<GirdiKartiProps, 'onAyarlarAc'>;
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
    /** Tasarım Senaryoları derinlestirme yapragi acik mi (Faz 3B). */
    studioScenarioAcik: boolean;
    studioScenario: StudioScenarioMobileLeafProps;
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
    result,
    yapiKutlesi,
    onSonucDetayiAc,
    onTeklifAc,
    onPiyasaEkle,
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
    const [sonucAcik, setSonucAcik] = useState(false);
    return (
        <>
        {/* `hasBottomNav={false}` BILEREK: bu sayfanin alt cubuk dolgusunu
            `SiteChrome.tsx:20` zaten `--mobile-nav-pb` ile <main>'e veriyor.
            Varsayilan `true` birakilsaydi dolgu IKI KEZ uygulanip ~180px olu
            kaydirma alani olusurdu. Dolgunun sahibi bu sayfa icin SiteChrome'dur.
            `hasStickyCta` ise asagidaki sabit CTA'nin yuksekligini ekler. */}
        <MobileScreen hasBottomNav={false} hasStickyCta>
            <div className={styles.hesaplaMobilKok}>
                {/* Kompakt üst satır: yalnızca küçük "Örnek proje" bağlantısı. Eski
                    kicker/başlık ve büyük örnek-proje kartı mobilde yer yiyordu (alt menüde
                    sekme adı zaten var). */}
                {!(studioScenarioAcik || studio2DAcik || landownerOfferAcik || programMixAcik || studioAcik || studioHubAcik || sonucDetayiAcik || karsilastirmaAcik) && (
                    <header className={ust.satir}>
                        <button type="button" className={ust.ornek} onClick={sonuc.onOrnekProjeIleDene}>Örnek proje</button>
                    </header>
                )}

                {studioScenarioAcik
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
                            <GirdiKarti {...girdi} onParselDogrulaAc={onParselDogrulaAc} onAyarlarAc={onAyarlarAc} />
                            <HesapOzetiKarti result={result} onSonucDetayiAc={onSonucDetayiAc} />
                            <YapiKutlesiKarti
                                hasResult={hasResult}
                                {...yapiKutlesi}
                                on2BPlan={onYerlesimAc}
                                onProgramAc={onProgramAc}
                                onTeklifAc={onTeklifAc}
                                onTasarimSenaryolariAc={onSenaryolarAc}
                            />
                            <SenaryolarKarti
                                senaryolar={savedScenarios}
                                onEkle={onAddScenario}
                                onKaldir={onRemoveScenario}
                                onKarsilastirAc={onKarsilastirmaAc}
                                hasResult={hasResult}
                            />
                        </>
                    )}
            </div>
        </MobileScreen>

        {/* Sonuç çubuğu `MobileScreen`in DISINDA: `.screen > *` kuralı her doğrudan
            çocuğa `position: relative` veriyor, çubuk ise `position: fixed`. Kardeş
            olarak bırakılınca çakışma hiç doğmuyor. Çubuk yalnızca ana ekranda görünür. */}
        {!(studioScenarioAcik || studio2DAcik || landownerOfferAcik || programMixAcik || studioAcik || studioHubAcik || sonucDetayiAcik || karsilastirmaAcik) && (
            <SonucCubugu
                minDaireFiyati={sonuc.minDaireFiyati}
                arsaPayiYuzde={sonuc.arsaPayiYuzde}
                hasEnoughDataForResult={sonuc.hasEnoughDataForResult}
                ctaMetni={ctaMetni}
                ctaDevreDisi={ctaDevreDisi}
                onCta={onCta}
                onDetayAc={() => setSonucAcik(true)}
            />
        )}
        <BottomSheet open={sonucAcik} onClose={() => setSonucAcik(false)} title="Sonuç" showCloseButton keepGrabber>
            <div className={kompakt.sheetIc}>
                <SonucKarti {...sonuc} onPiyasaEkle={() => { setSonucAcik(false); onPiyasaEkle(); }} />
            </div>
        </BottomSheet>
        </>
    );
}
