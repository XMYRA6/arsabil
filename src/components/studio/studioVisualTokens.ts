import type { ProgramUse } from '@/lib/studio/types';

/**
 * Studio 3D sahnesi icin sabit gorsel anlam sozlugu (Faz 1B Task 2).
 *
 * Program rengi (Faz 2 — 2+1/3+1/dukkan karma programi) sahneye baglanana
 * kadar sahne dekoratif cok renk kullanmaz; her renk BURADA tanimli tek bir
 * anlami tasir (parsel zemini, onerilen kutle, kat bantlari). `StudioScene`
 * bu tokenlari dogrudan tuketir — renk secimi component icinde dagitilmaz.
 */
export const STUDIO_SCENE_COLORS = {
  background: '#f5f8fc',
  ground: '#eef4f9',
  gridMajor: '#b8c7d9',
  gridMinor: '#dce5ef',
  massFill: '#2b7cff',
  massEdges: '#d8e7ff',
  massWireframe: '#0f2a43',
  floorBand: '#f7c948',
} as const;

/**
 * Faz 2'de program mix (2+1/3+1/dukkan) geldiginde birim tiplerine
 * baglanacak renk slotlari — SIMDI hicbir yere baglanmiyor, yalnizca token
 * olarak ayriliyor (Faz 1B Task 2, bullet 4). Slot sayisi/anlami Faz 2
 * tasarim spec'inde kesinlesecek; burada yer tutucu olarak GENERIC
 * (program-baglaminda anlamsiz) isimlendirilir — programa ozel anlam
 * eklenmeden burada "2+1 = mavi" gibi bir karar VERILMEZ.
 */
export const STUDIO_PROGRAM_COLOR_SLOTS = [
  '#2b7cff',
  '#22c55e',
  '#f97316',
  '#a855f7',
] as const;

/**
 * Faz 2A Task 4: "Zemin ticaret, konut ve ortak alan icin token tabanli
 * renk/kenar kurallari tanimla" — burada karar VERILIR (STUDIO_PROGRAM_COLOR_SLOTS'un
 * aksine SABIT bir kullanim->renk eslemesi, siraya gore degismez). 3D sahne
 * VE Program Dagilimi legend'i AYNI bu tabloyu okur — renk secimi iki
 * yerde ayrisamaz.
 */
export const PROGRAM_USE_COLORS: Record<ProgramUse, string> = {
  // massFill (`#2b7cff`) ile AYNI DEGIL: overlay yari-saydam ustune bindigi
  // icin ana kutleyle ozdes renk secilirse gorunmez olur (canli Playwright
  // ile yakalandi — konut bandi gozle secilemiyordu).
  residential: '#8b5cf6',
  commercial: '#f97316',
  common: '#22c55e',
  parking: '#64748b',
};
