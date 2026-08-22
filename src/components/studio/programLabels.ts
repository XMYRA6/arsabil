import type { ProgramUse, ResidentialUnitType } from '@/lib/studio/types';

/**
 * `ProgramMixPanel` (form) ve `StudioPreview` (3D legend) AYNI etiketleri
 * kullanir — iki yerde ayri ayri yazilirsa isim ayrisir (Faz 2A Task 4
 * bullet 4: "Legend, metin ozeti ve sahne renklerinin ayni envanterden
 * geldigini test et" ile ayni ruh).
 */
export const PROGRAM_USE_LABELS: Record<ProgramUse, string> = {
  residential: 'Konut',
  commercial: 'Ticari (Dükkan)',
  parking: 'Otopark',
  common: 'Ortak Alan',
};

export const RESIDENTIAL_TYPE_LABELS: Record<ResidentialUnitType, string> = {
  '1+1': '1+1',
  '2+1': '2+1',
  '3+1': '3+1',
  '4+1': '4+1',
  custom: 'Özel',
};
