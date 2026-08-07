"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './page.module.css';
import { useSession } from 'next-auth/react';
import { HomeMobile } from './mobile/HomeMobile';

/* ── Animated counter hook ── */
function useCounter(end: number, duration = 1600, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(eased * end));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, end, duration]);
  return val;
}

/* ── Stats section ── */
function StatsStrip() {
  const c1 = useCounter(12400, 1600, true);
  const c2 = useCounter(3, 800, true);
  const c3 = useCounter(97, 1200, true);
  const c4 = useCounter(500, 1400, true);

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className={styles.statsStrip}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={containerVariants}
    >
      <motion.div className={styles.statItem} variants={itemVariants}>
        <span className={styles.statVal}>{c1.toLocaleString('tr-TR')}+</span>
        <span className={styles.statLabel}>Tamamlanan Analiz</span>
      </motion.div>
      <motion.div className={styles.statItem} variants={itemVariants}>
        <span className={styles.statVal}>~{c2}sn</span>
        <span className={styles.statLabel}>Ortalama Hesaplama</span>
      </motion.div>
      <motion.div className={styles.statItem} variants={itemVariants}>
        <span className={styles.statVal}>%{c3}</span>
        <span className={styles.statLabel}>Model Doğruluğu</span>
      </motion.div>
      <motion.div className={styles.statItem} variants={itemVariants}>
        <span className={styles.statVal}>{c4}+</span>
        <span className={styles.statLabel}>Kayıtlı Müteahhit</span>
      </motion.div>
    </motion.div>
  );
}

/* ── Features bento grid ── */
function FeaturesGrid() {
  const [demoArea, setDemoArea] = useState<number>(1250);
  const [demoKaks, setDemoKaks] = useState<number>(1.5);
  const [costTier, setCostTier] = useState<'luxe' | 'standard' | 'eco'>('luxe');

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  // Engine v2 Live Dynamic Calculation Math
  const calculatedCost = Math.round((demoArea * demoKaks * 9840) / 1000) * 1000;
  const calculatedShare = Math.min(62, Math.max(38, 40 + (demoArea / 1000) * demoKaks * 4)).toFixed(1);
  const totalUnits = Math.round((demoArea * demoKaks) / 120);
  const landOwnerUnits = Math.round(totalUnits * (parseFloat(calculatedShare) / 100));
  const builderUnits = Math.max(1, totalUnits - landOwnerUnits);

  // Financial Tier Multipliers
  const tierCostMap = {
    luxe: { build: 38, profit: 28, risk: 20, fee: 14, label: 'Lüks (A+)' },
    standard: { build: 44, profit: 25, risk: 18, fee: 13, label: 'Standart' },
    eco: { build: 50, profit: 22, risk: 15, fee: 13, label: 'Ekonomik' },
  };

  const currentTier = tierCostMap[costTier];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className={styles.bentoGrid}
    >
      {/* ── CARD 1: ENGINE V2 (Wide, Span 2) ── */}
      <motion.div
        variants={cardVariants}
        className={`${styles.bentoCard} ${styles.bentoWide}`}
      >
        <div className={styles.cardBgImage} style={{ backgroundImage: "url('/images/bento/engine-v2-bg.jpg')" }} />
        <div className={styles.spotlight} />
        <div className={styles.bentoContentSplit}>
          <div className={styles.bentoTextGroup}>
            <div className={styles.bentoTop}>
              <span className={styles.bentoTag}>ENGINE V2 ALGORİTMASI</span>
              <span className={styles.bentoNum}>01</span>
            </div>
            <h3 className={styles.bentoTitle}>Engine v2 Teknolojisi</h3>
            <p className={styles.bentoDesc}>
              Gelişmiş algoritmalar ile piyasa dinamiklerini analiz eder, en doğru inşaat maliyeti ve arsa payı oranlarını anında sunar.
            </p>
            <div className={styles.bentoPills}>
              <span className={styles.miniPill}>⚡ Dynamic Calculation Engine</span>
              <span className={styles.miniPill}>📊 12.000+ Rapor Verisi</span>
            </div>
          </div>

          {/* Mobile Device UX Screen Frame (Card 01) */}
          <div className={styles.mobileDeviceFrame}>
            <div className={styles.mobileStatusBar}>
              <span>09:41</span>
              <div className={styles.mobileNotchPill} />
              <span>5G 🔋</span>
            </div>
            <div className={styles.glassEngineWidget}>
              <div className={styles.engineHeaderRow}>
                <span className={styles.enginePulseTag}>
                  <span className={styles.pulseDot} /> CANLI HESAPLAMA MOTORU
                </span>
                <span className={styles.engineLatency}>Gecikme: 0.04s</span>
              </div>

              {/* Arsa Alanı Slider */}
              <div className={styles.engineInputGroup}>
                <div className={styles.engineLabelRow}>
                  <span className={styles.engineLabel}>Simüle Arsa Alanı:</span>
                  <span className={styles.engineAreaVal}>{demoArea.toLocaleString('tr-TR')} m²</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="50"
                  value={demoArea}
                  onChange={(e) => setDemoArea(Number(e.target.value))}
                  className={styles.glassRangeSlider}
                />
              </div>

              {/* KAKS Emsal Buttons */}
              <div className={styles.kaksSelectorGroup}>
                <span className={styles.kaksLabel}>İmar / Emsal (KAKS):</span>
                <div className={styles.kaksBtnRow}>
                  {[1.0, 1.5, 2.0].map((kVal) => (
                    <button
                      key={kVal}
                      type="button"
                      className={`${styles.kaksBtn} ${demoKaks === kVal ? styles.kaksBtnActive : ''}`}
                      onClick={() => setDemoKaks(kVal)}
                    >
                      {kVal.toFixed(1)} KAKS
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Results Tiles */}
              <div className={styles.glassStatGrid}>
                <div className={styles.glassStatTile}>
                  <span className={styles.glassTileLabel}>İnşaat Maliyeti</span>
                  <span className={styles.glassTileVal}>₺{calculatedCost.toLocaleString('tr-TR')}</span>
                </div>
                <div className={styles.glassStatTile}>
                  <span className={styles.glassTileLabel}>Optimal Arsa Payı</span>
                  <span className={styles.glassTileVal}>%{calculatedShare}</span>
                </div>
              </div>

              {/* Unit Breakdown Pill */}
              <div className={styles.unitDistroPill}>
                <span>🏠 Arsa Sahibi: <strong>{landOwnerUnits} Daire</strong></span>
                <span>🏢 Müteahhit: <strong>{builderUnits} Daire</strong></span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── CARD 2: DETAYLI MALİYET ANALİZİ (Span 1) ── */}
      <motion.div
        variants={cardVariants}
        className={styles.bentoCard}
      >
        <div className={styles.cardBgImage} style={{ backgroundImage: "url('/images/bento/cost-analysis-bg.jpg')" }} />
        <div className={styles.spotlight} />
        <div className={styles.bentoTop}>
          <span className={styles.bentoTag}>360° FİNANSAL MODEL</span>
          <span className={styles.bentoNum}>02</span>
        </div>
        <h3 className={styles.bentoTitle}>Detaylı Maliyet Analizi</h3>
        <p className={styles.bentoDesc}>
          İksa masrafları, lüks seviyesi, risk payı ve müteahhit kârını dahil ederek 360 derece finansal modelleme yapar.
        </p>

        {/* Mobile Device UX Screen Frame (Card 02) */}
        <div className={styles.mobileDeviceFrame}>
          <div className={styles.mobileStatusBar}>
            <span>09:41</span>
            <div className={styles.mobileNotchPill} />
            <span>5G 🔋</span>
          </div>

          <div className={styles.glassDonutWidget}>
            {/* Tier Selector Bar */}
            <div className={styles.tierSelectorBar}>
              {(['luxe', 'standard', 'eco'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.tierTab} ${costTier === t ? styles.tierTabActive : ''}`}
                  onClick={() => setCostTier(t)}
                >
                  {tierCostMap[t].label}
                </button>
              ))}
            </div>

            {/* Interactive SVG Donut */}
            <div className={styles.donutChartWrapper}>
              <svg viewBox="0 0 36 36" className={styles.donutChartSvg}>
                <path className={styles.donutRing} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={styles.donutSegment1} strokeDasharray={`${currentTier.build}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={styles.donutSegment2} strokeDasharray={`${currentTier.profit}, 100`} strokeDashoffset={`-${currentTier.build}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={styles.donutSegment3} strokeDasharray={`${currentTier.risk}, 100`} strokeDashoffset={`-${currentTier.build + currentTier.profit}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={styles.donutSegment4} strokeDasharray={`${currentTier.fee}, 100`} strokeDashoffset={`-${currentTier.build + currentTier.profit + currentTier.risk}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className={styles.donutCenter}>
                <span className={styles.donutCenterVal}>360°</span>
                <span className={styles.donutCenterSub}>Model</span>
              </div>
            </div>

            {/* Interactive Progress Bars */}
            <div className={styles.glassLegendGrid}>
              <div className={styles.legendRow}>
                <div className={styles.legendLabelGroup}>
                  <span className={`${styles.legendDot} ${styles.dot1}`} />
                  <span>İnşaat (%{currentTier.build})</span>
                </div>
                <div className={styles.progressTrack}><div className={`${styles.progressBar} ${styles.bar1}`} style={{ width: `${currentTier.build}%` }} /></div>
              </div>
              <div className={styles.legendRow}>
                <div className={styles.legendLabelGroup}>
                  <span className={`${styles.legendDot} ${styles.dot2}`} />
                  <span>Müteahhit Kârı (%{currentTier.profit})</span>
                </div>
                <div className={styles.progressTrack}><div className={`${styles.progressBar} ${styles.bar2}`} style={{ width: `${currentTier.profit}%` }} /></div>
              </div>
              <div className={styles.legendRow}>
                <div className={styles.legendLabelGroup}>
                  <span className={`${styles.legendDot} ${styles.dot3}`} />
                  <span>Lüks & Risk (%{currentTier.risk})</span>
                </div>
                <div className={styles.progressTrack}><div className={`${styles.progressBar} ${styles.bar3}`} style={{ width: `${currentTier.risk}%` }} /></div>
              </div>
              <div className={styles.legendRow}>
                <div className={styles.legendLabelGroup}>
                  <span className={`${styles.legendDot} ${styles.dot4}`} />
                  <span>İksa & Harç (%{currentTier.fee})</span>
                </div>
                <div className={styles.progressTrack}><div className={`${styles.progressBar} ${styles.bar4}`} style={{ width: `${currentTier.fee}%` }} /></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── CARD 3: AKILLI PAZAR YERİ (Span 1) ── */}
      <motion.div
        variants={cardVariants}
        className={styles.bentoCard}
      >
        <div className={styles.cardBgImage} style={{ backgroundImage: "url('/images/bento/marketplace-bg.jpg')" }} />
        <div className={styles.spotlight} />
        <div className={styles.bentoTop}>
          <span className={styles.bentoTag}>MÜTEAHHİT PAZAR YERİ</span>
          <span className={styles.bentoNum}>03</span>
        </div>
        <h3 className={styles.bentoTitle}>Akıllı Pazar Yeri</h3>
        <p className={styles.bentoDesc}>
          Hesaplanan fizibilite raporlarıyla birlikte arsanızı doğrudan doğrulanmış müteahhitlerin teklifine açabilirsiniz.
        </p>

        {/* Mobile Device UX Screen Frame (Card 03) */}
        <div className={styles.mobileDeviceFrame}>
          <div className={styles.mobileStatusBar}>
            <span>09:41</span>
            <div className={styles.mobileNotchPill} />
            <span>5G 🔋</span>
          </div>

          <div className={styles.glassProposalWidget}>
            <div className={styles.proposalHeaderRow}>
              <span className={styles.proposalBadgeText}>
                <span className={styles.livePulseDot} /> CANLI TEKLİF ALINDI
              </span>
              <span className={styles.proposalTime}>Şimdi</span>
            </div>
            <div className={styles.glassBuilderInfo}>
              <div className={styles.glassAvatar}>A+</div>
              <div className={styles.builderMetaCol}>
                <span className={styles.builderTitle}>A+ Yapı İnşaat <span className={styles.verifiedCheck}>✓</span></span>
                <span className={styles.builderRating}>⭐ 4.9 • 38 Proje Tamamlandı</span>
              </div>
            </div>
            <div className={styles.glassOfferRow}>
              <span className={styles.offerLabel}>Kat Payı Teklifi:</span>
              <span className={styles.offerValue}>%50.0 Arsa Payı</span>
            </div>
            <div className={styles.offerSubMeta}>
              <span>🔒 ₺10.0M Onaylı Teminat Mektubu</span>
              <span>⏱️ 18 Ay Anahtar Teslim</span>
            </div>
            <div className={styles.glassActionPill}>Teklifi İncele & Mesaj Gönder →</div>
          </div>
        </div>
      </motion.div>

      {/* ── CARD 4: GÜVENLİ & HIZLI (Wide, Span 2) ── */}
      <motion.div
        variants={cardVariants}
        className={`${styles.bentoCard} ${styles.bentoWide}`}
      >
        <div className={styles.cardBgImage} style={{ backgroundImage: "url('/images/bento/security-pdf-bg.jpg')" }} />
        <div className={styles.spotlight} />
        <div className={styles.bentoContentSplit}>
          <div className={styles.bentoTextGroup}>
            <div className={styles.bentoTop}>
              <span className={styles.bentoTag}>SANİYELER İÇİNDE ROL ALIN</span>
              <span className={styles.bentoNum}>04</span>
            </div>
            <h3 className={styles.bentoTitle}>Güvenli & Hızlı PDF Rapor</h3>
            <p className={styles.bentoDesc}>
              Tüm verileriniz uçtan uca şifrelenir. Günler süren fizibilite süreçleri saniyelere iner, anında resmi PDF raporu alabilirsiniz.
            </p>
            <div className={styles.bentoPills}>
              <span className={styles.miniPill}>🔒 256-Bit TLS Şifreleme</span>
              <span className={styles.miniPill}>📄 Anında PDF İndir</span>
            </div>
          </div>

          {/* Mobile Device UX Screen Frame (Card 04) */}
          <div className={styles.mobileDeviceFrame}>
            <div className={styles.mobileStatusBar}>
              <span>09:41</span>
              <div className={styles.mobileNotchPill} />
              <span>5G 🔋</span>
            </div>

            <div className={styles.glassPdfWidget}>
              <div className={styles.pdfHeaderRow}>
                <span className={styles.pdfIcon}>📄</span>
                <div className={styles.pdfMeta}>
                  <span className={styles.pdfFileName}>ArsaBil_Fizibilite_Raporu.pdf</span>
                  <span className={styles.pdfFileSize}>3.4 MB • Hazır & Şifreli</span>
                </div>
                <span className={styles.glassSpeedBadge}>⚡ 0.3 sn</span>
              </div>
              
              {/* PDF Mock Document Preview Box */}
              <div className={styles.pdfPreviewLines}>
                <div className={styles.pdfTopBadges}>
                  <span className={styles.tkgmSeal}>✓ TKGM KATMANI</span>
                  <span className={styles.qrVerified}>VERIFIED QR #84920</span>
                </div>
                <div className={styles.pdfLineFull} />
                <div className={styles.pdfLineHalf} />
                <div className={styles.pdfChartBarPlaceholder}>
                  <div className={styles.pdfMiniBar1} />
                  <div className={styles.pdfMiniBar2} />
                  <div className={styles.pdfMiniBar3} />
                </div>
              </div>

              <div className={styles.glassPdfBtn}>
                <span>PDF Raporunu İndir</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── How It Works Section ── */
function HowItWorks() {
  return (
    <div className={styles.howItWorksGrid}>
      {/* Step 1 */}
      <div className={styles.howStepCard}>
        <div className={styles.howStepImageContainer}>
          <img
            src="/images/steps/step1-input.jpg"
            alt="Arsa Parsel Kadastro Verisi"
            className={styles.howStepImg}
          />
          <span className={styles.howStepTag}>01 • GİRDİ & KADASTRO</span>
        </div>
        <div className={styles.howStepContent}>
          <h3 className={styles.howStepTitle}>Arsa Verinizi Girin</h3>
          <p className={styles.howStepDesc}>
            İl, ilçe veya parsel bilginizi girin. Engine v2 saniyeler içinde arsanızın imar ve maliyet denklemlerini çalıştırsın.
          </p>
          
          {/* Grounded Real Estate Cadastral Box */}
          <div className={styles.realEstateDataBox}>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Konum:</span>
              <span className={styles.dataVal}>İstanbul / Kadıköy</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Ada / Parsel:</span>
              <span className={styles.dataVal}>104 / 12</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Arsa Alanı:</span>
              <span className={styles.dataVal}>1.250 m²</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>İmar / Emsal:</span>
              <span className={styles.dataVal}>1.50 KAKS (Konut)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className={styles.howStepCard}>
        <div className={styles.howStepImageContainer}>
          <img
            src="/images/steps/step2-report.jpg"
            alt="Mimari İnşaat ve Fizibilite"
            className={styles.howStepImg}
          />
          <span className={styles.howStepTag}>02 • FİZİBİLİTE RAPORU</span>
        </div>
        <div className={styles.howStepContent}>
          <h3 className={styles.howStepTitle}>360° Raporunuzu Alın</h3>
          <p className={styles.howStepDesc}>
            İnşaat maliyetinden müteahhit kârına, iksa payından optimal arsa oranına kadar kurumsal PDF raporunuz hazır.
          </p>

          {/* Grounded Financial Report Box */}
          <div className={styles.realEstateDataBox}>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Tahmini Maliyet:</span>
              <span className={styles.dataValBold}>₺18.4M</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Optimal Arsa Payı:</span>
              <span className={styles.dataValHighlight}>%50.0</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Daire Sayısı:</span>
              <span className={styles.dataVal}>12 Adet (3+1)</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>PDF Raporu:</span>
              <span className={styles.dataValOk}>✓ Resmî İmzalı</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className={styles.howStepCard}>
        <div className={styles.howStepImageContainer}>
          <img
            src="/images/steps/step3-match.jpg"
            alt="Müteahhit Teklif Görüşmesi"
            className={styles.howStepImg}
          />
          <span className={styles.howStepTag}>03 • PAZAR YERİ & İLAN</span>
        </div>
        <div className={styles.howStepContent}>
          <h3 className={styles.howStepTitle}>Müteahhit Tekliflerine Açın</h3>
          <p className={styles.howStepDesc}>
            Raporunuzla birlikte arsanızı A+ doğrulanmış müteahhitlerin canlı teklifine açın ve güvenle sözleşme sürecini başlatın.
          </p>

          {/* Grounded Contractor Proposal Box */}
          <div className={styles.realEstateDataBox}>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Teklif Veren:</span>
              <span className={styles.dataVal}>A+ Yapı İnşaat ✓</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Kat Payı Teklifi:</span>
              <span className={styles.dataValHighlight}>%50 Arsa Payı</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Teminat Mektubu:</span>
              <span className={styles.dataVal}>₺10.0M Onaylı</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Teslim Süresi:</span>
              <span className={styles.dataVal}>18 Ay (Anahtar Teslim)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ Accordion Section ── */
function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Engine v2 arsa payı oranını neye göre hesaplıyor?',
      a: 'Engine v2 motoru; arsanızın m² büyüklüğü, emsal/KATS değeri, bölgesel birim inşaat maliyetleri (TL/m²), lüks sınıf katsayısı ve müteahhit kâr marjını hesaba katarak en adil kat karşılığı arsa payını bilimsel formüllerle anında hesaplar.'
    },
    {
      q: 'Arsa sahibi olarak ilan vermek ve rapor almak ücretsiz mi?',
      a: 'Evet! Arsa sahipleri temel fizibilite raporlarını ve pazar yeri ilanlarını tamamen ücretsiz olarak oluşturabilir ve doğrulanmış müteahhitlerin teklifine açabilir.'
    },
    {
      q: 'Müteahhitlerin doğrulanması (A+ Doğrulama) nasıl yapılıyor?',
      a: 'Platformumuza üye olan müteahhitler; vergi levhası, ticaret sicil gazetesi, tamamlanan geçmiş proje portföyleri ve yetki belgeleri kontrol edildikten sonra A+ Doğrulanmış Müteahhit rozeti almaya hak kazanırlar.'
    },
    {
      q: 'Oluşturulan PDF raporları resmî görüşmelerde kullanılabilir mi?',
      a: 'Evet. Üretilen kurumsal PDF raporları; arsa sahipleri ile müteahhitler arasındaki kat karşılığı ön görüşmelerinde, banka fizibilite toplantılarında ve değerleme süreçlerinde resmi referans belgesi olarak kullanılabilir.'
    }
  ];

  return (
    <div className={styles.faqList}>
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ''}`}
            onClick={() => setOpenIndex(isOpen ? null : idx)}
          >
            <div className={styles.faqQuestionRow}>
              <span className={styles.faqQuestion}>{faq.q}</span>
              <span className={styles.faqToggleIcon}>{isOpen ? '−' : '+'}</span>
            </div>
            {isOpen && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.25 }}
                className={styles.faqAnswer}
              >
                {faq.a}
              </motion.p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
function MarketingHomePage() {
  return (
    <div className={styles.container}>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroKicker}>Türkiye&apos;nin İlk Dijital Arsa Fizibilite Platformu</span>
          <h1 className={styles.heroTitle}>
            Arsanızın Gerçek Değerini <br />
            <span>Tahmin Etmeyin, Hesaplayın.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Kat karşılığı inşaat projelerinizde arsa payı, maliyet ve kâr analizini <br />
            <strong>Engine v2</strong> teknolojisi ile saniyeler içinde, bilimsel verilerle yapın.
          </p>
          <div className={styles.heroCta}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-block' }}>
              <Link href="/hesapla" className={styles.primaryBtn}>
                Hemen Hesapla
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-block' }}>
              <Link href="/marketplace" className={styles.secondaryBtn}>
                Pazar Yerine Git
              </Link>
            </motion.div>
          </div>

          {/* Hero Live Teaser Glass Widget */}
          <div className={styles.heroTeaserGlass}>
            <div className={styles.teaserBar}>
              <span className={styles.teaserSearchIcon}>🔍</span>
              <span className={styles.teaserInputText}>Kadıköy, İstanbul • 1.250 m² Arsa Parsel #4802</span>
              <span className={styles.teaserBadgeLive}>LIVE DEMO</span>
            </div>
            <div className={styles.teaserResultsRow}>
              <div className={styles.teaserScoreTile}>
                <span className={styles.teaserScoreVal}>96/100</span>
                <span className={styles.teaserScoreLabel}>Fizibilite Skoru</span>
              </div>
              <div className={styles.teaserMetricTile}>
                <span className={styles.teaserMetricVal}>%50.0</span>
                <span className={styles.teaserMetricLabel}>Optimal Arsa Payı</span>
              </div>
              <div className={styles.teaserMetricTile}>
                <span className={styles.teaserMetricVal}>₺18.4M</span>
                <span className={styles.teaserMetricLabel}>Tahmini İnşaat Maliyeti</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <StatsStrip />

      {/* Features Section */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Neden ArsaBil?</p>
          <h2 className={styles.sectionTitle}>Tek platformda tüm analiz</h2>
          <p className={styles.sectionSub}>Arsa değerlemesinden pazar yerine, finansal modellemeden güvenli paylaşıma kadar.</p>
        </div>
        <FeaturesGrid />
      </section>

      {/* How It Works Section */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>3 Adımda İlerleme</p>
          <h2 className={styles.sectionTitle}>Süreç Nasıl Çalışır?</h2>
          <p className={styles.sectionSub}>Geleneksel haftalar süren fizibilite süreçlerini 3 basit adımda saniyelere indirin.</p>
        </div>
        <HowItWorks />
      </section>

      {/* Vision & Mission Section */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Geleceği İnşa Ediyoruz</p>
          <h2 className={styles.sectionTitle}>Amacımız & Değerlerimiz</h2>
        </div>
        <div className={styles.visionMission}>
          <div className={styles.visionCard}>
            <div className={styles.visionImageContainer}>
              <img
                src="/images/vision/vision-future.jpg"
                alt="Şehir Mimarisi ve Ekosistem"
                className={styles.visionImg}
              />
              <span className={styles.visionTag}>🏛️ GELECEK VİZYONU</span>
            </div>
            <div className={styles.visionContent}>
              <h3 className={styles.visionTitle}>Vizyonumuz</h3>
              <p className={styles.visionText}>
                Türkiye&apos;nin her parselinde, inşaat potansiyelini bir tıkla şeffaflaştıran, dijital gayrimenkul geliştirme standartlarını belirleyen bir ekosistem olmak.
              </p>
              <div className={styles.visionPillars}>
                <span className={styles.visionPill}>✓ %100 Doğrulanmış Kadastro Verisi</span>
                <span className={styles.visionPill}>✓ Bilimsel Arsa Payı Standartları</span>
                <span className={styles.visionPill}>✓ Türkiye Geneli İmar Haritası</span>
              </div>
            </div>
          </div>
          <div className={styles.visionCard}>
            <div className={styles.visionImageContainer}>
              <img
                src="/images/vision/mission-trust.jpg"
                alt="Güvenli Gayrimenkul Sözleşmesi"
                className={styles.visionImg}
              />
              <span className={styles.visionTag}>⚖️ KURUMSAL MİSYON</span>
            </div>
            <div className={styles.visionContent}>
              <h3 className={styles.visionTitle}>Misyonumuz</h3>
              <p className={styles.visionText}>
                Arsa sahipleri ve müteahhitler arasındaki güven bariyerini, veriye dayalı anlık analizlerle yıkarak; adil ve hızlı inşaat süreçlerine öncülük etmek.
              </p>
              <div className={styles.visionPillars}>
                <span className={styles.visionPill}>✓ Güvenli Sözleşme Dengesi</span>
                <span className={styles.visionPill}>✓ TÜİK 2026 İnşaat Endeksi</span>
                <span className={styles.visionPill}>✓ Resmî PDF Rapor İmzası</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Sektörel Rehber</p>
          <h2 className={styles.sectionTitle}>Sektörden Haberler</h2>
        </div>
        <div className={styles.blogGrid}>
          <div className={styles.blogCard}>
            <div className={styles.blogImageContainer}>
              <img src="/images/blog/trends-2026.jpg" alt="2026 Kat Karşılığı İnşaat Trendleri" className={styles.blogImg} />
              <span className={styles.blogCategoryTag}>İnşaat 2026</span>
            </div>
            <div className={styles.blogContent}>
              <div className={styles.blogDate}>23 Nisan 2026</div>
              <h3 className={styles.blogTitle}>2026&apos;da Kat Karşılığı İnşaat Trendleri</h3>
              <p className={styles.blogDesc}>Yeni inşaat maliyet endeksleri ve değişen arsa payı oranları ışığında, bu yıl müteahhitler ve arsa sahipleri nelere dikkat etmeli?</p>
              <Link href="#" className={styles.blogReadMore}>
                Devamını Oku
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
          <div className={styles.blogCard}>
            <div className={styles.blogImageContainer}>
              <img src="/images/blog/valuation-methods.jpg" alt="Arsa Değerleme Yöntemleri" className={styles.blogImg} />
              <span className={styles.blogCategoryTag}>Fizibilite & Veri</span>
            </div>
            <div className={styles.blogContent}>
              <div className={styles.blogDate}>18 Nisan 2026</div>
              <h3 className={styles.blogTitle}>Arsa Değerleme Yöntemleri: Geleneksel vs. Dijital</h3>
              <p className={styles.blogDesc}>Ekspertiz raporları ve kulaktan dolma bilgiler yerine, Engine v2 gibi algoritmik değerleme sistemleri neden daha güvenilir sonuçlar veriyor?</p>
              <Link href="#" className={styles.blogReadMore}>
                Devamını Oku
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
          <div className={styles.blogCard}>
            <div className={styles.blogImageContainer}>
              <img src="/images/blog/transparency-trust.jpg" alt="Müteahhit-Arsa Sahibi Şeffaflık" className={styles.blogImg} />
              <span className={styles.blogCategoryTag}>Pazar Yeri & Güven</span>
            </div>
            <div className={styles.blogContent}>
              <div className={styles.blogDate}>10 Nisan 2026</div>
              <h3 className={styles.blogTitle}>Müteahhit-Arsa Sahibi İlişkisinde Şeffaflığın Önemi</h3>
              <p className={styles.blogDesc}>İnşaat sözleşmelerinde yaşanan iptallerin %80&apos;i maliyet şeffaflığı eksikliğinden kaynaklanıyor. Verilerle güven nasıl inşa edilir?</p>
              <Link href="#" className={styles.blogReadMore}>
                Devamını Oku
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Aklınıza Takılanlar</p>
          <h2 className={styles.sectionTitle}>Sıkça Sorulan Sorular</h2>
          <p className={styles.sectionSub}>Engine v2 motoru, fizibilite raporları ve müteahhit pazar yeri hakkında merak edilenler.</p>
        </div>
        <FaqAccordion />
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBgImage} style={{ backgroundImage: "url('/images/cta-bg.png')" }} />
        <h2 className={styles.ctaTitle}>Arsanızın değerini öğrenmeye hazır mısınız?</h2>
        <p className={styles.ctaSubtitle}>Saniyeler içinde detaylı finansal fizibilite raporunuzu oluşturun, PDF olarak indirin veya tekliflere açın.</p>
        <div className={styles.ctaTrustBadges}>
          <span className={styles.ctaTrustPill}>✓ Kredi Kartı Gerekmez</span>
          <span className={styles.ctaTrustPill}>✓ TKGM Katmanı Entegre</span>
          <span className={styles.ctaTrustPill}>✓ Resmî PDF Çıktısı</span>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-block' }}>
          <Link href="/hesapla" className={styles.ctaBtn}>
            Ücretsiz Hesapla
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </motion.div>
      </section>

    </div>
  );
}

export default function HomePage() {
  const { status } = useSession();
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('not all and (max-width: 768px)');
    const update = () => setIsDesktopViewport(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // SSR ve ilk client render'de MarketingHomePage VARSAYILAN olarak gosterilir
  // -- /hesapla'nin "hicbir sey belli olana kadar iskelet goster" deseni
  // BILEREK KULLANILMIYOR: `/` SEO'ya kritik bir sayfa ve pazarlama sayfasi
  // zaten GUVENLI bir varsayilan (mevcut/eski davranisin ta kendisi).
  // Yalnizca viewport VE oturum ikisi de gercekten "giris yapmis + mobil"
  // oldugunu DOGRULADIGINDA HomeMobile'a GECILIR -- bu kisa bir client-side
  // flash olabilir ama yalnizca bu ekranin hedefledigi yeni kullanici
  // grubunu etkiler; SSR/ilk paint HER ZAMAN pazarlama sayfasidir, hic
  // regresyon yok.
  if (isDesktopViewport === false && status === 'authenticated') {
    return <HomeMobile />;
  }

  return <MarketingHomePage />;
}
