'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './StudioPreview.module.css';
import { formatStudioNumber } from './studioFormat';
import { isWebGLAvailable } from './webglSupport';
import { checkFootprintComplexity } from './studioPerformance';
import { useIsElementVisible } from './useIsElementVisible';
import { StudioFallback } from './StudioFallback';
import { StudioSceneBoundary } from './StudioSceneBoundary';
import { deriveProgramBands } from '@/lib/studio/programInventory';
import { deriveFootprintPolygon } from '@/lib/studio/geometry2d';
import { PROGRAM_USE_LABELS } from './programLabels';
import { PROGRAM_USE_COLORS } from './studioVisualTokens';
import type { BuildingMass, ProgramBand, ProgramMixItem, StudioLayoutDraft, StudioWarning } from '@/lib/studio/types';

// three/@react-three/fiber agir paketler; panel varsayilan kapali oldugu
// icin bu dinamik import kullanici acikca ac(madikca) hic tetiklenmez —
// ilk hesap sonucu bu paketlerin indirilmesini/derlenmesini beklemez
// (Faz 1B Task 1, kullanici bulgusu: mass gelir gelmez kosulsuz canvas
// mount ilk sonucu geciktiriyordu).
const StudioScene = dynamic(() => import('./StudioScene').then((mod) => mod.StudioScene), {
  ssr: false,
  loading: () => <div className={styles.canvasLoading}>3D önizleme yükleniyor…</div>,
});

export type GeometrySourceStatus = 'verified' | 'draft' | 'demo' | 'missing';

type StudioPreviewProps = {
  mass: BuildingMass | null;
  warnings?: StudioWarning[];
  geometrySource?: string;
  geometryStatus?: GeometrySourceStatus;
  constructionAreaSource?: string;
  constructionAreaEstimated?: boolean;
  /** Faz 2A Task 4 — verilirse kat aralığı atanmış kalemler 3D sahnede
   * renkli bant, altta da legend olarak gösterilir. Verilmezse (veya hiç
   * kat aralığı atanmamışsa) mevcut tek-renkli görünüme zarifçe döner. */
  programMixItems?: ProgramMixItem[];
  /** Faz 3A Task 5 bullet 2 — verilirse ICERIDE `programMixItems`den
   * YENIDEN TURETMEZ, sayfa seviyesinde TEK KEZ hesaplanmis bantlari
   * kullanir; boylece 2D legend/3D bant/envanter ozeti AYNI ID'lere sahip
   * olur (turetimin coklu cagrisindan degil, TEK kaynaktan gelen deger
   * esitligiyle). Verilmezse (mevcut cagiranlar icin) geriye donuk
   * `programMixItems`den turetmeye devam eder. */
  programBands?: ProgramBand[];
  /** Faz 3A Task 5 bullet 1 — verilirse 2D yerlesim tahtasinin urettigi
   * footprint 3D kutleye aktarilir (`StudioScene`e `footprintOverride`
   * olarak gecer). Verilmezse mevcut davranis (mass.footprint.points)
   * AYNEN korunur. */
  layoutDraft?: StudioLayoutDraft | null;
};

const geometryStatusLabels: Record<GeometrySourceStatus, string> = {
  verified: 'Doğrulanmış parsel',
  draft: 'Taslak geometri',
  demo: 'Demo geometri',
  missing: 'Geometri eksik',
};

export function StudioPreview({
  mass,
  warnings = [],
  geometrySource = 'Parsel siniri bilinmiyor',
  geometryStatus = 'missing',
  constructionAreaSource = 'Insaat alani kaynagi bilinmiyor',
  constructionAreaEstimated = true,
  programMixItems,
  programBands: externalProgramBands,
  layoutDraft,
}: StudioPreviewProps) {
  // Sahne, legend ve (gelecekte) metin ozeti AYNI turetilmis veriden
  // beslenir — renk/pozisyon iki yerde ayrisamaz (Faz 2A Task 4 bullet 4).
  const derivedProgramBands = useMemo(() => deriveProgramBands(programMixItems ?? []), [programMixItems]);
  const programBands = externalProgramBands ?? derivedProgramBands;
  const legendUses = useMemo(() => {
    const seen = new Set<string>();
    return programBands.filter((band) => (seen.has(band.use) ? false : (seen.add(band.use), true)));
  }, [programBands]);
  const footprintOverride = useMemo(
    () => (mass && layoutDraft ? deriveFootprintPolygon(mass.footprint.points, layoutDraft.footprint) : undefined),
    [mass, layoutDraft],
  );
  const [showWireframe, setShowWireframe] = useState(true);
  const [showFloorBands, setShowFloorBands] = useState(true);
  const [sceneVersion, setSceneVersion] = useState(0);
  // Panel varsayilan KAPALI baslar (Faz 1B Task 1) — kaynak/ozet bilgisi
  // (sourceNote, summaryGrid) 3D canvas'tan bagimsiz her zaman gorunur;
  // sadece agir WebGL sahnesi kullanici acikca acana kadar mount edilmez.
  const [isSceneOpen, setIsSceneOpen] = useState(false);
  // OrbitControls varsayilan olarak wheel event'inde preventDefault cagirir;
  // sahne acildiginda kullanici sayfayi kaydirmak icin canvas'in ustunden
  // gecerse sayfa yerine 3D goruntu yakinlasir (sayfa kaydirma cakismasi,
  // Faz 1B Task 1). Kullanici acikca tiklayip "etkinlestirene" kadar
  // canvas'in ustunde saydam bir katman wheel/surukleme olaylarini
  // canvas'a ULASTIRMAZ — sayfa normal kaydirir.
  const [isSceneActive, setIsSceneActive] = useState(false);
  // WebGL destegi ve canvas render hatasi AYRI durumlardir (Faz 1B Task 3) —
  // biri "hic denenmedi/desteklenmiyor", digeri "denendi, patladi". `null`
  // = henuz kontrol edilmedi (panel hic acilmadi).
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [sceneError, setSceneError] = useState<Error | null>(null);
  // Panel scroll ile ekran disina cikinca sahne SOKULUR — hala mount kalip
  // arka planda GPU/pil tuketmez, geri kaydirinca otomatik geri gelir
  // (Faz 1B Task 4 bullet 3). canvasShell yalnizca sahne acikken mount
  // oldugu icin callback ref kullanilir (bkz. useIsElementVisible.ts).
  const [canvasShellRef, isCanvasVisible] = useIsElementVisible();

  const toggleScene = () => {
    setIsSceneOpen((value) => {
      const next = !value;
      if (next) {
        // SSR/hydration uyusmazligi riski yok: yalnizca kullanicinin
        // tikladigi ANDA (saf client event) kontrol edilir, mount sirasinda
        // degil.
        setWebglSupported(isWebGLAvailable());
        setSceneError(null);
      } else {
        setIsSceneActive(false);
      }
      return next;
    });
  };

  // Mobil GPU'yu zorlayabilecek asiri karmasik footprint'ler icin sadelestirme
  // uyarisi — mass null olsa da footprint her zaman tanimlidir (BuildingMass
  // sozlesmesi), bu yuzden erken donisten ONCE hesaplanabilir.
  const footprintComplexity = mass ? checkFootprintComplexity(mass.footprint.points) : null;
  const combinedWarnings: { key: string; message: string }[] = [
    ...warnings.map((warning) => ({ key: warning.code, message: warning.message })),
    ...(footprintComplexity?.warningMessage
      ? [{ key: 'FOOTPRINT_COMPLEXITY', message: footprintComplexity.warningMessage }]
      : []),
  ];

  if (!mass) {
    return (
      <section className={styles.studioCard} aria-labelledby="studio-preview-title">
        <div className={styles.emptyState}>
          <p className={styles.eyebrow}>Arsabil Studio</p>
          <h3 id="studio-preview-title">3D önizleme için veri bekleniyor</h3>
          <p>3D önizleme için parsel geometrisi ve inşaat alanı gerekiyor. Bu senaryoda eksik veri var.</p>
          <div className={styles.sourceSummary} aria-label="Studio veri kaynak özeti">
            <span className={`${styles.statusBadge} ${styles[`status${geometryStatus}`]}`}>
              {geometryStatusLabels[geometryStatus]}
            </span>
            <span>{geometrySource}</span>
            <span>{constructionAreaSource}</span>
          </div>
          {combinedWarnings.length > 0 && (
            <ul className={styles.warningList} aria-label="Studio veri uyarıları">
              {combinedWarnings.map((warning) => (
                <li key={warning.key}>{warning.message}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.studioCard} aria-labelledby="studio-preview-title">
      <div className={styles.studioHeader}>
        <div>
          <p className={styles.eyebrow}>Arsabil Studio</p>
          <h3 className={styles.title} id="studio-preview-title">3D bina kütlesi önizlemesi</h3>
          <p className={styles.subtitle}>
            Hesap sonucundan türetilen taslak kütle. Demo footprint, TKGM parsel geometrisi bağlanınca gerçek sınıra oturacak.
          </p>
        </div>
        <div className={styles.toolbar} aria-label="Studio görünüm araçları">
          <button
            type="button"
            aria-pressed={isSceneOpen}
            className={`${styles.toolButton} ${styles.toolButtonPrimary}`}
            onClick={toggleScene}
          >
            {isSceneOpen ? '3D önizlemeyi gizle' : '3D önizlemeyi göster'}
          </button>
          {isSceneOpen && (
            <>
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => {
                  setSceneVersion((value) => value + 1);
                  // Ayni buton "sifirlama" ile bir onceki canvas hatasindan
                  // sonra yeniden deneme imkani da verir — boundary yeniden
                  // mount olur (bkz. yukaridaki sceneError ternary).
                  setSceneError(null);
                }}
              >
                Görünümü sıfırla
              </button>
              <button
                type="button"
                aria-pressed={showWireframe}
                className={`${styles.toolButton} ${showWireframe ? styles.toolButtonActive : ''}`}
                onClick={() => setShowWireframe((value) => !value)}
              >
                Tel kafes
              </button>
              <button
                type="button"
                aria-pressed={showFloorBands}
                className={`${styles.toolButton} ${showFloorBands ? styles.toolButtonActive : ''}`}
                onClick={() => setShowFloorBands((value) => !value)}
              >
                Kat bantları
              </button>
            </>
          )}
        </div>
      </div>

      {combinedWarnings.length > 0 && (
        // Uyari varken kutle GIZLENMEZ — bu katman canvas'i kaplamaz, ozet
        // bilgiler ile canvas arasinda sakin bir bant olarak durur (Faz 1B
        // Task 2 bullet 3).
        <ul className={`${styles.warningList} ${styles.warningBand}`} aria-label="Studio veri uyarıları">
          {combinedWarnings.map((warning) => (
            <li key={warning.key}>{warning.message}</li>
          ))}
        </ul>
      )}

      {isSceneOpen && webglSupported === false && (
        <div ref={canvasShellRef} className={styles.canvasShell} aria-label="3D bina kütlesi (metin özeti)">
          <StudioFallback mass={mass} reason="unsupported" />
        </div>
      )}

      {isSceneOpen && webglSupported === true && (
        <div ref={canvasShellRef} className={styles.canvasShell} aria-label="3D bina kütlesi">
          {!isCanvasVisible ? (
            <div className={styles.canvasLoading}>3D önizleme görünüme girince devam eder…</div>
          ) : sceneError ? (
            <StudioFallback mass={mass} reason="error" />
          ) : (
            <StudioSceneBoundary
              fallback={<StudioFallback mass={mass} reason="error" />}
              onError={setSceneError}
            >
              <StudioScene
                key={sceneVersion}
                mass={mass}
                showWireframe={showWireframe}
                showFloorBands={showFloorBands}
                programBands={programBands}
                footprintOverride={footprintOverride}
              />
              {!isSceneActive && (
                <button
                  type="button"
                  className={styles.activateOverlay}
                  onClick={() => setIsSceneActive(true)}
                >
                  Etkileşimi başlatmak için tıkla · aksi halde sayfa normal kayar
                </button>
              )}
            </StudioSceneBoundary>
          )}
        </div>
      )}

      <div className={styles.sourceNote} aria-label="Studio veri kaynak özeti">
        <strong>Veri kaynağı</strong>
        <span className={`${styles.statusBadge} ${styles[`status${geometryStatus}`]}`}>
          {geometryStatusLabels[geometryStatus]}
        </span>
        <span>{geometrySource}</span>
        <span>{constructionAreaSource}</span>
        {constructionAreaEstimated && (
          <span className={styles.assumptionNote}>
            İnşaat alanı tahmini; yetkili emsal/imar verisi bağlanınca güncellenmelidir.
          </span>
        )}
      </div>

      {legendUses.length > 0 && (
        <ul className={styles.legend} aria-label="Program bandı lejantı">
          {legendUses.map((band) => (
            <li key={band.use}>
              <span className={styles.legendRenk} style={{ background: PROGRAM_USE_COLORS[band.use] }} aria-hidden="true" />
              {PROGRAM_USE_LABELS[band.use]}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.summaryGrid} aria-label="3D önizleme özeti">
        <div className={styles.metric}>
          <span>Kat tahmini</span>
          <strong>{mass.floorCount}</strong>
        </div>
        <div className={styles.metric}>
          <span>Yükseklik</span>
          <strong>{formatStudioNumber(mass.heightM)} m</strong>
        </div>
        <div className={styles.metric}>
          <span>Brüt inşaat</span>
          <strong>{formatStudioNumber(mass.grossConstructionAreaM2)} m²</strong>
        </div>
      </div>
    </section>
  );
}
