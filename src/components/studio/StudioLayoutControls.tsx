'use client';

import { useState } from 'react';
import styles from './StudioLayoutControls.module.css';
import { formatStudioNumber } from './studioFormat';
import { calculatePolygonAreaM2 } from '@/lib/studio/parcelGeometry';
import type { BuildingMass, StudioLayoutDraft } from '@/lib/studio/types';

export type StudioLayoutControlsProps = {
  layoutDraft: StudioLayoutDraft;
  /**
   * TEK mutasyon kanali (Task 4 bullet 4: "kontrol API'sini ileride handle
   * olaylarini kabul edecek sekilde kur") — ileride bir surukle-birak
   * handle'i eklenirse o da AYNI bu callback'i cagirir, ayri bir API
   * icat edilmez.
   */
  onLayoutDraftChange: (next: StudioLayoutDraft) => void;
  mass: BuildingMass;
};

const ORIENTATION_PRESETS = [0, 90, 180, 270];

/**
 * Faz 3A Task 4 — kontrollu (surukle-birak DEGIL) yerlesim kontrolleri.
 * Gecersiz bir degisiklikte (Global Constraint: "sessizce veri
 * degistirmez") son gecerli `layoutDraft` KORUNUR — `onLayoutDraftChange`
 * cagrilmaz, yalnizca yerel bir red nedeni gosterilir.
 */
export function StudioLayoutControls({ layoutDraft, onLayoutDraftChange, mass }: StudioLayoutControlsProps) {
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const baseFootprintAreaM2 = mass.footprint.areaM2 ?? calculatePolygonAreaM2(mass.footprint.points);
  const estimatedFootprintAreaM2 = baseFootprintAreaM2 * layoutDraft.footprint.scale * layoutDraft.footprint.scale;
  const edgeCount = mass.footprint.points.length;

  const commitFootprint = (patch: Partial<StudioLayoutDraft['footprint']>) => {
    setRejectionReason(null);
    onLayoutDraftChange({ ...layoutDraft, footprint: { ...layoutDraft.footprint, ...patch } });
  };

  const handleScaleChange = (raw: string) => {
    const percent = Number(raw);
    if (!Number.isFinite(percent)) return;
    const scale = percent / 100;
    if (scale <= 0) {
      setRejectionReason('Kapsama sıfır veya negatif olamaz.');
      return;
    }
    commitFootprint({ scale });
  };

  const handleRotationChange = (raw: string) => {
    const rotationDeg = Number(raw);
    if (!Number.isFinite(rotationDeg)) {
      setRejectionReason('Yön geçerli bir açı olmalı.');
      return;
    }
    commitFootprint({ rotationDeg });
  };

  const handleSetbackChange = (key: keyof StudioLayoutDraft['setback'], label: string, raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      setRejectionReason(`${label} çekme mesafesi negatif olamaz.`);
      return;
    }
    setRejectionReason(null);
    onLayoutDraftChange({ ...layoutDraft, setback: { ...layoutDraft.setback, [key]: value } });
  };

  const addCommercialFrontage = () => {
    setRejectionReason(null);
    onLayoutDraftChange({ ...layoutDraft, commercialFrontage: { edgeIndex: 0, lengthM: 5 } });
  };

  const removeCommercialFrontage = () => {
    setRejectionReason(null);
    const { commercialFrontage: _drop, ...rest } = layoutDraft;
    onLayoutDraftChange(rest);
  };

  const handleFrontageEdgeChange = (raw: string) => {
    if (!layoutDraft.commercialFrontage) return;
    const edgeIndex = Number(raw);
    if (!Number.isFinite(edgeIndex) || edgeIndex < 0) {
      setRejectionReason('Cephe kenarı geçersiz.');
      return;
    }
    setRejectionReason(null);
    onLayoutDraftChange({ ...layoutDraft, commercialFrontage: { ...layoutDraft.commercialFrontage, edgeIndex } });
  };

  const handleFrontageLengthChange = (raw: string) => {
    if (!layoutDraft.commercialFrontage) return;
    const lengthM = Number(raw);
    if (!Number.isFinite(lengthM) || lengthM < 0) {
      setRejectionReason('Cephe uzunluğu negatif olamaz.');
      return;
    }
    setRejectionReason(null);
    onLayoutDraftChange({ ...layoutDraft, commercialFrontage: { ...layoutDraft.commercialFrontage, lengthM } });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.kontrolGrubu}>
        <label className={styles.etiket} htmlFor="layout-kapsama">
          Kapsama (%)
          <input
            id="layout-kapsama"
            aria-label="Kapsama (%)"
            type="number"
            className={styles.girdi}
            value={Math.round(layoutDraft.footprint.scale * 100)}
            onChange={(e) => handleScaleChange(e.target.value)}
          />
        </label>
        <span className={styles.etkiMetni}>Tahmini footprint alanı: {formatStudioNumber(estimatedFootprintAreaM2)} m²</span>
      </div>

      <div className={styles.kontrolGrubu}>
        <span className={styles.grupBaslik}>Yön</span>
        <div className={styles.segmentSatiri}>
          {ORIENTATION_PRESETS.map((deg) => (
            <button
              key={deg}
              type="button"
              className={layoutDraft.footprint.rotationDeg === deg ? styles.segmentBtnAktif : styles.segmentBtn}
              onClick={() => commitFootprint({ rotationDeg: deg })}
            >
              {deg}°
            </button>
          ))}
        </div>
        <label className={styles.etiket} htmlFor="layout-yon-ince">
          İnce ayar (°)
          <input
            id="layout-yon-ince"
            aria-label="İnce ayar (°)"
            type="number"
            className={styles.girdi}
            value={layoutDraft.footprint.rotationDeg}
            onChange={(e) => handleRotationChange(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.kontrolGrubu}>
        <span className={styles.grupBaslik}>Yaklaşık çekme mesafesi (m)</span>
        <label className={styles.etiket} htmlFor="layout-cekme-on">
          Ön çekme
          <input
            id="layout-cekme-on"
            aria-label="Ön çekme"
            type="number"
            className={styles.girdi}
            value={layoutDraft.setback.frontM}
            onChange={(e) => handleSetbackChange('frontM', 'Ön', e.target.value)}
          />
        </label>
        <label className={styles.etiket} htmlFor="layout-cekme-yan">
          Yan çekme
          <input
            id="layout-cekme-yan"
            aria-label="Yan çekme"
            type="number"
            className={styles.girdi}
            value={layoutDraft.setback.sideM}
            onChange={(e) => handleSetbackChange('sideM', 'Yan', e.target.value)}
          />
        </label>
        <label className={styles.etiket} htmlFor="layout-cekme-arka">
          Arka çekme
          <input
            id="layout-cekme-arka"
            aria-label="Arka çekme"
            type="number"
            className={styles.girdi}
            value={layoutDraft.setback.rearM}
            onChange={(e) => handleSetbackChange('rearM', 'Arka', e.target.value)}
          />
        </label>
      </div>

      <div className={styles.kontrolGrubu}>
        <span className={styles.grupBaslik}>Zemin ticaret cephesi</span>
        {!layoutDraft.commercialFrontage ? (
          <button type="button" className={styles.ekleBtn} onClick={addCommercialFrontage}>
            + Zemin ticaret cephesi ekle
          </button>
        ) : (
          <>
            <label className={styles.etiket} htmlFor="layout-cephe-kenar">
              Cephe kenarı
              <select
                id="layout-cephe-kenar"
                aria-label="Cephe kenarı"
                className={styles.secim}
                value={layoutDraft.commercialFrontage.edgeIndex}
                onChange={(e) => handleFrontageEdgeChange(e.target.value)}
              >
                {Array.from({ length: edgeCount }, (_, index) => (
                  <option key={index} value={index}>
                    Kenar {index + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.etiket} htmlFor="layout-cephe-uzunluk">
              Cephe uzunluğu (m)
              <input
                id="layout-cephe-uzunluk"
                aria-label="Cephe uzunluğu (m)"
                type="number"
                className={styles.girdi}
                value={layoutDraft.commercialFrontage.lengthM}
                onChange={(e) => handleFrontageLengthChange(e.target.value)}
              />
            </label>
            <button type="button" className={styles.kaldirBtn} onClick={removeCommercialFrontage}>
              Ticari cepheyi kaldır
            </button>
          </>
        )}
      </div>

      {rejectionReason && <p className={styles.redMesaji}>{rejectionReason}</p>}
    </div>
  );
}
