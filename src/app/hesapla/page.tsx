"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { CalculatorEngineV2, CalculationInput, CalculationOutput } from '@/lib/calculator/engine_v2';
import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice } from './calculatorUiHelpers';
import { PriceEvaluationChart } from '@/components/charts/PriceEvaluationChart';
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart';
import { SensitivityChart } from '@/components/charts/SensitivityChart';
import { BreakEvenChart } from '@/components/charts/BreakEvenChart';
import { FinancialDashboard } from '@/components/FinancialDashboard';
import { AuthModal } from '@/components/auth/AuthModal';
import { toast } from 'react-hot-toast';
// Dynamically imported to avoid SSR issues with @react-pdf/renderer
type GeneratePdfFn = typeof import('@/lib/pdf/report_generator').generatePdfReport;
import { ScenarioCompare } from '@/components/ScenarioCompare';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { MarketField, BirimMaliyetField } from './AdvancedSettingsSections';

import { HesapFisi } from './HesapFisi';
import type { RiskLevel } from './riskSuggestionHelpers';
import { HesaplaMobile } from './mobile/HesaplaMobile';
import { ParcelModal } from './ParcelModal';
import { SmartContextCard } from './SmartContextCard';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskMeasurement } from '@/lib/risk/types';
import { piyasaFarkiYuzdesi, sonucDegeri } from './mobile/hesaplaMobileProps';
import { GelismisAyarlarSheet, type AyarBolumu } from './mobile/GelismisAyarlarSheet';
import { type BirimMaliyetKaynagi } from './mobile/unitPriceSource';
import { type RiskKaynagi } from './mobile/riskSource';

interface ProfitLevel {
  id: string;
  label: string;
  value: number;
  sortOrder: number;
  isDefault: boolean;
}

/**
 * Gelismis ayar varsayilanlari — TEK kaynak.
 *
 * Tum 11 alan `useState` baslangic degeri olarak buradan okunur. Mobil
 * yapragin "Sifirla" eylemi de buradan okur, ama yalnizca yapragin
 * GOSTERDIGI 8 alan icin (bkz. `GelismisAyarlarSheet` cagrisindaki
 * `onSifirla`) — daire-sayisi/arsa-payi (Task 5, A1 I4) yapraktan cikip
 * girdi kartina tasindigi icin BILEREK Sifirla'nin disinda. Ayri ayri
 * yazildiginda sessizce ayrisiyorlardi: Sifirla `riskLevel`i 0 yapiyordu
 * ama sayfanin baslangici 10'du.
 */
const AYAR_VARSAYILANLARI = {
  builderProfit: 1.30,
  riskLevel: 10,
  iksaMode: 'off' as const,
  iksaPercentage: 5,
  iksaManualTL: 0,
  manualMarketPrice: '',
  isApartmentCountEnabled: false,
  totalApartments: 24,
  ownerApartmentShare: 0,
  isAaEnabled: false,
  arsaAlani: 360,
};

interface ScenarioItem {
  id: string;
  name: string;
  luxLevel: number;
  apartmentSize: number;
  landShareRatio: number;
  totalApartments?: number | null;
  riskLevel: number;
  builderProfit: number;
  fdTotal: number;
  fdPerM2: number;
  mi: number;
  ma: number;
  totalCost: number;
  fa?: number | null;
  sdx?: number | null;
}

export default function Home() {
  const { data: session } = useSession();

  // State: Kullanım Girdileri
  const [luxLevel, setLuxLevel] = useState<number>(1.4); // Standart (1.0), Orta (1.2), Lüks (1.4)
  const [apartmentSize, setApartmentSize] = useState<number>(140);
  const [isApartmentCountEnabled, setIsApartmentCountEnabled] = useState<boolean>(AYAR_VARSAYILANLARI.isApartmentCountEnabled);
  const [totalApartments, setTotalApartments] = useState<number>(AYAR_VARSAYILANLARI.totalApartments);
  const [ownerApartmentShare, setOwnerApartmentShare] = useState<number>(AYAR_VARSAYILANLARI.ownerApartmentShare);
  const [landShareRatio, setLandShareRatio] = useState<number>(33); // %
  // Mobil `4a` ekrani acik mi. Gorunum durumu da `page.tsx`te yasar —
  // `HesaplaMobile` hicbir state sahiplenmez (plan mimari karari).
  const [mobilFisAcik, setMobilFisAcik] = useState<boolean>(false);
  // Analiz derinlestirme yapragi (maliyet dagilimi, hassasiyet, kirilma).
  // Task 6 tuketecek; burada yalnizca tanimlanir ve onAnalizAc tarafindan yazilir.
  const [mobilAnalizAcik, setMobilAnalizAcik] = useState<boolean>(false);
  // `4f` yapragi ve acilirken odaklanacagi bolum.
  const [mobilAyarlarAcik, setMobilAyarlarAcik] = useState(false);
  // `parsel` bolumu artik burada degil: parsel secimi `ParcelModal`a tasindi,
  // `AyarBolumu` birlesiminde de yok. Tip artik yaprakla ayni kaynaktan geliyor,
  // boylece yaprak yeni bir bolum kazanirsa/kaybederse burasi derlemede patlar.
  const [mobilAyarBolumu, setMobilAyarBolumu] = useState<AyarBolumu | undefined>(undefined);

  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [parcelContext, setParcelContext] = useState<ParcelPickerValue | null>(null);

  const effectiveLandShareRatio = computeEffectiveLandShareX({
    isApartmentCountEnabled,
    ownerApartmentShare,
    totalApartments,
    landShareRatio,
  }) * 100;


  const [riskLevel, setRiskLevel] = useState<number>(AYAR_VARSAYILANLARI.riskLevel); // 0, 5, 10, 15
  const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([
    { id: 'default-risk-0', label: 'Risksiz', value: 0, sortOrder: 0, isDefault: true },
    { id: 'default-risk-1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
    { id: 'default-risk-2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
    { id: 'default-risk-3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
  ]);
  const [riskKaynagi, setRiskKaynagi] = useState<RiskKaynagi>({ tur: 'varsayilan' });

  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia('not all and (max-width: 768px)');
    const update = () => setIsDesktopViewport(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const [builderProfit, setBuilderProfit] = useState<number>(AYAR_VARSAYILANLARI.builderProfit);
  const [profitLevels, setProfitLevels] = useState<ProfitLevel[]>([
    { id: 'default-1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
    { id: 'default-2', label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
    { id: 'default-3', label: 'Yüksek', value: 1.50, sortOrder: 2, isDefault: false },
  ]);
  const [manualMarketPrice, setManualMarketPrice] = useState<string>(AYAR_VARSAYILANLARI.manualMarketPrice);

  const [result, setResult] = useState<CalculationOutput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [summaryPage, setSummaryPage] = useState(0); // 0: Dağılım, 1: Analiz, 2: Finans
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<ScenarioItem[]>([]);

  // Arsa Alanı (Aa) toggle
  const [isAaEnabled, setIsAaEnabled] = useState<boolean>(AYAR_VARSAYILANLARI.isAaEnabled);
  const [arsaAlani, setArsaAlani] = useState<number>(AYAR_VARSAYILANLARI.arsaAlani);

  // İksa modü: 'off' | 'percentage' | 'manual'
  const [iksaMode, setIksaMode] = useState<'off' | 'percentage' | 'manual'>(AYAR_VARSAYILANLARI.iksaMode);
  const [iksaPercentage, setIksaPercentage] = useState<number>(AYAR_VARSAYILANLARI.iksaPercentage); // %
  const [iksaManualTL, setIksaManualTL] = useState<number>(AYAR_VARSAYILANLARI.iksaManualTL);

  const [, setGlobalExcavationLow] = useState<number>(0.01);
  const [, setGlobalExcavationMedium] = useState<number>(0.02);
  const [globalUnitPrice, setGlobalUnitPrice] = useState<number>(12000);
  // Birim maliyetin KAYNAGI
  const [birimMaliyetKaynagi, setBirimMaliyetKaynagi] = useState<BirimMaliyetKaynagi>({ tur: 'elle' });

  // Sayfa yüklendiğinde Admin'in belirlediği global ayarları çek
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.excavationLowPercent) setGlobalExcavationLow(data.excavationLowPercent);
        if (data.excavationMediumPercent) setGlobalExcavationMedium(data.excavationMediumPercent);
        if (data.defaultUnitPrice) setGlobalUnitPrice(data.defaultUnitPrice);
      })
      .catch(console.error);

    // Kâr katsayılarını API'den çek
    fetch('/api/settings/profit-levels')
      .then(res => res.json())
      .then((data: ProfitLevel[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setProfitLevels(data);
          const defaultLevel = data.find(l => l.isDefault);
          if (defaultLevel) setBuilderProfit(defaultLevel.value);
        }
      })
      .catch(console.error);

    // Risk seviyelerini API'den çek
    fetch('/api/settings/risk-levels')
      .then(res => res.json())
      .then((data: RiskLevel[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRiskLevels(data);
          const defaultLevel = data.find(l => l.isDefault);
          if (defaultLevel) setRiskLevel(defaultLevel.value);
        }
      })
      .catch(console.error);

  }, []);

  useEffect(() => {
    if (isApartmentCountEnabled) {
      const clamped = clampOwnerApartmentShare(ownerApartmentShare, totalApartments);
      if (clamped !== ownerApartmentShare) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- totalApartments azaltılınca ownerApartmentShare'i sınırlar
        setOwnerApartmentShare(clamped);
        return;
      }
    }

    const activeLandShare = computeEffectiveLandShareX({
      isApartmentCountEnabled,
      ownerApartmentShare,
      totalApartments,
      landShareRatio,
    });

    const input: CalculationInput = {
      x: activeLandShare,
      L: luxLevel,
      Ad: apartmentSize,
      P: globalUnitPrice,
      K: builderProfit,

      Sd: isApartmentCountEnabled ? totalApartments : undefined,
      Aa: isAaEnabled ? arsaAlani : undefined,

      isRiskEnabled: riskLevel > 0,
      R: riskLevel > 0 ? 1 + (riskLevel / 100) : 1,

      isExcavationEnabled: iksaMode !== 'off',
      excavationMode: iksaMode === 'manual' ? 'manual' : 'percentage',
      Z: iksaMode === 'percentage' ? (iksaPercentage / 100) : 0,
      MzOriginal: iksaMode === 'manual' ? iksaManualTL : 0,
    };

    const res = CalculatorEngineV2.calculate(input);
    setResult(res);
  }, [luxLevel, apartmentSize, totalApartments, ownerApartmentShare, landShareRatio, builderProfit, riskLevel, isApartmentCountEnabled, iksaMode, iksaPercentage, iksaManualTL, isAaEnabled, arsaAlani, globalUnitPrice]);


  const handleParcelConfirm = (payload: { parcelValue: ParcelPickerValue, risk: RiskMeasurement | null, suggestedRiskPercent: number | null }) => {
    setParcelContext(payload.parcelValue);
    if (payload.parcelValue.parcel?.areaSqm) {
      setIsAaEnabled(true);
      setArsaAlani(payload.parcelValue.parcel.areaSqm);
    }
    if (payload.suggestedRiskPercent !== null) {
      setRiskLevel(payload.suggestedRiskPercent);
      setRiskKaynagi({ tur: 'tkgm' });
    }
  };

  const handleRiskLevel = (v: number) => {
    setRiskLevel(v);
    setRiskKaynagi({ tur: 'elle' });
  };

  const handleSaveReport = async () => {
    if (!result) return;

    if (!session) {
      setShowAuthModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Söğütlü Arsa Analizi - ' + new Date().toLocaleDateString('tr-TR'),
          totalApartments: isApartmentCountEnabled ? totalApartments : 12,
          apartmentSizeSqm: apartmentSize,
          luxLevelModifier: luxLevel,
          landShareRatio: effectiveLandShareRatio / 100,
          minApartmentPrice: result.FD_total,
          landCost: result.FA || result.Ma // Eğer Toplam hesaplanıyorsa FA, yoksa tek arsa maliyeti
        })
      });
      if (response.ok) {
        toast.success('Rapor başarıyla kaydedildi ve teklife açıldı!', {
          position: 'top-right',
          style: { borderRadius: '12px', background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)' }
        });
      } else {
        toast.error('Kaydetme başarısız oldu.', { position: 'top-right' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Bir hata oluştu.', { position: 'top-right' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePdfDownload = async () => {
    if (!result) return;
    const { generatePdfReport } = await import('@/lib/pdf/report_generator') as { generatePdfReport: GeneratePdfFn };
    await generatePdfReport({
      luxLevel,
      apartmentSize,
      landShareRatio: effectiveLandShareRatio,
      totalApartments: isApartmentCountEnabled ? totalApartments : undefined,
      arsaAlani: isAaEnabled ? arsaAlani : undefined,
      riskLevel,
      builderProfit,
      iksaMode,
      iksaPercentage,
      iksaManualTL,
      marketPrice: parseMarketPrice(manualMarketPrice),
      result,
    });
  };

  const handleAddScenario = () => {
    if (!result) return;
    setSavedScenarios(prev => {
      if (prev.length >= 3) return prev;
      return [...prev, {
        id: Date.now().toString(),
        name: `Senaryo ${prev.length + 1}`,
        luxLevel,
        apartmentSize,
        landShareRatio: effectiveLandShareRatio / 100,
        totalApartments: isApartmentCountEnabled ? totalApartments : undefined,
        riskLevel: riskLevel > 0 ? 1 + riskLevel / 100 : 1,
        builderProfit,
        fdTotal: result.FD_total,
        fdPerM2: result.FD_per_m2,
        mi: result.Mi,
        ma: result.Ma,
        totalCost: result.M,
        fa: result.FA ?? undefined,
        sdx: result.Sdx ?? undefined,
      }];
    });
  };

  const handleRemoveScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  };



  const marketPriceNum = parseMarketPrice(manualMarketPrice);

  const actionsSection = (
    <>
      <div className={styles.actionBottomRow}>
        <Button variant="outline" onClick={handlePdfDownload} disabled={!result} className={styles.sealPrimaryBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          PDF İndir
        </Button>
        <Button variant="primary" onClick={handleSaveReport} disabled={isSaving} className={styles.sealPrimaryBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          {isSaving ? 'Kaydediliyor...' : 'Rapor Kaydet'}
        </Button>
        <Button
          variant="outline"
          onClick={handleAddScenario}
          disabled={!result || savedScenarios.length >= 3}
          title={savedScenarios.length >= 3 ? 'Maksimum 3 senaryo' : undefined}
          className={styles.compareBtn}
        >
          + Karşılaştır
        </Button>
      </div>
      {savedScenarios.length > 0 && (
        <div className={styles.scenarioPills}>
          {savedScenarios.map((s, i) => {
            const pillClass = [styles.pillBlue, styles.pillGreen, styles.pillOrange][i % 3];
            return (
              <span key={s.id} className={`${styles.scenarioPill} ${pillClass}`}>
                {s.name}
                <button
                  onClick={() => handleRemoveScenario(s.id)}
                  aria-label={`${s.name}'i kaldır`}
                  className={styles.scenarioPillRemove}
                  title={`${s.name}'i kaldır`}
                >×</button>
              </span>
            );
          })}
        </div>
      )}
      {savedScenarios.length >= 2 && (
        <div className={styles.compareSection}>
          <h3 className={styles.compareTitle}>
            Senaryo Karşılaştırması
          </h3>
          <ScenarioCompare
            scenarios={savedScenarios}
            onShareRequest={async (ids) => {
              const res = await fetch('/api/compare/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenarioIds: ids }),
              });
              if (!res.ok) return null;
              const { token } = await res.json();
              return `${window.location.origin}/compare/${token}`;
            }}
          />
        </div>
      )}
    </>
  );

  // Grafiklerin ortak girdisi TEK yerde. Onceden bu nesne masaustu JSX'inde
  // iki kez satir ici yaziliydi; mobil analiz sekmesi ucuncu bir kopya
  // olusturacakti. Kopyalar zamanla ayrisir — 2026-07-24'te grafiklerin
  // sabit `P: 10000` kullanmasi tam olarak bu sinifin hatasiydi.
  const chartBaseInput: CalculationInput = {
    x: effectiveLandShareRatio / 100,
    L: luxLevel,
    Ad: apartmentSize,
    P: globalUnitPrice,
    K: builderProfit,
    Sd: isApartmentCountEnabled ? totalApartments : undefined,
    Aa: isAaEnabled ? arsaAlani : undefined,
    isRiskEnabled: riskLevel > 0,
    R: riskLevel > 0 ? 1 + (riskLevel / 100) : 1,
    isExcavationEnabled: iksaMode !== 'off',
    excavationMode: iksaMode === 'manual' ? 'manual' : 'percentage',
    Z: iksaMode === 'percentage' ? (iksaPercentage / 100) : 0,
    MzOriginal: iksaMode === 'manual' ? iksaManualTL : 0,
  };

  /**
   * PLATFORMDAN BAGIMSIZ OVERLAY'LER — tek tanim, iki dalda da render edilir.
   *
   * Bu sayfa mobilde erken donup asagidaki masaustu agacini TAMAMEN atliyor.
   * Bir overlay yalnizca masaustu dalina konursa mobilde sessizce olur: buton
   * state'i set eder, o state'i okuyan hicbir JSX render edilmez, hata da
   * verilmez. `AuthModal` bu tuzagi bir kez yasadi; `ParcelModal` ayni tuzaga
   * yeniden dustu (mobilde "Haritadan parsel sec" hicbir sey yapmiyordu).
   *
   * Yeni bir modal/overlay eklenecekse YERI BURASI. Iki dala ayri ayri
   * eklenmemeli — bu blok tam olarak o hatayi imkansiz kilmak icin var.
   * Bekcisi: `page.test.tsx` her iki viewport'ta da modali aciyor.
   */
  const ortakKatmanlar = (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Rapor kaydetmek ve özel finansal modellemelerinize panelinizden ulaşabilmek için lütfen giriş yapın."
      />
      <ParcelModal
        key={isParcelModalOpen ? 'open' : 'closed'}
        isOpen={isParcelModalOpen}
        onClose={() => setIsParcelModalOpen(false)}
        onConfirm={handleParcelConfirm}
      />
    </>
  );

  // Viewport henuz olculmedi: SSR ve ilk client render'i BURAYA duser, ikisi de
  // ayni ciktiyi urettigi icin hydration uyusmazligi olusmaz. Yanlis arayuzu
  // basip sonra degistirmek yerine notr bir iskelet gosterilir.
  if (isDesktopViewport === null) {
    return <div className={styles.viewportIskelet} aria-busy="true" aria-live="polite" />;
  }

  // Mobil dal: yeni "Premium Liquid Glass" ekranina devreder (spec 2026-07-28).
  if (!isDesktopViewport) {
    return (
      <>
        <HesaplaMobile
          sonuc={{
            minDaireFiyati: sonucDegeri(result?.FD_total),
            arsaPayiYuzde: Math.round(effectiveLandShareRatio),
            birimFiyat: sonucDegeri(result?.FD_per_m2),
            karsilastirma: {
              piyasaFiyati: manualMarketPrice,
              onPiyasaFiyati: setManualMarketPrice,
              farkYuzde: piyasaFarkiYuzdesi(result?.FD_total, marketPriceNum),
            },
            onFisAc: () => setMobilFisAcik(true),
            onAnalizAc: () => setMobilAnalizAcik(true),
          }}
          fisAcik={mobilFisAcik}
          fiyatAciklamasi={{
            result,
            apartmentSize,
            unitPrice: globalUnitPrice,
            landSharePercent: Math.round(effectiveLandShareRatio),
            profitLabel: profitLevels.find(p => p.value === builderProfit)?.label ?? 'Özel',
            profitMultiplier: builderProfit,
            onKapat: () => setMobilFisAcik(false),
            onKarDegistir: () => { setMobilAyarBolumu('kar'); setMobilAyarlarAcik(true); },
          }}
          onAyarlarAc={() => { setMobilAyarBolumu(undefined); setMobilAyarlarAcik(true); }}
          analizAcik={mobilAnalizAcik}
          analiz={{
            result, baseInput: chartBaseInput, marketPrice: marketPriceNum,
            onKapat: () => setMobilAnalizAcik(false),
          }}
          onParselDogrulaAc={() => setIsParcelModalOpen(true)}
          girdi={{
            parcelContext,
            arsaAlani, onArsaAlani: setArsaAlani,
            isAaEnabled,
            riskLevel,
            riskLevels,
            onRiskLevel: handleRiskLevel,
            riskKaynagi,
            onParselDogrulaAc: () => setIsParcelModalOpen(true),
            luxLevel, onLuxLevel: setLuxLevel,
            apartmentSize, onApartmentSize: setApartmentSize,
            landShareRatio, onLandShareRatio: setLandShareRatio,
            isApartmentCountEnabled, onApartmentCountEnabled: setIsApartmentCountEnabled,
            totalApartments, onTotalApartments: setTotalApartments,
            ownerApartmentShare, onOwnerApartmentShare: setOwnerApartmentShare,
          }}
          ctaMetni={isSaving ? 'Kaydediliyor...' : 'Özet Rapor Oluştur'}
          ctaDevreDisi={isSaving}
          onCta={handleSaveReport}
        />

        <GelismisAyarlarSheet
          open={mobilAyarlarAcik}
          onClose={() => setMobilAyarlarAcik(false)}
          onUygula={() => setMobilAyarlarAcik(false)}
          onSifirla={() => {
            // Yapragin GOSTERDIGI her alan sifirlanir — ne fazlasi ne eksigi.
            // A1 I4 (Task 5): daire-sayisi/arsa-payi kontrolleri (Toplam
            // Daire Sayisi, Arsa Sahibine Dusen Daire) yapraktan cikarilip
            // yalnizca girdi kartina tasindi; bu yuzden BILEREK burada
            // sifirlanmiyorlar — sifirlanirsa "Ayarlari sifirla" yaprakta
            // gorunmeyen bir ekrani (girdi kartini) sessizce yeniden yazar,
            // tam da bu task'in kapattigi kusur.
            setBuilderProfit(AYAR_VARSAYILANLARI.builderProfit);
            setRiskLevel(AYAR_VARSAYILANLARI.riskLevel);
            setRiskKaynagi({ tur: 'varsayilan' });
            setIksaMode(AYAR_VARSAYILANLARI.iksaMode);
            setIksaPercentage(AYAR_VARSAYILANLARI.iksaPercentage);
            setIksaManualTL(AYAR_VARSAYILANLARI.iksaManualTL);
            setManualMarketPrice(AYAR_VARSAYILANLARI.manualMarketPrice);
            setIsAaEnabled(AYAR_VARSAYILANLARI.isAaEnabled);
            setArsaAlani(AYAR_VARSAYILANLARI.arsaAlani);
          }}
          acilisBolumu={mobilAyarBolumu}
          globalUnitPrice={globalUnitPrice}
          birimMaliyetKaynagi={birimMaliyetKaynagi}
          onBirimMaliyet={(v: number) => {
            setGlobalUnitPrice(v);
            setBirimMaliyetKaynagi({ tur: 'elle' });
          }}
          iksaMode={iksaMode} setIksaMode={setIksaMode}
          iksaPercentage={iksaPercentage} setIksaPercentage={setIksaPercentage}
          iksaManualTL={iksaManualTL} setIksaManualTL={setIksaManualTL}
          builderProfit={builderProfit} setBuilderProfit={setBuilderProfit}
          profitLevels={profitLevels}
          manualMarketPrice={manualMarketPrice} setManualMarketPrice={setManualMarketPrice}
        />

        {ortakKatmanlar}
      </>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.layout} id="formTop">
        {/* Left Sidebar (Main Form) */}
        <aside className={styles.leftSidebar}>

          {/* ===== DESKTOP SIDEBAR: Original full form (visible on web only) ===== */}
          <div className={styles.desktopSidebar}>
            <div className={styles.sidebarTitle}>Proje Bilgileri</div>

            <div className={styles.settingsGroup}>
              <h4>Daire Standardı</h4>
              <div className={styles.luxGrid}>
                {[
                  { label: 'Standart', value: 1.0, icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.84L17.5 12h-11L12 5.84z" /></svg> },
                  { label: 'Orta', value: 1.2, icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h6V5H9v12zm8 0h6v-8h-6v8zm-16 0h6v-6H1v6z" /></svg> },
                  { label: 'Lüks', value: 1.4, icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21h14V3H5v18zm2-14h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" /><circle cx="17.5" cy="5.5" r="3.5" fill="#4ade80" /><path d="M16 6l1 1 2-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
                ].map(opt => (
                  <div key={opt.label} className={`${styles.luxBox} ${luxLevel === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setLuxLevel(opt.value)}>
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.settingsGroup}>
              <h4>Ortalama Daire Metrekaresi</h4>
              <div className={styles.stepperInput}>
                <input type="number" value={apartmentSize} onChange={(e) => setApartmentSize(Number(e.target.value))} />
                <div className={styles.stepperRight}>
                  <span>m²</span>
                  <button onClick={() => setApartmentSize(p => Math.max(50, p - 5))}>−</button>
                  <button onClick={() => setApartmentSize(p => p + 5)}>+</button>
                </div>
              </div>
            </div>

            <div className={styles.settingsGroup}>
              <div className={styles.toggleRow}>
                <h4>Toplam Daire Sayısı</h4>
                <Toggle checked={isApartmentCountEnabled} onChange={(e) => setIsApartmentCountEnabled(e.target.checked)} />
              </div>
              {isApartmentCountEnabled && (
                <>
                  <div className={styles.stepperInput}>
                    <input type="number" value={totalApartments} onChange={(e) => setTotalApartments(Number(e.target.value))} />
                    <div className={styles.stepperRight}>
                      <span>daire</span>
                      <button onClick={() => setTotalApartments(p => Math.max(1, p - 1))}>−</button>
                      <button onClick={() => setTotalApartments(p => p + 1)}>+</button>
                    </div>
                  </div>
                  <RangeSlider
                    label="Arsa Sahibine Düşen Daire"
                    min={0}
                    max={totalApartments}
                    step={1}
                    value={ownerApartmentShare}
                    unit="daire"
                    onChange={(e) => setOwnerApartmentShare(Number(e.target.value))}
                  />
                </>
              )}
            </div>

            <div className={styles.settingsGroup}>
              <div className={styles.toggleRow}>
                <h4>Arsa Alanı (m²)</h4>
                <Toggle checked={isAaEnabled} onChange={(e) => setIsAaEnabled(e.target.checked)} />
              </div>
              <SmartContextCard
                parcelContext={parcelContext}
                onOpenMap={() => setIsParcelModalOpen(true)}
                arsaAlani={arsaAlani}
                onArsaAlani={setArsaAlani}
                riskLevel={riskLevel}
                riskLevels={riskLevels}
                onRiskLevel={handleRiskLevel}
                riskKaynagi={riskKaynagi}
                isAaEnabled={isAaEnabled}
              />
            </div>

            <div className={styles.settingsGroup}>
              <h4>Piyasa Analizi</h4>
              <BirimMaliyetField
                globalUnitPrice={globalUnitPrice}
                birimMaliyetKaynagi={birimMaliyetKaynagi}
                onBirimMaliyet={v => {
                  setGlobalUnitPrice(v);
                  setBirimMaliyetKaynagi({ tur: 'elle' });
                }}
              />
              <MarketField
                manualMarketPrice={manualMarketPrice}
                setManualMarketPrice={setManualMarketPrice}
              />
            </div>

            <div className={styles.settingsGroup}>
              <h4>Müteahhit Kazancı</h4>
              <div className={styles.luxGrid}>
                {profitLevels.map(opt => (
                  <div key={opt.id} className={`${styles.luxBox} ${builderProfit === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setBuilderProfit(opt.value)}>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.settingsGroup}>
              <h4>İksa Masrafı</h4>
              <div className={styles.luxGrid}>
                {[
                  { label: 'Yok', value: 'off' as const },
                  { label: 'Yüzde', value: 'percentage' as const },
                  { label: 'Elle', value: 'manual' as const },
                ].map(opt => (
                  <div key={opt.label} className={`${styles.luxBox} ${iksaMode === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setIksaMode(opt.value)}>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
              {iksaMode === 'percentage' && (
                <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
                  <input type="number" value={iksaPercentage} min={0} max={100} onChange={(e) => setIksaPercentage(Number(e.target.value))} />
                  <div className={styles.stepperRight}>
                    <span>%</span>
                  </div>
                </div>
              )}
              {iksaMode === 'manual' && (
                <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
                  <input type="number" value={iksaManualTL} min={0} onChange={(e) => setIksaManualTL(Number(e.target.value))} />
                  <div className={styles.stepperRight}>
                    <span>TL</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </aside>

        {/* Right Grid: Hesap Sonuçları + Hesap Özeti */}
        <section className={styles.rightGrid}>


          {/* Main Panel */}
          <main id="resultsPanel" className={`${styles.mainPanel} ${styles.swipeCard}`}>
            <h2 className={styles.mainPanelTitle}>Hesap Sonuçları <span className={`${styles.pill} ${styles.pillSmall}`}>Engine v2</span></h2>

            <HesapFisi result={result} />

            {/* Yapisal gruplama sarmalayicisi. `.mainPanelResults` sinifi
                KALDIRILDI: tek kurali Task 5'te silinen `data-revealed`
                kapisiydi, geriye hicbir CSS kurali olmayan bir sinif adi
                kalmisti. DOM derinligi bilerek korunuyor. */}
            <div>
            <div className={styles.statsRow}>
              {/* Arsa Fiyatı — sadece Sd açıkken görünür */}
              {isApartmentCountEnabled && (
                <div className={styles.statCard}>
                  <h5>Arsa Fiyatı (Arsa Sahibine)</h5>
                  <div className={styles.statCardValue}>
                    {result?.FA ? result.FA.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '—'}
                    <span>TL</span>
                  </div>
                  <div className={styles.statCardSub}>
                    <span>Daire Payı:</span>
                    <span><strong>{result?.Sdx != null ? Number(result.Sdx).toFixed(1) : '—'}</strong> daire</span>
                  </div>
                  {isAaEnabled && result?.FAbirim != null && (
                    <div className={`${styles.statCardSub} ${styles.statCardSubSpaced}`}>
                      <span>Arsa Birim:</span>
                      <span><strong>{result.FAbirim.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong> TL/m²</span>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.statCard}>
                <h5>Piyasa Değerine Göre</h5>
                <div className={styles.chartCenter}>
                  <PriceEvaluationChart
                    minPrice={result ? result.FD_total : 0}
                    marketPrice={marketPriceNum}
                  />
                </div>
              </div>
            </div>
            </div>

            <div className={styles.sliderArea}>
              <h4 className={styles.sliderHeader}>Arsa Payı</h4>
              {isApartmentCountEnabled ? (
                <div className={styles.sliderValueBox}>
                  %{Math.round(effectiveLandShareRatio)} ({ownerApartmentShare}/{totalApartments} daire)
                </div>
              ) : (
                <div className={styles.sliderContainer}>
                  <div className={styles.sliderTrackWrapper}>
                    <div className={styles.sliderTrack} style={{ '--share-pct': `${((landShareRatio - 10) / 90) * 100}%` } as React.CSSProperties}>
                      <div className={`${styles.sliderFill} ${styles.sliderFillDynamic}`}></div>
                      <div className={`${styles.sliderThumb} ${styles.sliderThumbDynamic}`}></div>
                      <input
                        type="range" min="10" max="100"
                        value={landShareRatio}
                        onChange={(e) => setLandShareRatio(Number(e.target.value))}
                        className={styles.sliderInput}
                      />
                      <div className={styles.sliderTicks}>
                        <span>10%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.sliderValueBox}>{landShareRatio}%</div>
                </div>
              )}
            </div>


            <div className={styles.desktopActionsSlot}>
              {actionsSection}
            </div>
          </main>

          {/* Hesap Özeti */}
          <aside className={`${styles.summaryPanel} ${styles.swipeCard}`}>
            <div className={styles.summaryPanelTitle}>
              Hesap Özeti
              <div className={styles.pagerDots}>
                {['Dağılım', 'Analiz', 'Finans'].map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setSummaryPage(i)}
                    title={label}
                    className={`${styles.pagerDot} ${summaryPage === i ? styles.pagerDotActive : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* Page Container with slide animation */}
            <div className={styles.pagerViewport}>
              <div
                className={styles.pagerTrack}
                style={{ '--pager-x': `-${summaryPage * 100}%` } as React.CSSProperties}
              >

                {/* Page 0: Maliyet Dağılımı */}
                <div className={styles.pagerPage}>
                  <CostBreakdownChart
                    constructionCost={result ? result.Mi_base + result.Mz : 0}
                    landValue={result ? result.Ma : 0}
                    profit={result ? (result.FD_total - result.M) : 0}
                    risk={result ? (result.Mi - result.Mi_base - result.Mz) : 0}
                  />
                </div>

                {/* Page 1: Hassasiyet + Kırılma Noktası */}
                <div className={styles.pagerPage}>
                  <div className={styles.chartBlock}>
                    <SensitivityChart baseInput={chartBaseInput} />
                  </div>
                  <div className={styles.chartDivider}>
                    <BreakEvenChart
                      baseInput={chartBaseInput}
                      marketPrice={marketPriceNum}
                    />
                  </div>
                </div>

                {/* Page 2: Finansal Modelleme */}
                <div className={styles.pagerPage}>
                  {result && (
                    <FinancialDashboard
                      totalInvestment={result.M}
                      totalRevenue={result.FD_total}
                    />
                  )}
                </div>

              </div>
            </div>

            {/* Page label */}
            <div className={styles.pagerLabel}>
              {summaryPage === 0 && '📊 Maliyet Dağılımı'}
              {summaryPage === 1 && '📈 Hassasiyet & Kırılma'}
              {summaryPage === 2 && '💰 Finansal Modelleme'}
            </div>
          </aside>

          <div className={styles.mobileActionsSlot}>
            {actionsSection}
          </div>
        </section>
      </div >

      <StickyActionBar aboveBottomNav>
        <button className={styles.stickyCta} onClick={handleSaveReport} disabled={isSaving}>
          {!isSaving && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
          {isSaving ? 'Kaydediliyor...' : 'Özet Rapor Oluştur'}
        </button>
      </StickyActionBar>

      {ortakKatmanlar}
    </div >
  );
}
