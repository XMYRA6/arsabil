import type { ProgramBand, StudioLayoutDraft, StudioPolygon, StudioWarning } from './types';

const MIN_FOOTPRINT_SCALE = 0.05;

/**
 * `scale=1`in `mass.footprint` ile AYNI boyutu temsil ettigi (Task 1
 * karari) — kimlik taslak, kullanicinin henuz hicbir ayar yapmadigi
 * baslangic durumudur. Program bantlari KOPYALANMAZ, yalnizca ID ile
 * referanslanir (bkz. `StudioLayoutDraft` tip yorumu).
 */
export function createDefaultLayoutDraft(programBands: ProgramBand[]): StudioLayoutDraft {
  return {
    footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 1, insetM: 0 },
    setback: { frontM: 0, sideM: 0, rearM: 0 },
    programBandIds: programBands.map((band) => band.id),
  };
}

/**
 * Faz 3A Task 1 — MODEL SEVIYESINDE, geometri motorundan (Task 2
 * `geometry2d.ts`) BAGIMSIZ kaba dogrulama. Konum bazli tam "parsel disina
 * tasma" kontrolu (donus + merkez ofseti dahil) Task 2/3'un gercek poligon
 * matematigine aittir; burada yalnizca olcek/alan butcesi ve referans
 * butunlugu kontrol edilir. Global Constraint: "sessizce veri degistirmez" —
 * bu yuzden TEK bir sorunda durup dönmez, TUM sorunlari toplar.
 */
export function validateLayoutDraft(
  draft: StudioLayoutDraft,
  parcelPolygon: StudioPolygon | null | undefined,
  knownProgramBands: ProgramBand[],
): StudioWarning[] {
  const warnings: StudioWarning[] = [];

  if (!parcelPolygon || parcelPolygon.points.length < 3) {
    warnings.push({
      code: 'MISSING_GEOMETRY',
      message: '2D yerleşim taslağı için kaynak etiketli parsel geometrisi gerekiyor.',
    });
    return warnings;
  }

  const { scale } = draft.footprint;
  if (scale <= 0) {
    warnings.push({
      code: 'LAYOUT_FOOTPRINT_TOO_SMALL',
      message: 'Footprint ölçeği sıfır veya negatif olamaz.',
    });
  } else if (scale < MIN_FOOTPRINT_SCALE) {
    warnings.push({
      code: 'LAYOUT_FOOTPRINT_TOO_SMALL',
      message: `Footprint ölçeği çok küçük (%${Math.round(scale * 100)}); anlamlı bir bina oturumu temsil etmiyor.`,
    });
  }

  const parcelAreaM2 = parcelPolygon.areaM2;
  if (typeof parcelAreaM2 === 'number' && parcelAreaM2 > 0 && scale > 1) {
    warnings.push({
      code: 'LAYOUT_FOOTPRINT_OUTSIDE_PARCEL',
      message: 'Footprint tahmini alanı parsel alanını aşıyor; parsel sınırının dışına taşabilir.',
    });
  }

  const knownIds = new Set(knownProgramBands.map((band) => band.id));
  const hasUnknownReference = draft.programBandIds.some((id) => !knownIds.has(id));
  if (hasUnknownReference) {
    warnings.push({
      code: 'LAYOUT_REFERENCES_UNKNOWN_PROGRAM_BAND',
      message: 'Yerleşim taslağı artık var olmayan bir program bandına referans veriyor; program dağılımını güncelle.',
    });
  }

  return warnings;
}
