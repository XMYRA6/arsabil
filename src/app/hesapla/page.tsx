"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { CalculatorEngineV2, CalculationInput, CalculationOutput, type LandCostModel } from '@/lib/calculator/engine_v2';
import type { DistrictPriceEntry } from '@/components/LocationSelector';
import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice, ornekProjeIleDeneDoldur, ORNEK_APARTMENT_SIZE, mergeQualityLevels, DEFAULT_QUALITY_LEVELS, buildCalculationInput, type QualityTier } from './calculatorUiHelpers';
import { AuthModal } from '@/components/auth/AuthModal';
import { toast } from 'react-hot-toast';
// Dynamically imported to avoid SSR issues with @react-pdf/renderer
type GeneratePdfFn = typeof import('@/lib/pdf/report_generator').generatePdfReport;
import { ScenarioCompare, type Scenario as ScenarioItem } from '@/components/ScenarioCompare';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { BirimMaliyetField, RiskCostFields } from './AdvancedSettingsSections';

import type { RiskLevel } from './riskSuggestionHelpers';
import { HesaplaMobile } from './mobile/HesaplaMobile';
import { ParcelVerificationSheet } from '@/components/listing-wizard/ParcelVerificationSheet';
import { LocationHeader, AreaSection, RiskSection } from './SmartContextCardSections';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskMeasurement } from '@/lib/risk/types';
import { piyasaFarkiYuzdesi, sonucDegeri } from './mobile/hesaplaMobileProps';
import { GelismisAyarlarSheet, type AyarBolumu } from './mobile/GelismisAyarlarSheet';
import { SonucPaneli } from './masaustu/SonucPaneli';
import { HesapOzetiPaneli } from './masaustu/HesapOzetiPaneli';
import arazi from './masaustu/masaustu.module.css';
import { type BirimMaliyetKaynagi } from './mobile/unitPriceSource';
import { type RiskKaynagi } from './mobile/riskSource';
import { StudioPreview } from '@/components/studio/StudioPreview';
import { ProgramMixPanel } from '@/components/studio/ProgramMixPanel';
import { LandownerOfferPanel } from '@/components/studio/LandownerOfferPanel';
import { Studio2DPreview } from '@/components/studio/Studio2DPreview';
import { StudioLayoutControls } from '@/components/studio/StudioLayoutControls';
import { StudioScenarioBar } from '@/components/studio/StudioScenarioBar';
import { ScenarioComparison } from '@/components/studio/ScenarioComparison';
import type { OfferComposerValue } from '@/components/studio/OfferComposer';
import { createStudioMassingInput } from '@/lib/studio/calculatorAdapter';
import { createVerifiedParcelPolygon } from '@/lib/studio/parcelGeometry';
import { collectMassingWarnings, deriveBuildingMass } from '@/lib/studio/massing';
import { deriveProgramBands } from '@/lib/studio/programInventory';
import { createDefaultLayoutDraft } from '@/lib/studio/layoutDraft';
import {
  createDefaultScenarioDraft,
  cloneScenarioDraft,
} from '@/lib/studio/scenarioDraft';
import {
  createScenarioHistory,
  executeScenarioCommand,
  undoScenario,
  redoScenario,
  canUndo,
  canRedo,
  isScenarioDirty,
  getRecentHistoryEntries,
} from '@/lib/studio/scenarioHistory';
import { checkRequiresRebalance } from '@/lib/studio/scenarioImpact';
import {
  buildScenarioComparison,
  canCreateAlternative,
} from '@/lib/studio/scenarioComparison';
import {
  saveSessionDrafts,
  loadSessionDrafts,
  computeBaseSnapshotHash,
} from '@/lib/studio/sessionDraftStorage';
import { createStudioSnapshotFromScenarioDraft } from '@/lib/studio/snapshot';
import { computeSnapshotHash } from '@/lib/studio/snapshotVersioning';
import { buildStudioProposalViewModel } from '@/lib/studio/proposalViewModel';
import { generate2dSvgString, svgToDataUri } from '@/lib/studio/proposalAssets';
import { StudioSaveDialog } from '@/components/studio/StudioSaveDialog';
import { StudioScenarioLibrary } from '@/components/studio/StudioScenarioLibrary';
import { ShareProposalDialog } from '@/components/studio/ShareProposalDialog';
import type {
  StudioScenarioRecord,
  StudioScenarioVersionRecord,
} from '@/lib/studio/persistenceTypes';
import type {
  ProgramMixItem,
  ScenarioHistoryState,
  StudioLayoutDraft,
  StudioPolygon,
  StudioScenarioDraft,
  ValuationAssumptions,
} from '@/lib/studio/types';

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

const DEMO_STUDIO_POLYGON: StudioPolygon = {
  source: 'demo',
  points: [
    { x: -16, y: -10 },
    { x: 14, y: -12 },
    { x: 18, y: 8 },
    { x: -12, y: 12 },
  ],
};

export default function Home() {
  const { data: session } = useSession();

  // State: Kullanım Girdileri
  // Secim TIER (kimlik) olarak tutulur, ham katsayi olarak DEGIL — admin
  // panelinden katsayi degisse bile secim kaybolmamali (denetim bulgusu C3).
  const [luxTier, setLuxTier] = useState<QualityTier>('luks');
  const [qualityLevels, setQualityLevels] = useState(DEFAULT_QUALITY_LEVELS);
  const luxLevel = qualityLevels[luxTier]; // motorun `L` katsayisi — TURETILMIS
  const [apartmentSize, setApartmentSize] = useState<number | null>(null);
  const [isApartmentCountEnabled, setIsApartmentCountEnabled] = useState<boolean>(AYAR_VARSAYILANLARI.isApartmentCountEnabled);
  const [totalApartments, setTotalApartments] = useState<number>(AYAR_VARSAYILANLARI.totalApartments);
  const [ownerApartmentShare, setOwnerApartmentShare] = useState<number>(AYAR_VARSAYILANLARI.ownerApartmentShare);
  const [landShareRatio, setLandShareRatio] = useState<number>(33); // %
  // Mobil BIRLESIK Sonuc Detayi ekrani acik mi (Hesap Fisi + Analiz, 2
  // sekme arkasinda). Gorunum durumu da `page.tsx`te yasar — `HesaplaMobile`
  // hicbir state sahiplenmez (plan mimari karari).
  const [mobilSonucDetayiAcik, setMobilSonucDetayiAcik] = useState<boolean>(false);
  // Senaryo karsilastirma derinlestirme yapragi (Task 6/7'nin AnalizSekmesi'yle
  // AYNI desen). savedScenarios/handleAddScenario/handleRemoveScenario zaten
  // var — bu state yalnizca YAPRAGIN acik/kapali gorunumunu tutar.
  const [mobilKarsilastirmaAcik, setMobilKarsilastirmaAcik] = useState<boolean>(false);
  // Studio 3D onizleme derinlestirme yapragi — bilinen bosluk kapatildi:
  // oncesi Studio yalnizca masaustu dalinda kabloluydu (Faz1B QA bulgusu).
  // Ayni "tek derinlestirme yapragi" deseni (mobilSonucDetayiAcik ile ayni).
  const [mobilStudioAcik, setMobilStudioAcik] = useState<boolean>(false);
  // Program Dagilimi derinlestirme yapragi (Faz 2A Task 3) — ayni desen.
  const [mobilProgramMixAcik, setMobilProgramMixAcik] = useState<boolean>(false);
  // Arsa Sahibi Teklifi derinlestirme yapragi (Faz 2B Task 3) — ayni desen.
  const [mobilLandownerOfferAcik, setMobilLandownerOfferAcik] = useState<boolean>(false);
  // 2D Yerlesim Tahtasi derinlestirme yapragi (Faz 3A) — ayni desen.
  const [mobilStudio2DAcik, setMobilStudio2DAcik] = useState<boolean>(false);
  // Tasarim Studyosu hub menusu acik mi — 2026-08-23 IA sadelestirmesi.
  const [mobilStudioHubAcik, setMobilStudioHubAcik] = useState<boolean>(false);
  // `4f` yapragi ve acilirken odaklanacagi bolum.
  const [mobilAyarlarAcik, setMobilAyarlarAcik] = useState(false);
  // `parsel` bolumu artik burada degil: parsel secimi `ParcelModal`a tasindi,
  // `AyarBolumu` birlesiminde de yok. Tip artik yaprakla ayni kaynaktan geliyor,
  // boylece yaprak yeni bir bolum kazanirsa/kaybederse burasi derlemede patlar.
  const [mobilAyarBolumu, setMobilAyarBolumu] = useState<AyarBolumu | undefined>(undefined);

  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [parcelContext, setParcelContext] = useState<ParcelPickerValue | null>(null);
  const [landCostModel, setLandCostModel] = useState<LandCostModel>('proportional');
  const [districtPrice, setDistrictPrice] = useState<DistrictPriceEntry | null>(null);

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
  // Asenkron varsayilan-risk getirisi mount'tan SONRA cozuluyor; risk pilleri o
  // sirada zaten tiklanabilir. Guncel kaynagi bir ref'te tutmak, getiri
  // gecikirse kullanicinin (veya TKGM'nin) sectigi degeri ezmesini onler —
  // ezilseydi rozet "Elle girildi" derken deger kullanicinin secmedigi
  // varsayilan olurdu. Ref, bos bagimlilikli mount effect'inin bayat closure
  // degeri okumasini engellemek icin gerekli.
  const riskKaynagiRef = useRef<RiskKaynagi>(riskKaynagi);
  useEffect(() => { riskKaynagiRef.current = riskKaynagi; }, [riskKaynagi]);

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
    // "Zarar" — denetim taslağının §1/§13'te tanımladığı 4. kademe, K<1.0
    // (maliyetin altında satış). Kod tarafı hazır; canlı DB'ye admin
    // panelinden ("+ Yeni Seviye Ekle") eklenmesi gerekiyor çünkü tablo
    // zaten seed'lenmiş (denetim-2 bulgusu, kullanıcı onayıyla eklendi).
    { id: 'default-0', label: 'Zarar', value: 0.90, sortOrder: -1, isDefault: false },
    { id: 'default-1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
    { id: 'default-2', label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
    { id: 'default-3', label: 'Yüksek', value: 1.50, sortOrder: 2, isDefault: false },
  ]);
  const [manualMarketPrice, setManualMarketPrice] = useState<string>(AYAR_VARSAYILANLARI.manualMarketPrice);

  const [result, setResult] = useState<CalculationOutput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<ScenarioItem[]>([]);

  // Arsa Alanı (Aa) toggle
  const [isAaEnabled, setIsAaEnabled] = useState<boolean>(AYAR_VARSAYILANLARI.isAaEnabled);
  const [arsaAlani, setArsaAlani] = useState<number>(AYAR_VARSAYILANLARI.arsaAlani);

  const selectedDistrictLandPrice = districtPrice?.avgLandPricePerM2 ?? null;
  const canUseComparableLandCost = isAaEnabled && selectedDistrictLandPrice != null && selectedDistrictLandPrice > 0;
  const activeLandCostModel: LandCostModel = landCostModel === 'comparable' && canUseComparableLandCost ? 'comparable' : 'proportional';

  // İksa modü: 'off' | 'percentage' | 'manual'
  const [iksaMode, setIksaMode] = useState<'off' | 'percentage' | 'manual'>(AYAR_VARSAYILANLARI.iksaMode);
  const [iksaPercentage, setIksaPercentage] = useState<number>(AYAR_VARSAYILANLARI.iksaPercentage); // %
  const [iksaManualTL, setIksaManualTL] = useState<number>(AYAR_VARSAYILANLARI.iksaManualTL);

  const [globalUnitPrice, setGlobalUnitPrice] = useState<number | null>(null);
  // "Örnek Proje ile Dene" ile doldurulmus veri mi gosteriliyor. Kullanici
  // apartmentSize/globalUnitPrice alanlarindan birini eliyle degistirdiginde
  // otomatik false olur (bkz. handleApartmentSizeChange/handleGlobalUnitPriceChange).
  const [isDemoData, setIsDemoData] = useState<boolean>(false);
  // Birim maliyetin KAYNAGI
  const [birimMaliyetKaynagi, setBirimMaliyetKaynagi] = useState<BirimMaliyetKaynagi>({ tur: 'elle' });

  // Sayfa yüklendiğinde Admin'in belirlediği global ayarları çek
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.defaultUnitPrice) setGlobalUnitPrice(prev => prev ?? data.defaultUnitPrice);
        setQualityLevels(prev => mergeQualityLevels(prev, data));
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
          // Secenek listesi her zaman guncellenir; ama VARSAYILAN deger
          // yalnizca kullanici/TKGM henuz bir secim yapmadiysa uygulanir.
          const defaultLevel = data.find(l => l.isDefault);
          if (defaultLevel && riskKaynagiRef.current.tur === 'varsayilan') {
            setRiskLevel(defaultLevel.value);
          }
        }
      })
      .catch(console.error);

  }, []);

  useEffect(() => {
    const il = parcelContext?.parcel?.il;
    const ilce = parcelContext?.parcel?.ilce;
    if (!il || !ilce) {
      setDistrictPrice(null);
      setLandCostModel('proportional');
      return;
    }

    let cancelled = false;
    fetch('/api/district-prices?il=' + encodeURIComponent(il))
      .then(res => res.ok ? res.json() : [])
      .then((prices: DistrictPriceEntry[]) => {
        if (cancelled) return;
        const normalizedIlce = ilce.toLocaleLowerCase('tr-TR');
        const found = Array.isArray(prices)
          ? prices.find(p => p.ilce.toLocaleLowerCase('tr-TR') === normalizedIlce) ?? null
          : null;
        setDistrictPrice(found);
        if (!found?.avgLandPricePerM2) setLandCostModel('proportional');
      })
      .catch(() => {
        if (!cancelled) {
          setDistrictPrice(null);
          setLandCostModel('proportional');
        }
      });

    return () => { cancelled = true; };
  }, [parcelContext?.parcel?.il, parcelContext?.parcel?.ilce]);

  useEffect(() => {
    if (landCostModel === 'comparable' && !canUseComparableLandCost) {
      setLandCostModel('proportional');
    }
  }, [landCostModel, canUseComparableLandCost]);

  useEffect(() => {
    if (isApartmentCountEnabled) {
      const clamped = clampOwnerApartmentShare(ownerApartmentShare, totalApartments);
      if (clamped !== ownerApartmentShare) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- totalApartments azaltılınca ownerApartmentShare'i sınırlar
        setOwnerApartmentShare(clamped);
        return;
      }
    }

    if (apartmentSize === null || globalUnitPrice === null) {
      setResult(null);
      return;
    }

    const activeLandShare = computeEffectiveLandShareX({
      isApartmentCountEnabled,
      ownerApartmentShare,
      totalApartments,
      landShareRatio,
    });

    const input: CalculationInput = buildCalculationInput({
      x: activeLandShare,
      luxLevel,
      apartmentSize,
      globalUnitPrice,
      builderProfit,
      isApartmentCountEnabled,
      totalApartments,
      isAaEnabled,
      arsaAlani,
      riskLevel,
      iksaMode,
      iksaPercentage,
      iksaManualTL,
      Pmarket: parseMarketPrice(manualMarketPrice) || undefined,
      landCostModel: activeLandCostModel,
      districtLandPricePerM2: selectedDistrictLandPrice,
    });

    const res = CalculatorEngineV2.calculate(input);
    setResult(res);
  }, [luxLevel, apartmentSize, totalApartments, ownerApartmentShare, landShareRatio, builderProfit, riskLevel, isApartmentCountEnabled, iksaMode, iksaPercentage, iksaManualTL, isAaEnabled, arsaAlani, globalUnitPrice, manualMarketPrice, activeLandCostModel, selectedDistrictLandPrice]);


  const hasEnoughDataForResult = apartmentSize !== null && globalUnitPrice !== null;

  const handleApartmentSizeChange = (v: number | null) => {
    setApartmentSize(v);
    setIsDemoData(false);
  };

  const handleGlobalUnitPriceChange = (v: number) => {
    setGlobalUnitPrice(v);
    setBirimMaliyetKaynagi({ tur: 'elle' });
    setIsDemoData(false);
  };

  const handleOrnekProjeIleDene = () => {
    const dolu = ornekProjeIleDeneDoldur({ apartmentSize, globalUnitPrice });
    if (apartmentSize === null) setApartmentSize(dolu.apartmentSize);
    if (globalUnitPrice === null) {
      setGlobalUnitPrice(dolu.globalUnitPrice);
      setBirimMaliyetKaynagi({ tur: 'varsayilan' });
    }
    setIsDemoData(true);
  };

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
          // result dolu ise apartmentSize de doludur (hasEnoughDataForResult
          // geçidi ikisini birlikte garanti eder — bkz. useEffect).
          apartmentSizeSqm: apartmentSize as number,
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
      apartmentSize: apartmentSize as number, // result dolu ise apartmentSize de doludur
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
        apartmentSize: apartmentSize as number, // result dolu ise apartmentSize de doludur
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

  const handleShareScenarios = async (ids: string[]): Promise<string | null> => {
    // `fetch` ag hatasinda reject eder, `res.json()` bozuk govdede fırlatir;
    // ikisi de yakalanmazsa cagiran (`ScenarioCompare.handleShare`) hicbir
    // try/catch olmadan `await` ettigi icin "Paylaş" butonu
    // `setSharing(false)` hic calismadan surekli devre disi kalirdi.
    try {
      const res = await fetch('/api/compare/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioIds: ids }),
      });
      if (!res.ok) return null;
      const { token } = await res.json();
      return `${window.location.origin}/compare/${token}`;
    } catch {
      return null;
    }
  };

  const marketPriceNum = parseMarketPrice(manualMarketPrice);

  const actionsSection = (
    <>
      <div className={arazi.eylemSatir}>
        <button type="button" className={arazi.eylemBirincil} onClick={handleSaveReport} disabled={!result || isSaving}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
          {isSaving ? 'Kaydediliyor...' : 'Özet rapor oluştur'}
        </button>
        <button type="button" className={arazi.eylemIkincil} onClick={handlePdfDownload} disabled={!result}>PDF</button>
        <button type="button" className={arazi.eylemIkincil} onClick={() => handleOpenShareDialog()} disabled={!result}>Paylaş</button>
        <button type="button" className={arazi.eylemIkincil} onClick={() => handleOpenSaveDialog()} disabled={!result}>Kaydet</button>
        <button
          type="button"
          className={arazi.eylemIkincil}
          onClick={handleAddScenario}
          disabled={!result || savedScenarios.length >= 3}
          title={savedScenarios.length >= 3 ? 'Maksimum 3 senaryo' : undefined}
        >
          + Karşılaştır
        </button>
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
            onShareRequest={handleShareScenarios}
          />
        </div>
      )}
    </>
  );

  // Grafiklerin ortak girdisi TEK yerde. Onceden bu nesne masaustu JSX'inde
  // iki kez satir ici yaziliydi; mobil analiz sekmesi ucuncu bir kopya
  // olusturacakti. Kopyalar zamanla ayrisir — 2026-07-24'te grafiklerin
  // sabit `P: 10000` kullanmasi tam olarak bu sinifin hatasiydi.
  // Artik `input` (yukarida, sonuc hesabinda) ile AYNI `buildCalculationInput`
  // fonksiyonundan turuyor (denetim-2 bulgusu) — tek fark Pmarket'in burada
  // hic verilmemesi (grafikler piyasa fiyatini kendi ayri `marketPrice`
  // prop'uyla aliyor).
  const chartBaseInput: CalculationInput = buildCalculationInput({
    x: effectiveLandShareRatio / 100,
    luxLevel,
    apartmentSize,
    globalUnitPrice,
    builderProfit,
    isApartmentCountEnabled,
    totalApartments,
    isAaEnabled,
    arsaAlani,
    riskLevel,
    iksaMode,
    iksaPercentage,
    iksaManualTL,
    landCostModel: activeLandCostModel,
    districtLandPricePerM2: selectedDistrictLandPrice,
  });

  const verifiedStudioPolygon = parcelContext?.status === 'verified' && parcelContext.parcel
    ? createVerifiedParcelPolygon(parcelContext.parcel)
    : null;

  const studioMassingInput = createStudioMassingInput({
    calculationInput: {
      ...chartBaseInput,
      Aa: chartBaseInput.Aa ?? arsaAlani,
      Sd: chartBaseInput.Sd ?? totalApartments,
    },
    calculationOutput: result,
    parcelPolygon: result ? (verifiedStudioPolygon ?? DEMO_STUDIO_POLYGON) : undefined,
  });
  const studioBuildingMass = result ? deriveBuildingMass(studioMassingInput) : null;
  const studioWarnings = studioBuildingMass?.warnings ?? collectMassingWarnings(studioMassingInput);

  // Faz 2A Task 3: Program Dagilimi kalemleri. Masaustu+mobil AYNI state'i
  // paylasir (StudioPreview ile ayni desen) — iki ayri kopya YOK.
  const [programMixItems, setProgramMixItems] = useState<ProgramMixItem[]>([]);
  // Faz 2B Task 3: Arsa sahibi teklif senaryolari — degerleme varsayimi ve
  // ozel teklif de ayni desenle masaustu+mobil arasinda paylasilir.
  const [valuationAssumptions, setValuationAssumptions] = useState<ValuationAssumptions | null>(null);
  const [landownerCustomOverride, setLandownerCustomOverride] = useState<OfferComposerValue | null>(null);

  // Faz 3A: 2D yerlesim taslagi.
  const programBands = deriveProgramBands(programMixItems);
  const [layoutDraft, setLayoutDraft] = useState<StudioLayoutDraft | null>(null);
  const effectiveLayoutDraft = layoutDraft ?? (studioBuildingMass ? createDefaultLayoutDraft(programBands) : null);
  const layoutRequiresRecalculation = !!effectiveLayoutDraft && (
    effectiveLayoutDraft.footprint.scale !== 1 || (effectiveLayoutDraft.footprint.insetM ?? 0) !== 0
  );

  // Faz 3B: Senaryo Taslagi, Gecmis ve Karsilastirma
  const initialBaseScenario = useMemo(() => createDefaultScenarioDraft({
    id: 'scenario-1',
    name: 'Varsayılan Senaryo',
    baseSnapshotRef: {
      sourceId: result ? 'calc-active' : undefined,
      parcelAreaM2: studioMassingInput.parcelAreaM2,
      grossConstructionAreaM2: studioMassingInput.grossConstructionAreaM2,
      parcelGeometrySource: studioMassingInput.parcelPolygon?.source,
      hash: computeBaseSnapshotHash({
        parcelAreaM2: studioMassingInput.parcelAreaM2,
        grossConstructionAreaM2: studioMassingInput.grossConstructionAreaM2,
        parcelGeometrySource: studioMassingInput.parcelPolygon?.source,
      }),
    },
    programMix: programMixItems,
    layout: effectiveLayoutDraft,
    valuationAssumptions,
    customOffer: landownerCustomOverride,
  }), [result, studioMassingInput]);

  const [scenarios, setScenarios] = useState<StudioScenarioDraft[]>([initialBaseScenario]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario-1');
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioHistoryState>(() =>
    createScenarioHistory(initialBaseScenario)
  );
  const [showScenarioComparison, setShowScenarioComparison] = useState(false);
  const [mobilStudioScenarioAcik, setMobilStudioScenarioAcik] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showScenarioLibrary, setShowScenarioLibrary] = useState(false);
  const [savedScenarioId, setSavedScenarioId] = useState<string | null>(null);
  const [savedScenarioVersionNumber, setSavedScenarioVersionNumber] = useState<number | null>(null);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0] ?? initialBaseScenario;
  const isDirty = isScenarioDirty(scenarioHistory);
  const historyEntries = getRecentHistoryEntries(scenarioHistory, 15);
  const needsRebalance = checkRequiresRebalance(activeScenario, null);

  const activeScenarioSnapshot = useMemo(() => {
    return createStudioSnapshotFromScenarioDraft({
      scenarioDraft: activeScenario,
      massingInput: studioMassingInput,
      landShareRatio: effectiveLandShareRatio / 100,
      averageUnitAreaM2: apartmentSize ?? undefined,
    });
  }, [activeScenario, studioMassingInput, effectiveLandShareRatio, apartmentSize]);

  const handleOpenSaveDialog = useCallback(() => {
    if (!session?.user) {
      setShowAuthModal(true);
    } else {
      setShowSaveDialog(true);
    }
  }, [session]);

  const handleOpenLibrary = useCallback(() => {
    if (!session?.user) {
      setShowAuthModal(true);
    } else {
      setShowScenarioLibrary(true);
    }
  }, [session]);

  const handleSaveSuccess = useCallback((scenario: StudioScenarioRecord, version: StudioScenarioVersionRecord) => {
    setSavedScenarioId(scenario.id);
    setSavedScenarioVersionNumber(version.versionNumber);
  }, []);

  const handleLoadScenarioVersion = useCallback((scenario: StudioScenarioRecord, versionRecord: StudioScenarioVersionRecord) => {
    const snapshot = versionRecord.snapshot;
    const newDraft: StudioScenarioDraft = {
      id: `scenario-${Date.now()}`,
      name: scenario.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      baseSnapshotRef: {
        sourceId: scenario.id,
        parcelAreaM2: snapshot.massingInput.parcelAreaM2,
        grossConstructionAreaM2: snapshot.massingInput.grossConstructionAreaM2,
        parcelGeometrySource: snapshot.massingInput.parcelPolygon?.source,
        hash: computeBaseSnapshotHash({
          parcelAreaM2: snapshot.massingInput.parcelAreaM2,
          grossConstructionAreaM2: snapshot.massingInput.grossConstructionAreaM2,
          parcelGeometrySource: snapshot.massingInput.parcelPolygon?.source,
        }),
      },
      programMix: snapshot.programMix || [],
      layout: snapshot.layoutDraft || null,
      valuationAssumptions: snapshot.valuationAssumptions || null,
      customOffer: null,
    };

    setScenarios((prev) => [newDraft, ...prev.filter((s) => s.id !== newDraft.id).slice(0, 2)]);
    setActiveScenarioId(newDraft.id);
    setScenarioHistory(createScenarioHistory(newDraft));
    setProgramMixItems(newDraft.programMix);
    setLayoutDraft(newDraft.layout);
    setValuationAssumptions(newDraft.valuationAssumptions);
    setLandownerCustomOverride(newDraft.customOffer);
    setSavedScenarioId(scenario.id);
    setSavedScenarioVersionNumber(versionRecord.versionNumber);
  }, []);

  const [showShareDialog, setShowShareDialog] = useState(false);

  const activeProposalViewModel = useMemo(() => {
    const scenarioRec: StudioScenarioRecord = {
      id: savedScenarioId || activeScenario.id,
      userId: session?.user?.id || 'anonymous',
      name: activeScenario.name,
      description: null,
      parcelIdentity: studioMassingInput.parcelPolygon?.parcelIdentity ?? null,
      baseInputHash: activeScenario.baseSnapshotRef.hash || '',
      parcelSourceStatus: (studioMassingInput.parcelPolygon?.source || 'unavailable') as any,
      currentVersionNumber: savedScenarioVersionNumber || 1,
      isArchived: false,
      createdAt: activeScenario.createdAt,
      updatedAt: activeScenario.updatedAt,
    };

    const versionRec: StudioScenarioVersionRecord = {
      id: savedScenarioId ? `ver-${savedScenarioVersionNumber}` : 'draft-v1',
      scenarioId: savedScenarioId || activeScenario.id,
      versionNumber: savedScenarioVersionNumber || 1,
      snapshot: activeScenarioSnapshot,
      snapshotHash: computeSnapshotHash(activeScenarioSnapshot),
      schemaVersion: 1,
      summaryNotes: null,
      needsRebalance,
      warningCount: studioWarnings.length,
      createdAt: activeScenario.updatedAt,
    };

    return buildStudioProposalViewModel(scenarioRec, versionRec);
  }, [
    activeScenario,
    savedScenarioId,
    savedScenarioVersionNumber,
    activeScenarioSnapshot,
    needsRebalance,
    studioWarnings,
    studioMassingInput,
    session,
  ]);

  const handleOpenShareDialog = useCallback(() => {
    if (!session?.user) {
      setShowAuthModal(true);
    } else if (!savedScenarioId) {
      setShowSaveDialog(true);
    } else {
      setShowShareDialog(true);
    }
  }, [session, savedScenarioId]);

  const handleDownloadStudioPdf = useCallback(async () => {
    const { downloadStudioProposalPdf } = await import('@/lib/pdf/studioProposalPdfGenerator');
    const svgString = generate2dSvgString({
      parcelPolygon: studioBuildingMass?.footprint ?? null,
      width: 600,
      height: 360,
    });
    const svgUri = svgToDataUri(svgString);
    await downloadStudioProposalPdf(activeProposalViewModel, svgUri);
  }, [studioBuildingMass, activeProposalViewModel]);

  const scenarioComparisonResult = useMemo(() => {
    return buildScenarioComparison(
      scenarios,
      studioMassingInput,
      effectiveLandShareRatio / 100,
      apartmentSize ?? undefined
    );
  }, [scenarios, studioMassingInput, effectiveLandShareRatio, apartmentSize]);

  // Session storage sync
  useEffect(() => {
    const currentBaseHash = computeBaseSnapshotHash({
      parcelAreaM2: studioMassingInput.parcelAreaM2,
      grossConstructionAreaM2: studioMassingInput.grossConstructionAreaM2,
      parcelGeometrySource: studioMassingInput.parcelPolygon?.source,
    });
    const loaded = loadSessionDrafts({ currentBaseHash });
    if (loaded && loaded.scenarios.length > 0) {
      setScenarios(loaded.scenarios);
      setActiveScenarioId(loaded.activeScenarioId);
      const active = loaded.scenarios.find((s) => s.id === loaded.activeScenarioId) ?? loaded.scenarios[0];
      setScenarioHistory(createScenarioHistory(active));
      setProgramMixItems(active.programMix);
      setLayoutDraft(active.layout);
      setValuationAssumptions(active.valuationAssumptions);
      setLandownerCustomOverride(active.customOffer);
    }
  }, []);

  useEffect(() => {
    if (scenarios.length > 0) {
      const baseHash = computeBaseSnapshotHash({
        parcelAreaM2: studioMassingInput.parcelAreaM2,
        grossConstructionAreaM2: studioMassingInput.grossConstructionAreaM2,
        parcelGeometrySource: studioMassingInput.parcelPolygon?.source,
      });
      saveSessionDrafts({
        scenarios,
        activeScenarioId,
        baseHash,
      });
    }
  }, [scenarios, activeScenarioId, studioMassingInput]);

  const handleProgramMixChange = useCallback((items: ProgramMixItem[]) => {
    setProgramMixItems(items);
    setScenarioHistory((prev) => {
      const nextHist = executeScenarioCommand(
        prev,
        { type: 'SET_PROGRAM_MIX', payload: { items } },
        'Program dağılımı güncellendi'
      );
      setScenarios((scs) =>
        scs.map((s) => (s.id === activeScenarioId ? nextHist.present : s))
      );
      return nextHist;
    });
  }, [activeScenarioId]);

  const handleLayoutDraftChange = useCallback((layout: StudioLayoutDraft) => {
    setLayoutDraft(layout);
    setScenarioHistory((prev) => {
      const nextHist = executeScenarioCommand(
        prev,
        { type: 'SET_LAYOUT', payload: { layout } },
        '2D Yerleşim güncellendi'
      );
      setScenarios((scs) =>
        scs.map((s) => (s.id === activeScenarioId ? nextHist.present : s))
      );
      return nextHist;
    });
  }, [activeScenarioId]);

  const handleValuationAssumptionsChange = useCallback((assumptions: ValuationAssumptions | null) => {
    setValuationAssumptions(assumptions);
    setScenarioHistory((prev) => {
      const nextHist = executeScenarioCommand(
        prev,
        { type: 'SET_VALUATION_ASSUMPTIONS', payload: { assumptions } },
        'Değerleme varsayımı güncellendi'
      );
      setScenarios((scs) =>
        scs.map((s) => (s.id === activeScenarioId ? nextHist.present : s))
      );
      return nextHist;
    });
  }, [activeScenarioId]);

  const handleCustomOverrideChange = useCallback((override: OfferComposerValue | null) => {
    setLandownerCustomOverride(override);
    setScenarioHistory((prev) => {
      const nextHist = executeScenarioCommand(
        prev,
        { type: 'SET_CUSTOM_OFFER', payload: { customOffer: override } },
        'Özel teklif güncellendi'
      );
      setScenarios((scs) =>
        scs.map((s) => (s.id === activeScenarioId ? nextHist.present : s))
      );
      return nextHist;
    });
  }, [activeScenarioId]);

  const handleScenarioNameChange = useCallback((name: string) => {
    setScenarioHistory((prev) => {
      const nextHist = executeScenarioCommand(
        prev,
        { type: 'SET_SCENARIO_NAME', payload: { name } },
        'Senaryo adı değiştirildi'
      );
      setScenarios((scs) =>
        scs.map((s) => (s.id === activeScenarioId ? nextHist.present : s))
      );
      return nextHist;
    });
  }, [activeScenarioId]);

  const handleUndo = useCallback(() => {
    setScenarioHistory((prev) => {
      const nextHist = undoScenario(prev);
      const restored = nextHist.present;
      setProgramMixItems(restored.programMix);
      setLayoutDraft(restored.layout);
      setValuationAssumptions(restored.valuationAssumptions);
      setLandownerCustomOverride(restored.customOffer);
      setScenarios((scs) =>
        scs.map((s) => (s.id === activeScenarioId ? restored : s))
      );
      return nextHist;
    });
  }, [activeScenarioId]);

  const handleRedo = useCallback(() => {
    setScenarioHistory((prev) => {
      const nextHist = redoScenario(prev);
      const restored = nextHist.present;
      setProgramMixItems(restored.programMix);
      setLayoutDraft(restored.layout);
      setValuationAssumptions(restored.valuationAssumptions);
      setLandownerCustomOverride(restored.customOffer);
      setScenarios((scs) =>
        scs.map((s) => (s.id === activeScenarioId ? restored : s))
      );
      return nextHist;
    });
  }, [activeScenarioId]);

  const handleAddAlternative = useCallback(() => {
    if (!canCreateAlternative(scenarios)) return;
    const newId = `scenario-${Date.now()}`;
    const newName = `Alternatif ${scenarios.length}`;
    const newDraft = cloneScenarioDraft(activeScenario, newId, newName);
    setScenarios((prev) => [...prev, newDraft]);
    setActiveScenarioId(newId);
    setScenarioHistory(createScenarioHistory(newDraft));
    setProgramMixItems(newDraft.programMix);
    setLayoutDraft(newDraft.layout);
    setValuationAssumptions(newDraft.valuationAssumptions);
    setLandownerCustomOverride(newDraft.customOffer);
  }, [scenarios, activeScenario]);

  const handleSelectScenario = useCallback((scenarioId: string) => {
    const target = scenarios.find((s) => s.id === scenarioId);
    if (!target) return;
    setActiveScenarioId(scenarioId);
    setScenarioHistory(createScenarioHistory(target));
    setProgramMixItems(target.programMix);
    setLayoutDraft(target.layout);
    setValuationAssumptions(target.valuationAssumptions);
    setLandownerCustomOverride(target.customOffer);
  }, [scenarios]);

  const handleDeleteScenario = useCallback((scenarioId: string) => {
    if (scenarios.length <= 1) return;
    const remaining = scenarios.filter((s) => s.id !== scenarioId);
    setScenarios(remaining);
    if (activeScenarioId === scenarioId) {
      const nextActive = remaining[0];
      setActiveScenarioId(nextActive.id);
      setScenarioHistory(createScenarioHistory(nextActive));
      setProgramMixItems(nextActive.programMix);
      setLayoutDraft(nextActive.layout);
      setValuationAssumptions(nextActive.valuationAssumptions);
      setLandownerCustomOverride(nextActive.customOffer);
    }
  }, [scenarios, activeScenarioId]);


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
      <ParcelVerificationSheet
        key={isParcelModalOpen ? 'open' : 'closed'}
        isOpen={isParcelModalOpen}
        onClose={() => setIsParcelModalOpen(false)}
        onConfirm={handleParcelConfirm}
      />
      <StudioSaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        currentSnapshot={activeScenarioSnapshot}
        scenarioName={activeScenario.name}
        savedScenarioId={savedScenarioId}
        savedScenarioVersionNumber={savedScenarioVersionNumber}
        onSaveSuccess={handleSaveSuccess}
      />
      <StudioScenarioLibrary
        isOpen={showScenarioLibrary}
        onClose={() => setShowScenarioLibrary(false)}
        currentScenarioId={savedScenarioId}
        onLoadScenarioVersion={handleLoadScenarioVersion}
      />
      <ShareProposalDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        scenarioId={savedScenarioId}
        versionNumber={savedScenarioVersionNumber}
        scenarioName={activeScenario.name}
        viewModel={activeProposalViewModel}
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
            maksPayOrani: result?.x_max ?? null,
            // Toplam daire yalnızca "Daire sayısıyla belirle" açıkken bilinir
            // (motor Sd'yi aksi halde null döndürür); tahmin uydurmuyoruz.
            daireSayisi: isApartmentCountEnabled ? totalApartments : null,
            piyasaFiyati: marketPriceNum > 0 ? marketPriceNum : null,
            farkYuzde: piyasaFarkiYuzdesi(result?.FD_total, marketPriceNum),
            hasEnoughDataForResult,
            isDemoData,
            onOrnekProjeIleDene: handleOrnekProjeIleDene,
          }}
          result={result}
          yapiKutlesi={{
            katSayisi: studioBuildingMass?.floorCount ?? null,
            daireSayisi: isApartmentCountEnabled ? totalApartments : null,
            parselDogrulandi: !!verifiedStudioPolygon,
          }}
          onSonucDetayiAc={() => setMobilSonucDetayiAcik(true)}
          onTeklifAc={() => setMobilLandownerOfferAcik(true)}
          onPiyasaEkle={() => { setMobilAyarBolumu('piyasa'); setMobilAyarlarAcik(true); }}
          onAyarlarAc={() => { setMobilAyarBolumu(undefined); setMobilAyarlarAcik(true); }}
          sonucDetayiAcik={mobilSonucDetayiAcik}
          sonucDetayi={{
            fiyatAciklamasi: {
              result,
              apartmentSize,
              unitPrice: globalUnitPrice,
              landSharePercent: Math.round(effectiveLandShareRatio),
              profitLabel: profitLevels.find(p => p.value === builderProfit)?.label ?? 'Özel',
              profitMultiplier: builderProfit,
              onKarDegistir: () => { setMobilAyarBolumu('kar'); setMobilAyarlarAcik(true); },
            },
            analiz: { result, baseInput: chartBaseInput, marketPrice: marketPriceNum },
            onKapat: () => setMobilSonucDetayiAcik(false),
          }}
          studioAcik={mobilStudioAcik}
          studio={{
            mass: studioBuildingMass,
            warnings: studioWarnings,
            geometrySource: verifiedStudioPolygon ? 'TKGM doğrulanmış parsel sınırı' : result ? 'Demo parsel sınırı' : 'Parsel geometrisi bekleniyor',
            geometryStatus: verifiedStudioPolygon ? 'verified' : result ? 'demo' : 'missing',
            constructionAreaSource: studioMassingInput.grossConstructionAreaSource === 'authoritative'
              ? 'Otoriter inşaat alanı verisi'
              : 'Daire adedi x ortalama daire m² varsayımı (tahmini)',
            constructionAreaEstimated: studioMassingInput.grossConstructionAreaSource !== 'authoritative',
            programMixItems,
            programBands,
            layoutDraft: effectiveLayoutDraft,
            onKapat: () => setMobilStudioAcik(false),
          }}
          studioHubAcik={mobilStudioHubAcik}
          onStudioHubKapat={() => setMobilStudioHubAcik(false)}
          onYerlesimAc={() => setMobilStudio2DAcik(true)}
          onProgramAc={() => setMobilProgramMixAcik(true)}
          on3DAc={() => setMobilStudioAcik(true)}
          onSenaryolarAc={() => setMobilStudioScenarioAcik(true)}
          programMixAcik={mobilProgramMixAcik}
          programMix={{
            items: programMixItems,
            onItemsChange: handleProgramMixChange,
            availableAreaM2: studioBuildingMass?.grossConstructionAreaM2 ?? null,
            hasGeometry: !!studioBuildingMass,
            layoutRequiresRecalculation,
            onKapat: () => setMobilProgramMixAcik(false),
          }}
          landownerOfferAcik={mobilLandownerOfferAcik}
          landownerOffer={{
            shareRatio: effectiveLandShareRatio / 100,
            totalUnitCount: totalApartments,
            valuationAssumptions,
            onValuationAssumptionsChange: handleValuationAssumptionsChange,
            averageUnitAreaM2: apartmentSize ?? undefined,
            customOverride: landownerCustomOverride,
            onCustomOverrideChange: handleCustomOverrideChange,
            programMixItems,
            onKapat: () => setMobilLandownerOfferAcik(false),
          }}
          studio2DAcik={mobilStudio2DAcik}
          studio2D={{
            parcelPolygon: studioBuildingMass?.footprint ?? null,
            mass: studioBuildingMass,
            layoutDraft: effectiveLayoutDraft,
            programBands,
            onLayoutDraftChange: handleLayoutDraftChange,
            onParcelEkleClick: () => setIsParcelModalOpen(true),
            onKapat: () => setMobilStudio2DAcik(false),
          }}
          studioScenarioAcik={mobilStudioScenarioAcik}
          studioScenario={{
            activeScenario,
            allScenarios: scenarios,
            canUndo: canUndo(scenarioHistory),
            canRedo: canRedo(scenarioHistory),
            isDirty,
            needsRebalance,
            historyEntries,
            comparisonRows: scenarioComparisonResult.rows,
            canAddMore: scenarioComparisonResult.canAddMore,
            onUndo: handleUndo,
            onRedo: handleRedo,
            onNameChange: handleScenarioNameChange,
            onAddAlternative: handleAddAlternative,
            onSelectScenario: handleSelectScenario,
            onDeleteScenario: handleDeleteScenario,
            onSaveClick: handleOpenSaveDialog,
            onLibraryClick: handleOpenLibrary,
            onShareClick: handleOpenShareDialog,
            onPdfClick: handleDownloadStudioPdf,
            savedScenarioId,
            savedScenarioVersionNumber,
            onRebalanceClick: () => {
              setMobilLandownerOfferAcik(true);
              setMobilStudioScenarioAcik(false);
            },
            onKapat: () => setMobilStudioScenarioAcik(false),
          }}
          onParselDogrulaAc={() => setIsParcelModalOpen(true)}
          girdi={{
            parcelContext,
            arsaAlani, onArsaAlani: setArsaAlani,
            isAaEnabled,
            onIsAaEnabled: setIsAaEnabled,
            riskLevel,
            riskLevels,
            onRiskLevel: handleRiskLevel,
            riskKaynagi,
            onParselDogrulaAc: () => setIsParcelModalOpen(true),
            luxTier, onLuxTier: setLuxTier,
            apartmentSize, onApartmentSize: handleApartmentSizeChange,
            globalUnitPrice, birimMaliyetKaynagi, onBirimMaliyet: handleGlobalUnitPriceChange,
            landShareRatio, onLandShareRatio: setLandShareRatio,
            isApartmentCountEnabled, onApartmentCountEnabled: setIsApartmentCountEnabled,
            totalApartments, onTotalApartments: setTotalApartments,
            ownerApartmentShare, onOwnerApartmentShare: setOwnerApartmentShare,
          }}
          ctaMetni={isSaving ? 'Kaydediliyor...' : 'Özet Rapor Oluştur'}
          ctaDevreDisi={!result || isSaving}
          onCta={handleSaveReport}
          savedScenarios={savedScenarios}
          onAddScenario={handleAddScenario}
          onRemoveScenario={handleRemoveScenario}
          hasResult={!!result}
          karsilastirmaAcik={mobilKarsilastirmaAcik}
          onKarsilastirmaAc={() => setMobilKarsilastirmaAcik(true)}
          onKarsilastirmaKapat={() => setMobilKarsilastirmaAcik(false)}
          onShareRequest={handleShareScenarios}
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
            //
            // TKGM konsolidasyonu (2026-08-04) ayni durumu arsa alani ucun de
            // yaratti: `isAaEnabled`/`arsaAlani` da yapraktan cikip
            // `SmartContextCard`a tasindi, dolayisiyla onlar da BILEREK burada
            // sifirlanmiyor.
            setBuilderProfit(AYAR_VARSAYILANLARI.builderProfit);
            setRiskLevel(AYAR_VARSAYILANLARI.riskLevel);
            setRiskKaynagi({ tur: 'varsayilan' });
            setIksaMode(AYAR_VARSAYILANLARI.iksaMode);
            setIksaPercentage(AYAR_VARSAYILANLARI.iksaPercentage);
            setIksaManualTL(AYAR_VARSAYILANLARI.iksaManualTL);
            setManualMarketPrice(AYAR_VARSAYILANLARI.manualMarketPrice);
          }}
          acilisBolumu={mobilAyarBolumu}
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
      <header className={styles.pageHead}>
        <div>
          <p className={styles.pageKicker}>Kat karşılığı fizibilite</p>
          <h1 className={styles.pageTitle}>Arsa payını ve minimum daire fiyatını hesapla</h1>
          <p className={styles.pageSub}>Girdilerini düzenle, sonuç anında güncellensin. Sayılar deterministik motordan gelir.</p>
        </div>
        <div className={styles.pageActions}>
          <Button variant="secondary" onClick={() => window.location.assign('/hesapla')}>+ Yeni hesaplama</Button>
        </div>
      </header>
      <div className={styles.layout} id="formTop">
        {/* Left Sidebar (Main Form) */}
        <aside className={styles.leftSidebar}>

          {/* ===== DESKTOP SIDEBAR: Original full form (visible on web only) ===== */}
          <div className={styles.desktopSidebar}>
            <div className={styles.sidebarTitle}>Proje Bilgileri</div>

            <div className={styles.settingsGroup}>
              <LocationHeader parcelContext={parcelContext} onOpenMap={() => setIsParcelModalOpen(true)} />
            </div>

            <div className={styles.settingsGroup}>
              <AreaSection
                parcelContext={parcelContext}
                arsaAlani={arsaAlani}
                onArsaAlani={setArsaAlani}
                isAaEnabled={isAaEnabled}
                onIsAaEnabled={setIsAaEnabled}
              />
            </div>

            <div className={styles.settingsGroup}>
              <h4>Arsa Maliyeti Modeli</h4>
              <div className={styles.luxGrid} style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <button
                  type="button"
                  className={`${styles.luxBox} ${activeLandCostModel === 'proportional' ? styles.luxBoxActive : ''}`}
                  onClick={() => setLandCostModel('proportional')}
                >
                  <span>Oransal</span>
                </button>
                <button
                  type="button"
                  className={`${styles.luxBox} ${activeLandCostModel === 'comparable' ? styles.luxBoxActive : ''}`}
                  disabled={!canUseComparableLandCost}
                  title={canUseComparableLandCost ? `${selectedDistrictLandPrice!.toLocaleString('tr-TR')} TL/m² arsa emsali` : 'Emsal için haritadan parsel seçin ve ilçe arsa m² fiyatı tanımlı olsun'}
                  onClick={() => setLandCostModel('comparable')}
                >
                  <span>Emsal</span>
                </button>
              </div>
              <p className={styles.sliderValueBox}>
                {canUseComparableLandCost
                  ? `İlçe arsa emsali: ${selectedDistrictLandPrice!.toLocaleString('tr-TR')} TL/m²`
                  : 'Emsal model için doğrulanmış arsa alanı ve ilçe arsa m² fiyatı gerekir.'}
              </p>
            </div>

            <div className={styles.settingsGroup}>
              <h4>Daire Standardı</h4>
              <div className={styles.luxGrid}>
                {[
                  { tier: 'standart' as const, label: 'Standart', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.84L17.5 12h-11L12 5.84z" /></svg> },
                  { tier: 'orta' as const, label: 'Orta', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h6V5H9v12zm8 0h6v-8h-6v8zm-16 0h6v-6H1v6z" /></svg> },
                  { tier: 'luks' as const, label: 'Lüks', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21h14V3H5v18zm2-14h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" /><circle cx="17.5" cy="5.5" r="3.5" fill="#4ade80" /><path d="M16 6l1 1 2-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
                ].map(opt => (
                  <div key={opt.label} className={`${styles.luxBox} ${luxTier === opt.tier ? styles.luxBoxActive : ''}`} onClick={() => setLuxTier(opt.tier)}>
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.settingsGroup}>
              <h4>Ortalama Daire Metrekaresi</h4>
              <div className={styles.stepperInput}>
                <input type="number" value={apartmentSize ?? ''} onChange={(e) => handleApartmentSizeChange(e.target.value === '' ? null : Number(e.target.value))} />
                <div className={styles.stepperRight}>
                  <span>m²</span>
                  <button onClick={() => { if (apartmentSize !== null) handleApartmentSizeChange(Math.max(50, apartmentSize - 5)); }}>−</button>
                  <button onClick={() => handleApartmentSizeChange(apartmentSize === null ? ORNEK_APARTMENT_SIZE : apartmentSize + 5)}>+</button>
                </div>
              </div>
            </div>

            <div className={styles.settingsGroup}>
              <BirimMaliyetField globalUnitPrice={globalUnitPrice} birimMaliyetKaynagi={birimMaliyetKaynagi} onBirimMaliyet={handleGlobalUnitPriceChange} />
            </div>

            <div className={styles.settingsGroup}>
              <div className={styles.toggleRow}>
                <h4>Arsa Payı</h4>
                <Toggle checked={isApartmentCountEnabled} onChange={(e) => setIsApartmentCountEnabled(e.target.checked)} />
              </div>
              {isApartmentCountEnabled ? (
                <>
                  <div className={styles.stepperInput}>
                    <input type="number" value={totalApartments} onChange={(e) => setTotalApartments(Number(e.target.value))} />
                    <div className={styles.stepperRight}>
                      <span>daire</span>
                      <button onClick={() => setTotalApartments(p => Math.max(1, p - 1))}>−</button>
                      <button onClick={() => setTotalApartments(p => p + 1)}>+</button>
                    </div>
                  </div>
                  <RangeSlider label="Arsa Sahibine Düşen Daire" aria-label="Arsa Sahibine Düşen Daire" min={0} max={Math.max(totalApartments - 1, 0)} step={1} value={ownerApartmentShare} unit="daire" onChange={(e) => setOwnerApartmentShare(Number(e.target.value))} />
                  <p className={styles.sliderValueBox}>Arsa payı %{Math.round(effectiveLandShareRatio)} olarak hesaplanıyor.</p>
                </>
              ) : (
                <div className={styles.sliderContainer}>
                  <div className={styles.sliderTrackWrapper}>
                    <div className={styles.sliderTrack} style={{ '--share-pct': `${((landShareRatio - 10) / 90) * 100}%` } as React.CSSProperties}>
                      <div className={`${styles.sliderFill} ${styles.sliderFillDynamic}`}></div>
                      <div className={`${styles.sliderThumb} ${styles.sliderThumbDynamic}`}></div>
                      {/* Ust sinir 100 — musteri bilerek %100'e kadar
                          cikabilmesini istedi (daire-sayisi modundaki N-1
                          kelepcesi burada UYGULANMIYOR). x=1'e yaklasinca
                          engine_v2.ts maliyeti matematiksel olarak
                          buyutuyor (M=Mi/(1-x)) — bu YANLIS degil, arsa
                          sahibinin projenin neredeyse tamamini aldigi
                          senaryonun dogru sonucu; kullaniciya asagidaki
                          uyari metniyle acikca anlatiliyor (denetim-2
                          bulgusu, cozum: kelepce yerine seffaflik). */}
                      <input type="range" min="10" max="100" value={landShareRatio} onChange={(e) => setLandShareRatio(Number(e.target.value))} className={styles.sliderInput} aria-label="Arsa payı yüzdesi" />
                      <div className={styles.sliderTicks}><span>10%</span><span>100%</span></div>
                    </div>
                  </div>
                  <div className={styles.sliderValueBox}>{landShareRatio}%</div>
                  {landShareRatio >= 90 && (
                    <p className={styles.landShareHighWarning}>
                      Bu kadar yüksek bir arsa payında proje maliyeti matematiksel olarak çok yükselir — arsa sahibi projenin neredeyse tamamını alıyor demektir.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className={styles.settingsGroup}>
              <RiskSection riskLevel={riskLevel} riskLevels={riskLevels} onRiskLevel={handleRiskLevel} riskKaynagi={riskKaynagi} />
            </div>
          </div>

        </aside>

        {/* Right Grid: Hesap Sonuçları + Hesap Özeti */}
        <section className={styles.rightGrid}>


          <div id="resultsPanel" className={arazi.sonucKolonu}>
            <SonucPaneli
              result={result}
              hasEnoughDataForResult={hasEnoughDataForResult}
              isDemoData={isDemoData}
              isApartmentCountEnabled={isApartmentCountEnabled}
              isAaEnabled={isAaEnabled}
              riskLevel={riskLevel}
              marketPriceNum={marketPriceNum}
              manualMarketPrice={manualMarketPrice}
              onManualMarketPrice={setManualMarketPrice}
              onOrnekProjeIleDene={handleOrnekProjeIleDene}
            />
            {actionsSection}
            <HesapOzetiPaneli
              result={result}
              hasEnoughDataForResult={hasEnoughDataForResult}
              chartBaseInput={chartBaseInput}
              marketPriceNum={marketPriceNum}
            />
          </div>

          <div className={styles.advancedPanel}>
            <div className={styles.advancedPanelTitle}>Gelişmiş Ayarlar</div>
            <div className={styles.advancedPanelCols}>
              {/* Yaklaşık Piyasa Fiyatı artık burada değil — "Piyasa
                  Değerine Göre" kartının kendi bos-durumundan (tikla ->
                  yaz -> Enter) giriliyor (2026-08-14 UX kararı). Alan
                  mobil `GelismisAyarlarSheet`de hâlâ kullanılıyor,
                  `MarketField` bilesenin kendisi SILINMEDI. */}
              <RiskCostFields
                iksaMode={iksaMode}
                setIksaMode={setIksaMode}
                iksaPercentage={iksaPercentage}
                setIksaPercentage={setIksaPercentage}
                iksaManualTL={iksaManualTL}
                setIksaManualTL={setIksaManualTL}
                builderProfit={builderProfit}
                setBuilderProfit={setBuilderProfit}
                profitLevels={profitLevels}
              />
            </div>
          </div>

        </section>
      </div >

      <section className={styles.studio} aria-labelledby="studio-baslik">
        <p className={styles.pageKicker}>Stüdyo</p>
        <h2 id="studio-baslik" className={styles.studioTitle}>Senaryolar, kütle ve program</h2>
        <div className={styles.studioGrid}>
          <div className={styles.studioBar}>
            <StudioScenarioBar
              activeScenario={activeScenario}
              allScenarios={scenarios}
              canUndo={canUndo(scenarioHistory)}
              canRedo={canRedo(scenarioHistory)}
              isDirty={isDirty}
              needsRebalance={needsRebalance}
              historyEntries={historyEntries}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onNameChange={handleScenarioNameChange}
              onAddAlternative={handleAddAlternative}
              onCompareClick={() => setShowScenarioComparison((prev) => !prev)}
              onSelectScenario={handleSelectScenario}
              onSaveClick={handleOpenSaveDialog}
              onLibraryClick={handleOpenLibrary}
              onShareClick={handleOpenShareDialog}
              onPdfClick={handleDownloadStudioPdf}
              savedScenarioId={savedScenarioId}
              savedScenarioVersionNumber={savedScenarioVersionNumber}
              onRebalanceClick={() => {
                const el = document.getElementById('landowner-offer-panel-container');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>

          {showScenarioComparison && (
            <div className={styles.studioWide}>
              <ScenarioComparison
                rows={scenarioComparisonResult.rows}
                activeScenarioId={activeScenario.id}
                canAddMore={scenarioComparisonResult.canAddMore}
                onSelectScenario={handleSelectScenario}
                onDeleteScenario={handleDeleteScenario}
                onClose={() => setShowScenarioComparison(false)}
              />
            </div>
          )}

          <div className={styles.studioMain}>
            <StudioPreview
              mass={studioBuildingMass}
              warnings={studioWarnings}
              geometrySource={verifiedStudioPolygon ? 'TKGM doğrulanmış parsel sınırı' : result ? 'Demo parsel sınırı' : 'Parsel geometrisi bekleniyor'}
              geometryStatus={verifiedStudioPolygon ? 'verified' : result ? 'demo' : 'missing'}
              constructionAreaSource={studioMassingInput.grossConstructionAreaSource === 'authoritative'
                ? 'Otoriter inşaat alanı verisi'
                : 'Daire adedi x ortalama daire m² varsayımı (tahmini)'}
              constructionAreaEstimated={studioMassingInput.grossConstructionAreaSource !== 'authoritative'}
              programMixItems={programMixItems}
              programBands={programBands}
              layoutDraft={effectiveLayoutDraft}
            />
          </div>

          <div className={styles.studioSide}>
            <ProgramMixPanel
              items={programMixItems}
              onItemsChange={handleProgramMixChange}
              availableAreaM2={studioBuildingMass?.grossConstructionAreaM2 ?? null}
              hasGeometry={!!studioBuildingMass}
              layoutRequiresRecalculation={layoutRequiresRecalculation}
            />
          </div>

          <div className={styles.studioHalf}>
            <Studio2DPreview
              parcelPolygon={studioBuildingMass?.footprint ?? null}
              mass={studioBuildingMass}
              layoutDraft={effectiveLayoutDraft}
              programBands={programBands}
              onParcelEkleClick={() => setIsParcelModalOpen(true)}
            />
          </div>

          {studioBuildingMass && effectiveLayoutDraft && (
            <div className={styles.studioHalf}>
              <StudioLayoutControls
                layoutDraft={effectiveLayoutDraft}
                onLayoutDraftChange={handleLayoutDraftChange}
                mass={studioBuildingMass}
              />
            </div>
          )}

          <div className={styles.studioWide} id="landowner-offer-panel-container">
            <LandownerOfferPanel
              shareRatio={effectiveLandShareRatio / 100}
              totalUnitCount={totalApartments}
              valuationAssumptions={valuationAssumptions}
              onValuationAssumptionsChange={handleValuationAssumptionsChange}
              averageUnitAreaM2={apartmentSize ?? undefined}
              customOverride={landownerCustomOverride}
              onCustomOverrideChange={handleCustomOverrideChange}
              programMixItems={programMixItems}
            />
          </div>

        </div>
      </section>

      <StickyActionBar aboveBottomNav>
        <button className={styles.stickyCta} onClick={handleSaveReport} disabled={!result || isSaving}>
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






