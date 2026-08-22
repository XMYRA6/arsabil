'use client';

import styles from './ProgramMixPanel.module.css';
import { summarizeProgramMix } from '@/lib/studio/programMix';
import { deriveProgramBands } from '@/lib/studio/programInventory';
import { formatStudioNumber } from './studioFormat';
import { PROGRAM_USE_LABELS, RESIDENTIAL_TYPE_LABELS } from './programLabels';
import type { FloorRange, ProgramMixItem, ProgramUse, ResidentialUnitType } from '@/lib/studio/types';

export type ProgramMixPanelProps = {
  items: ProgramMixItem[];
  onItemsChange: (items: ProgramMixItem[]) => void;
  /** `BuildingMass.grossConstructionAreaM2` — `null` kütle henüz hesaplanmadıysa. */
  availableAreaM2: number | null;
  /** `mass !== null` — false iken sayısal özet yine çalışır, yalnızca 3D
   * kat bandı görünümü pasif duruma geçer (Task 3 bullet 5). */
  hasGeometry: boolean;
  /** Faz 3A Task 5 bullet 3 — 2D yerleşim taslağı (footprint kapsama/inset)
   * varsayılan kimlik durumundan sapmışsa true: program alanı/kapasitesi
   * artık taslağın gösterdiği footprint'i yansıtmıyor olabilir. KARAR
   * YOLUNU KAPATMAZ (form yine kullanılabilir), yalnızca görünür bir not
   * ekler (Global Constraint: "sessizce veri değiştirmez"). */
  layoutRequiresRecalculation?: boolean;
};

let itemSeq = 0;
function createBlankItem(): ProgramMixItem {
  itemSeq += 1;
  return {
    id: `program-item-${Date.now()}-${itemSeq}`,
    use: 'residential',
    residentialType: '2+1',
    unitCount: 1,
    unitAreaM2: 85,
  };
}

/**
 * Program Dağılımı operasyon ekranı (Faz 2A Task 3). Kira/satış değeri
 * BURADA istenmez (Faz 2B'ye ait, Global Constraint) — yalnızca adet/alan/
 * kat aralığı. Hesaplama `summarizeProgramMix`/`deriveProgramBands`den
 * gelir; bu bileşen HİÇBİR şey hesaplamaz, yalnızca gösterir/düzenletir.
 */
export function ProgramMixPanel({ items, onItemsChange, availableAreaM2, hasGeometry, layoutRequiresRecalculation }: ProgramMixPanelProps) {
  const summary = summarizeProgramMix(items, availableAreaM2 ?? 0);
  const bands = deriveProgramBands(items);

  const updateItem = (id: string, patch: Partial<ProgramMixItem>) => {
    onItemsChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const updateFloorRange = (id: string, key: keyof FloorRange, rawValue: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (rawValue === '') {
      updateItem(id, { floorRange: undefined });
      return;
    }
    const current = item.floorRange ?? { startFloor: 0, endFloor: 0 };
    updateItem(id, { floorRange: { ...current, [key]: Number(rawValue) } });
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const addItem = () => {
    onItemsChange([...items, createBlankItem()]);
  };

  return (
    <section className={styles.panel} aria-label="Program Dağılımı">
      {layoutRequiresRecalculation && (
        <p className={styles.yenidenHesaplamaNotu}>
          2D yerleşim taslağı footprint alanını değiştirdi; program dağılımı ve teklif hesapları bu
          değişikliği henüz yansıtmıyor — yeniden hesaplama gerekli.
        </p>
      )}

      <div className={styles.potansiyel}>
        <span className={styles.potansiyelEtiket}>Toplam potansiyel</span>
        {availableAreaM2 !== null ? (
          <strong className={styles.potansiyelDeger}>{formatStudioNumber(availableAreaM2)} m²</strong>
        ) : (
          <p className={styles.potansiyelBekleniyor}>Kütle hesaplanınca aktifleşir.</p>
        )}
      </div>

      <div
        role="group"
        aria-label="Kat Bantları"
        aria-disabled={!hasGeometry}
        className={`${styles.bantlar} ${!hasGeometry ? styles.bantlarPasif : ''}`}
      >
        <h3 className={styles.bolumBaslik}>Kat Bantları</h3>
        {bands.length === 0 ? (
          <p className={styles.bantYok}>Henüz kat aralığı atanmış kalem yok.</p>
        ) : (
          <ul className={styles.bantListesi}>
            {bands.map((band) => (
              <li key={band.id}>
                {PROGRAM_USE_LABELS[band.use]} · kat {band.floorRange.startFloor}-{band.floorRange.endFloor} · {formatStudioNumber(band.areaM2)} m²
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.envanter}>
        <h3 className={styles.bolumBaslik}>Birim Envanteri</h3>
        {items.map((item) => (
          <div
            key={item.id}
            data-testid={`program-item-${item.id}`}
            className={`${styles.satir} ${item.use === 'commercial' ? styles.satirZeminDukkan : ''}`}
          >
            {item.use === 'commercial' && <span className={styles.zeminRozeti}>Zemin Dükkan</span>}

            <select
              aria-label="Kullanım"
              className={styles.secim}
              value={item.use}
              onChange={(e) => {
                const use = e.target.value as ProgramUse;
                updateItem(item.id, { use, residentialType: use === 'residential' ? (item.residentialType ?? '2+1') : undefined });
              }}
            >
              {Object.entries(PROGRAM_USE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {item.use === 'residential' && (
              <select
                aria-label="Daire tipi"
                className={styles.secim}
                value={item.residentialType ?? '2+1'}
                onChange={(e) => updateItem(item.id, { residentialType: e.target.value as ResidentialUnitType })}
              >
                {Object.entries(RESIDENTIAL_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}

            <label className={styles.alanEtiket}>
              Adet
              <input
                type="number"
                aria-label="Adet"
                className={styles.sayiGirdi}
                value={item.unitCount}
                onChange={(e) => updateItem(item.id, { unitCount: Number(e.target.value), manualOverride: true })}
              />
            </label>

            <label className={styles.alanEtiket}>
              Birim alan (m²)
              <input
                type="number"
                aria-label="Birim alan (m²)"
                className={styles.sayiGirdi}
                value={item.unitAreaM2}
                onChange={(e) => updateItem(item.id, { unitAreaM2: Number(e.target.value) })}
              />
            </label>

            <label className={styles.alanEtiket}>
              Başlangıç kat
              <input
                type="number"
                aria-label="Başlangıç kat"
                className={styles.sayiGirdi}
                value={item.floorRange?.startFloor ?? ''}
                onChange={(e) => updateFloorRange(item.id, 'startFloor', e.target.value)}
              />
            </label>

            <label className={styles.alanEtiket}>
              Bitiş kat
              <input
                type="number"
                aria-label="Bitiş kat"
                className={styles.sayiGirdi}
                value={item.floorRange?.endFloor ?? ''}
                onChange={(e) => updateFloorRange(item.id, 'endFloor', e.target.value)}
              />
            </label>

            {item.manualOverride && <span className={styles.elleRozeti}>Elle girildi</span>}

            <button type="button" aria-label="Kaldır" className={styles.kaldirBtn} onClick={() => removeItem(item.id)}>
              Kaldır
            </button>
          </div>
        ))}

        <button type="button" className={styles.ekleBtn} onClick={addItem}>
          + Kalem Ekle
        </button>
      </div>

      <div className={styles.ozet}>
        <div className={styles.ozetKutu}>
          <span>Tahsis edilen</span>
          <strong>{formatStudioNumber(summary.totalAllocatedAreaM2)} m²</strong>
        </div>
        <div className={styles.ozetKutu}>
          <span>Kalan</span>
          <strong>{formatStudioNumber(summary.remainingAreaM2)} m²</strong>
        </div>
        <div className={styles.ozetKutu}>
          <span>Satılabilir</span>
          <strong>{formatStudioNumber(summary.sellableAreaM2)} m²</strong>
        </div>
      </div>

      {summary.warnings.length > 0 && (
        <ul className={styles.uyarilar} aria-label="Varsayımlar ve uyarılar">
          {summary.warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`}>{warning.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
