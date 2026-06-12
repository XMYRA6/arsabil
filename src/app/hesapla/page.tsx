"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { CalculatorEngineV2, CalculationInput, CalculationOutput } from '@/lib/calculator/engine_v2';
import { PriceEvaluationChart } from '@/components/charts/PriceEvaluationChart';
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart';
import { SensitivityChart } from '@/components/charts/SensitivityChart';
import { BreakEvenChart } from '@/components/charts/BreakEvenChart';
import { FinancialDashboard } from '@/components/FinancialDashboard';
import { AuthModal } from '@/components/auth/AuthModal';
import { toast } from 'react-hot-toast';
import { generatePdfReport } from '@/lib/pdf/report_generator';
import { ScenarioCompare } from '@/components/ScenarioCompare';
import { LocationSelector, DistrictPriceEntry } from '@/components/LocationSelector';

const PILL_COLORS = [
  { bg: 'rgba(var(--primary-rgb),0.1)', border: 'var(--primary)', text: 'var(--primary)' },
  { bg: 'rgba(47,191,113,0.1)', border: 'var(--green)', text: 'var(--green)' },
  { bg: 'rgba(251,146,60,0.1)', border: '#fb923c', text: '#fb923c' },
] as const;

interface ProfitLevel {
  id: string;
  label: string;
  value: number;
  sortOrder: number;
  isDefault: boolean;
}

interface RiskLevel {
  id: string;
  label: string;
  value: number;
  sortOrder: number;
  isDefault: boolean;
}

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
  const [isApartmentCountEnabled, setIsApartmentCountEnabled] = useState<boolean>(true);
  const [totalApartments, setTotalApartments] = useState<number>(24);
  const [ownerApartmentCount, setOwnerApartmentCount] = useState<number>(8);
  const [landShareRatio, setLandShareRatio] = useState<number>(33); // %


  const [riskLevel, setRiskLevel] = useState<number>(10); // 0, 5, 10, 15
  const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([
    { id: 'default-risk-0', label: 'Risksiz', value: 0, sortOrder: 0, isDefault: true },
    { id: 'default-risk-1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
    { id: 'default-risk-2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
    { id: 'default-risk-3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
  ]);
  const [builderProfit, setBuilderProfit] = useState<number>(1.30);
  const [profitLevels, setProfitLevels] = useState<ProfitLevel[]>([
    { id: 'default-1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
    { id: 'default-2', label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
    { id: 'default-3', label: 'Yüksek', value: 1.50, sortOrder: 2, isDefault: false },
  ]);
  const [manualMarketPrice, setManualMarketPrice] = useState<string>("7.500.000");

  const [result, setResult] = useState<CalculationOutput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [summaryPage, setSummaryPage] = useState(0); // 0: Dağılım, 1: Analiz, 2: Finans
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<ScenarioItem[]>([]);
  const [selectedIl, setSelectedIl] = useState<string>('');
  const [selectedIlce, setSelectedIlce] = useState<string>('');
  const [districtPrices, setDistrictPrices] = useState<DistrictPriceEntry[]>([]);
  const [originalUnitPrice, setOriginalUnitPrice] = useState<number | null>(null);

  // Arsa Alanı (Aa) toggle
  const [isAaEnabled, setIsAaEnabled] = useState<boolean>(false);
  const [arsaAlani, setArsaAlani] = useState<number>(360);

  // İksa modü: 'off' | 'percentage' | 'manual'
  const [iksaMode, setIksaMode] = useState<'off' | 'percentage' | 'manual'>('off');
  const [iksaPercentage, setIksaPercentage] = useState<number>(5); // %
  const [iksaManualTL, setIksaManualTL] = useState<number>(0);

  const [, setGlobalExcavationLow] = useState<number>(0.01);
  const [, setGlobalExcavationMedium] = useState<number>(0.02);
  const [globalUnitPrice, setGlobalUnitPrice] = useState<number>(12000);

  // Swipe Carousel Tracking (Mobile iOS PageControl)
  const [, setActiveCardIndex] = useState(0);
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el || typeof window === 'undefined' || window.innerWidth > 768) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveCardIndex(index);
  };

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

    fetch('/api/district-prices')
      .then(res => res.json())
      .then((data: DistrictPriceEntry[]) => {
        if (Array.isArray(data)) setDistrictPrices(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const activeLandShare = isApartmentCountEnabled
      ? (totalApartments > 0 ? ownerApartmentCount / totalApartments : landShareRatio / 100)
      : landShareRatio / 100;

    if (isApartmentCountEnabled) {
      setLandShareRatio(Math.round(activeLandShare * 100));
    } else {
      setOwnerApartmentCount(Math.round(totalApartments * activeLandShare));
    }

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
  }, [luxLevel, apartmentSize, totalApartments, ownerApartmentCount, landShareRatio, builderProfit, riskLevel, isApartmentCountEnabled, iksaMode, iksaPercentage, iksaManualTL, isAaEnabled, arsaAlani, globalUnitPrice]);

  useEffect(() => {
    if (!selectedIlce) return;
    const entry = districtPrices.find(
      d => d.il === selectedIl && d.ilce === selectedIlce
    );
    if (!entry) return;
    const market = Math.round(entry.avgSalesPricePerM2 * apartmentSize);
    setManualMarketPrice(market.toLocaleString('tr-TR', { maximumFractionDigits: 0 }));
  }, [apartmentSize, selectedIl, selectedIlce, districtPrices]);

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
          landShareRatio: landShareRatio / 100,
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

  const handlePdfDownload = () => {
    if (!result) return;
    generatePdfReport({
      luxLevel,
      apartmentSize,
      landShareRatio,
      totalApartments: isApartmentCountEnabled ? totalApartments : undefined,
      arsaAlani: isAaEnabled ? arsaAlani : undefined,
      riskLevel,
      builderProfit,
      iksaMode,
      iksaPercentage,
      iksaManualTL,
      marketPrice: parseInt(manualMarketPrice.replace(/\D/g, '') || '0'),
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
        landShareRatio: landShareRatio / 100,
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

  const handleIlChange = (il: string) => {
    setSelectedIl(il);
    setSelectedIlce('');
    if (originalUnitPrice !== null) {
      setGlobalUnitPrice(originalUnitPrice);
      setOriginalUnitPrice(null);
    }
  };

  const handleIlceChange = (ilce: string) => {
    setSelectedIlce(ilce);
    const entry = districtPrices.find(d => d.il === selectedIl && d.ilce === ilce);
    if (!entry) return;
    if (originalUnitPrice === null) setOriginalUnitPrice(globalUnitPrice);
    setGlobalUnitPrice(entry.avgUnitConstructionPrice);
    const market = Math.round(entry.avgSalesPricePerM2 * apartmentSize);
    setManualMarketPrice(market.toLocaleString('tr-TR', { maximumFractionDigits: 0 }));
  };

  const handleClearLocation = () => {
    setSelectedIl('');
    setSelectedIlce('');
    if (originalUnitPrice !== null) {
      setGlobalUnitPrice(originalUnitPrice);
      setOriginalUnitPrice(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout} id="formTop" onScroll={handleMobileScroll}>
        {/* Left Sidebar (Main Form) */}
        <aside className={styles.leftSidebar}>

          {/* ===== DESKTOP SIDEBAR: Original full form (visible on web only) ===== */}
          <div className={styles.desktopSidebar}>
            <div className={styles.sidebarTitle}>Proje Bilgileri <span style={{ cursor: 'pointer' }} onClick={() => setIsSettingsSidebarOpen(true)}>⚙</span></div>

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
                <div className={styles.stepperInput}>
                  <input type="number" value={totalApartments} onChange={(e) => setTotalApartments(Number(e.target.value))} />
                  <div className={styles.stepperRight}>
                    <span>daire</span>
                    <button onClick={() => setTotalApartments(p => Math.max(1, p - 1))}>−</button>
                    <button onClick={() => setTotalApartments(p => p + 1)}>+</button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.settingsGroup}>
              <div className={styles.toggleRow}>
                <h4>Arsa Alanı (m²)</h4>
                <Toggle checked={isAaEnabled} onChange={(e) => setIsAaEnabled(e.target.checked)} />
              </div>
              {isAaEnabled && (
                <div className={styles.stepperInput}>
                  <input type="number" value={arsaAlani} onChange={(e) => setArsaAlani(Number(e.target.value))} />
                  <div className={styles.stepperRight}>
                    <span>m²</span>
                    <button onClick={() => setArsaAlani(p => Math.max(10, p - 10))}>−</button>
                    <button onClick={() => setArsaAlani(p => p + 10)}>+</button>
                  </div>
                </div>
              )}
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
                <div className={styles.stepperInput} style={{ height: '48px' }}>
                  <input type="number" value={iksaPercentage} min={0} max={100} onChange={(e) => setIksaPercentage(Number(e.target.value))} />
                  <div className={styles.stepperRight}>
                    <span>%</span>
                  </div>
                </div>
              )}
              {iksaMode === 'manual' && (
                <div className={styles.stepperInput} style={{ height: '48px' }}>
                  <input type="number" value={iksaManualTL} min={0} onChange={(e) => setIksaManualTL(Number(e.target.value))} />
                  <div className={styles.stepperRight}>
                    <span>TL</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.settingsGroup}>
              <h4>Risk Payı</h4>
              <div className={styles.luxGrid} style={{ gridTemplateColumns: `repeat(${riskLevels.length}, 1fr)` }}>
                {riskLevels.map(opt => (
                  <div key={opt.id} className={`${styles.luxBox} ${riskLevel === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setRiskLevel(opt.value)}>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
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
          </div>

          {/* ===== MOBILE SIDEBAR: Simplified card layout (visible on mobile only) ===== */}
          <div className={styles.mobileSidebar}>
            <div className={styles.swipeCard} style={{ paddingBottom: '16px' }}>

            {/* Top Result Card */}
            <div className={styles.topResultCard}>
              <div className={styles.topResultLabel}>MİNİMUM DAİRE FİYATI</div>
              <div className={styles.topResultValue}>
                {result?.FD_total ? `${Math.round(result.FD_total).toLocaleString('tr-TR')} TL` : '---'}
              </div>
              {parseInt(manualMarketPrice.replace(/\D/g, '') || '0') > 0 && result?.FD_total && parseInt(manualMarketPrice.replace(/\D/g, '') || '0') > result.FD_total ? (
                <div className={styles.topResultBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                  Piyasaya Göre: %{Math.round(((parseInt(manualMarketPrice.replace(/\D/g, '') || '0') - result.FD_total) / parseInt(manualMarketPrice.replace(/\D/g, '') || '0')) * 100)} DAHA UCUZ
                </div>
              ) : null}
            </div>

            <div className={styles.unifiedGlassPanel}>
              <div className={styles.settingsGroup}>
                <h4>Yapı Standardı</h4>
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
                <h4>Daire Metrekaresi</h4>
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
                <div className={styles.toggleRow} style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
                  <h4>Arsa Payı</h4>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem' }}>%{landShareRatio}</span>
                </div>
                <RangeSlider
                  min={1}
                  max={100}
                  step={1}
                  value={landShareRatio}
                  onChange={(e) => {
                    setLandShareRatio(Number(e.target.value));
                    setIsApartmentCountEnabled(false);
                  }}
                />
              </div>
            </div>

            <button className={styles.digerAyarlarBtn} onClick={() => setIsSettingsSidebarOpen(true)}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
               Diğer Ayarlar
            </button>

            <button className={styles.primaryActionBtn} onClick={handleSaveReport} disabled={isSaving}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              {isSaving ? 'Kaydediliyor...' : 'Özet Rapor Oluştur'}
            </button>

            </div>
          </div>

        </aside>

        {/* Drawer Overlay for Advanced Settings */}
        <div className={`${styles.settingsDrawerOverlay} ${isSettingsSidebarOpen ? styles.open : ''}`} onClick={() => setIsSettingsSidebarOpen(false)}>
          <div className={`${styles.settingsDrawer} ${isSettingsSidebarOpen ? styles.open : ''}`} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Gelişmiş Ayarlar
              </h3>
              <button className={styles.closeDrawerBtn} onClick={() => setIsSettingsSidebarOpen(false)}>×</button>
            </div>
            <div className={styles.drawerContent}>

              <div className={styles.drawerCard}>
                <div className={styles.drawerCardHeader}>Formül Parametreleri</div>
                
                <div className={`${styles.drawerRow} ${styles.column}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div className={styles.drawerRowLabel} style={{ whiteSpace: 'nowrap' }}>Toplam Daire Sayısı</div>
                    <div style={{ marginLeft: 'auto', display: 'flex' }}>
                      <Toggle checked={isApartmentCountEnabled} onChange={(e) => setIsApartmentCountEnabled(e.target.checked)} />
                    </div>
                  </div>
                  {isApartmentCountEnabled && (
                    <div className={styles.stepperInput} style={{ width: '100%' }}>
                      <input type="number" value={totalApartments} onChange={(e) => setTotalApartments(Number(e.target.value))} />
                      <div className={styles.stepperRight}>
                        <span>daire</span>
                        <button onClick={() => setTotalApartments(p => Math.max(1, p - 1))}>−</button>
                        <button onClick={() => setTotalApartments(p => p + 1)}>+</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`${styles.drawerRow} ${styles.column}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div className={styles.drawerRowLabel} style={{ whiteSpace: 'nowrap' }}>Arsa Alanı (m²)</div>
                    <div style={{ marginLeft: 'auto', display: 'flex' }}>
                      <Toggle checked={isAaEnabled} onChange={(e) => setIsAaEnabled(e.target.checked)} />
                    </div>
                  </div>
                  {isAaEnabled && (
                    <div className={styles.stepperInput} style={{ width: '100%' }}>
                      <input type="number" value={arsaAlani} onChange={(e) => setArsaAlani(Number(e.target.value))} />
                      <div className={styles.stepperRight}>
                        <span>m²</span>
                        <button onClick={() => setArsaAlani(p => Math.max(10, p - 10))}>−</button>
                        <button onClick={() => setArsaAlani(p => p + 10)}>+</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.drawerCard}>
                <div className={styles.drawerCardHeader}>Proje Maliyet ve Riskleri</div>
                
                <div className={`${styles.drawerRow} ${styles.column}`}>
                  <div className={styles.drawerRowLabel}>İksa Masrafı</div>
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
                    <div className={styles.stepperInput} style={{ height: '48px' }}>
                      <input type="number" value={iksaPercentage} min={0} max={100} onChange={(e) => setIksaPercentage(Number(e.target.value))} />
                      <div className={styles.stepperRight}>
                        <span style={{ minWidth: '48px', justifyContent: 'center' }}>%</span>
                      </div>
                    </div>
                  )}
                  {iksaMode === 'manual' && (
                    <div className={styles.stepperInput} style={{ height: '48px' }}>
                      <input type="number" value={iksaManualTL} min={0} onChange={(e) => setIksaManualTL(Number(e.target.value))} />
                      <div className={styles.stepperRight}>
                        <span style={{ minWidth: '48px', justifyContent: 'center' }}>TL</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`${styles.drawerRow} ${styles.column}`}>
                  <div className={styles.drawerRowLabel}>Risk Payı</div>
                  <div className={styles.luxGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {riskLevels.map(opt => (
                      <div key={opt.id} className={`${styles.luxBox} ${riskLevel === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setRiskLevel(opt.value)}>
                        <span>{opt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${styles.drawerRow} ${styles.column}`}>
                  <div className={styles.drawerRowLabel}>Müteahhit Kazancı</div>
                  <div className={styles.luxGrid}>
                    {profitLevels.map(opt => (
                      <div key={opt.id} className={`${styles.luxBox} ${builderProfit === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setBuilderProfit(opt.value)}>
                        <span>{opt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.drawerCard}>
                <div className={styles.drawerCardHeader}>Piyasa Analizi</div>
                <div className={`${styles.drawerRow} ${styles.column}`}>
                  <div className={styles.drawerRowLabel}>Yaklaşık Piyasa Fiyatı</div>
                  <div className={styles.stepperInput}>
                    <input type="text" value={manualMarketPrice} onChange={(e) => setManualMarketPrice(e.target.value)} />
                    <div className={styles.stepperRight}>
                      <span style={{ minWidth: '56px', justifyContent: 'center' }}>TL</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>


        {/* Right Grid: Hesap Sonuçları + Hesap Özeti */}
        <section className={styles.rightGrid}>

          {/* Main Panel */}
          <main id="resultsPanel" className={`${styles.mainPanel} ${styles.swipeCard}`}>
            <h2 className={styles.mainPanelTitle}>Hesap Sonuçları <span className={styles.pill} style={{ fontSize: '12px', fontWeight: 900 }}>Engine v2</span></h2>

            <div className={styles.blueBox}>
              <div className={styles.blueBoxTop}>
                <h2>{result ? result.FD_total.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '0'}<span>TL</span></h2>
                <span>📐 {result ? result.FD_per_m2.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '0'} TL / m²</span>
              </div>
              <div className={styles.blueBoxBottom}>
                <div className={styles.blueCircle}></div>
                <strong>{result ? result.FD_per_m2.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '0'} TL / m²</strong>
              </div>
            </div>

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
                    <div className={styles.statCardSub} style={{ marginTop: '6px' }}>
                      <span>Arsa Birim:</span>
                      <span><strong>{result.FAbirim.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong> TL/m²</span>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.statCard}>
                <h5>Piyasa Değerine Göre</h5>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, marginTop: '0.5rem' }}>
                  <PriceEvaluationChart
                    minPrice={result ? result.FD_total : 0}
                    marketPrice={parseInt(manualMarketPrice.replace(/\D/g, '') || "0")}
                  />
                </div>
              </div>
            </div>

            <div className={styles.sliderArea}>
              <h4 className={styles.sliderHeader}>Arsa Payı</h4>
              <div className={styles.sliderContainer}>
                <div className={styles.sliderTrackWrapper}>
                  <div className={styles.sliderTrack}>
                    <div className={styles.sliderFill} style={{ width: `${((landShareRatio - 10) / 90) * 100}%` }}></div>
                    <div className={styles.sliderThumb} style={{ left: `${((landShareRatio - 10) / 90) * 100}%` }}></div>
                    <input
                      type="range" min="10" max="100"
                      value={landShareRatio}
                      onChange={(e) => {
                        setLandShareRatio(Number(e.target.value));
                        setIsApartmentCountEnabled(false);
                      }}
                      style={{ position: 'absolute', width: '100%', top: '-10px', height: '30px', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                    />
                    <div className={styles.sliderTicks}>
                      <span>10%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
                <div className={styles.sliderValueBox}>{landShareRatio}%</div>
              </div>
            </div>

            {districtPrices.length > 0 && (
              <LocationSelector
                districtPrices={districtPrices}
                selectedIl={selectedIl}
                selectedIlce={selectedIlce}
                onIlChange={handleIlChange}
                onIlceChange={handleIlceChange}
                onClear={handleClearLocation}
              />
            )}
            <div className={styles.actionBottomRow}>
              <Button variant="outline" onClick={handlePdfDownload} disabled={!result}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                PDF İndir
              </Button>
              <Button variant="primary" onClick={handleSaveReport} disabled={isSaving}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                {isSaving ? 'Kaydediliyor...' : 'Rapor Kaydet'}
              </Button>
              <Button
                variant="outline"
                onClick={handleAddScenario}
                disabled={!result || savedScenarios.length >= 3}
                title={savedScenarios.length >= 3 ? 'Maksimum 3 senaryo' : undefined}
                style={{ color: 'var(--green)', borderColor: 'var(--green)', background: 'rgba(47, 191, 113, 0.08)' }}
              >
                + Karşılaştır
              </Button>
            </div>
            {savedScenarios.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {savedScenarios.map((s, i) => {
                  const c = PILL_COLORS[i % 3];
                  return (
                    <span key={s.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '4px 12px', borderRadius: '20px',
                      background: c.bg, border: `1px solid ${c.border}`,
                      fontSize: '0.8rem', fontWeight: 700, color: c.text,
                    }}>
                      {s.name}
                      <button
                        onClick={() => handleRemoveScenario(s.id)}
                        aria-label={`${s.name}'i kaldır`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: 0, lineHeight: 1, fontSize: '1rem' }}
                        title={`${s.name}'i kaldır`}
                      >×</button>
                    </span>
                  );
                })}
              </div>
            )}
            {savedScenarios.length >= 2 && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: 'var(--card-title)' }}>
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
          </main>

          {/* Hesap Özeti */}
          <aside className={`${styles.summaryPanel} ${styles.swipeCard}`}>
            <div className={styles.summaryPanelTitle}>
              Hesap Özeti
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {['Dağılım', 'Analiz', 'Finans'].map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setSummaryPage(i)}
                    title={label}
                    style={{
                      width: summaryPage === i ? 20 : 8,
                      height: 8,
                      borderRadius: 10,
                      border: 'none',
                      background: summaryPage === i ? 'var(--primary)' : 'var(--muted)',
                      opacity: summaryPage === i ? 1 : 0.4,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Page Container with slide animation */}
            <div style={{ overflow: 'hidden', position: 'relative' }}>
              <div style={{
                display: 'flex',
                transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
                transform: `translateX(-${summaryPage * 100}%)`,
              }}>

                {/* Page 0: Maliyet Dağılımı */}
                <div style={{ minWidth: '100%', padding: '0 16px 16px' }}>
                  <CostBreakdownChart
                    constructionCost={result ? result.Mi_base + result.Mz : 0}
                    landValue={result ? result.Ma : 0}
                    profit={result ? (result.FD_total - result.M) : 0}
                    risk={result ? (result.Mi - result.Mi_base - result.Mz) : 0}
                  />
                </div>

                {/* Page 1: Hassasiyet + Kırılma Noktası */}
                <div style={{ minWidth: '100%', padding: '0 16px 16px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <SensitivityChart baseInput={{
                      x: landShareRatio / 100,
                      L: luxLevel,
                      Ad: apartmentSize,
                      P: 10000,
                      K: builderProfit,
                      Sd: isApartmentCountEnabled ? totalApartments : undefined,
                      Aa: isAaEnabled ? arsaAlani : undefined,
                      isRiskEnabled: riskLevel > 0,
                      R: riskLevel > 0 ? 1 + (riskLevel / 100) : 1,
                      isExcavationEnabled: iksaMode !== 'off',
                      excavationMode: iksaMode === 'manual' ? 'manual' : 'percentage',
                      Z: iksaMode === 'percentage' ? (iksaPercentage / 100) : 0,
                      MzOriginal: iksaMode === 'manual' ? iksaManualTL : 0,
                    }} />
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <BreakEvenChart
                      baseInput={{
                        x: landShareRatio / 100,
                        L: luxLevel,
                        Ad: apartmentSize,
                        P: 10000,
                        K: builderProfit,
                        Sd: isApartmentCountEnabled ? totalApartments : undefined,
                        Aa: isAaEnabled ? arsaAlani : undefined,
                        isRiskEnabled: riskLevel > 0,
                        R: riskLevel > 0 ? 1 + (riskLevel / 100) : 1,
                        isExcavationEnabled: iksaMode !== 'off',
                        excavationMode: iksaMode === 'manual' ? 'manual' : 'percentage',
                        Z: iksaMode === 'percentage' ? (iksaPercentage / 100) : 0,
                        MzOriginal: iksaMode === 'manual' ? iksaManualTL : 0,
                      }}
                      marketPrice={parseInt(manualMarketPrice.replace(/\D/g, '') || '0')}
                    />
                  </div>
                </div>

                {/* Page 2: Finansal Modelleme */}
                <div style={{ minWidth: '100%', padding: '0 16px 16px' }}>
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
            <div style={{
              padding: '8px 16px 12px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--muted)',
            }}>
              {summaryPage === 0 && '📊 Maliyet Dağılımı'}
              {summaryPage === 1 && '📈 Hassasiyet & Kırılma'}
              {summaryPage === 2 && '💰 Finansal Modelleme'}
            </div>
          </aside>
        </section>
      </div >

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Rapor kaydetmek ve özel finansal modellemelerinize panelinizden ulaşabilmek için lütfen giriş yapın."
      />
    </div >
  );
}
