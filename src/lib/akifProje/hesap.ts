// Akif-5c Aşama C — proje hesabı (saf). Motor çekirdeğine DOKUNMAZ:
// tam mod mevcut compareContractorOffers'ı, x_max ise motorun Pmarket girdisini kullanır.
// `Mi = L·P·Ad` ve `Pmarket` DAİRE BAŞINA değerlerdir (engine_v2.ts), bu yüzden
// x_max daire sayısı bilinmeden de hesaplanır (imarsız mod).

import { CalculatorEngineV2 } from '@/lib/calculator/engine_v2'
import { compareContractorOffers } from '@/lib/ai/akif/gateway/compareContractorOffers'
import { buildScenarioEngineInput } from '@/lib/ai/akif/gateway/scenarioEngine'
import type { EngineDefaults } from '@/lib/ai/akif/gateway/engineDefaults'

export interface EstimateInput {
  arsaAlani?: number
  emsal?: number
  arsaSahibiPayiYuzde?: number
  daireBuyuklugu?: number
  birimMaliyet?: number
  kaliteSinifi?: 'standart' | 'orta' | 'luks'
  fiyat?: { m2: number; tl: number }
  defaults: EngineDefaults
}

export interface EstimateRow {
  muteahhitYuzde: number
  arsaSahibiYuzde: number
  arsaSahibiDaire: number | null
  arsaSahibiDegerTL: number | null
  piyasaDegerTL: number | null
  /** true: bu pay müteahhidin verebileceği üst sınırı (x_max) aşıyor veya yapılamaz → bu fiyat/maliyette uygulanabilir değil */
  asiyor: boolean
}

export type EstimateResult =
  | {
      ok: true
      mod: 'tam' | 'imarsiz'
      daireM2: number
      daireFiyatiTL: number | null
      xMaxYuzde: number | null
      yapilamaz: boolean
      toplamDaire: number | null
      satirlar: EstimateRow[]
      varsayimlar: string[]
      notlar: string[]
    }
  | { ok: false; eksik: string[] }

const DEFAULT_SHARES = [60, 55, 50] // müteahhit %

function computeXMax(i: EstimateInput, ad: number, pmarket: number): number {
  const input = buildScenarioEngineInput({
    x: 0.5,
    apartmentSize: ad,
    totalApartments: 0,
    birimMaliyet: i.birimMaliyet,
    kaliteSinifi: i.kaliteSinifi,
    arsaAlani: i.arsaAlani ?? 1000,
    defaults: i.defaults,
  })
  return CalculatorEngineV2.calculate({ ...input, Pmarket: pmarket }).x_max as number
}

export function computeProjectEstimate(i: EstimateInput): EstimateResult {
  const tam = i.arsaAlani !== undefined && i.emsal !== undefined
  const fiyat = i.fiyat

  if (!tam && !fiyat) {
    const eksik: string[] = []
    if (i.arsaAlani === undefined) eksik.push('arsaAlani')
    if (i.emsal === undefined) eksik.push('emsal')
    eksik.push('daireFiyati')
    return { ok: false, eksik }
  }

  const varsayimlar: string[] = []
  const notlar: string[] = []

  let ad = i.daireBuyuklugu ?? fiyat?.m2
  if (ad === undefined) {
    ad = 100
    varsayimlar.push('ortalama daire = 100 m² (varsayılan)')
  }

  if (i.daireBuyuklugu === undefined && fiyat) varsayimlar.push('daire büyüklüğü = fiyat m²si (' + ad + ' m²)')
  if (i.birimMaliyet === undefined) varsayimlar.push('birim maliyet = ' + i.defaults.P + ' TL/m² (varsayılan)')
  if (i.kaliteSinifi === undefined) varsayimlar.push('kalite = orta (varsayılan)')
  varsayimlar.push('Kâr katsayısı = ' + i.defaults.K)

  const daireFiyatiTL = fiyat ? Math.round((fiyat.tl / fiyat.m2) * ad) : null

  let xMaxYuzde: number | null = null
  let yapilamaz = false
  if (daireFiyatiTL !== null) {
    const xMax = computeXMax(i, ad, daireFiyatiTL)
    if (Number.isFinite(xMax)) {
      // %1'in altındaki tavan ("en fazla %0") anlamsızdır: yapılamaz say.
      if (xMax <= 0 || Math.floor(xMax * 100) < 1) yapilamaz = true
      else xMaxYuzde = Math.floor(xMax * 100)
    }
  }

  if (!tam) {
    const neden =
      i.arsaAlani === undefined && i.emsal !== undefined
        ? 'Arsa alanı'
        : i.emsal === undefined && i.arsaAlani !== undefined
          ? 'Emsal'
          : 'İmar'
    notlar.push(neden + ' bilinmediği için daire sayısı hesaplanamaz; yalnız arsa payı üst sınırı verilir')
    return { ok: true, mod: 'imarsiz', daireM2: ad, daireFiyatiTL, xMaxYuzde, yapilamaz, toplamDaire: null, satirlar: [], varsayimlar, notlar }
  }

  const arsaAlani = i.arsaAlani as number
  const emsal = i.emsal as number
  const muteahhitPaylari =
    i.arsaSahibiPayiYuzde !== undefined ? [100 - i.arsaSahibiPayiYuzde] : DEFAULT_SHARES
  if (i.arsaSahibiPayiYuzde === undefined) varsayimlar.push('arsa sahibi payı verilmedi; %40 / %45 / %50 senaryoları')

  const card = compareContractorOffers(
    { arsaAlani, emsal, muteahhitPaylari, daireBuyuklugu: ad, birimMaliyet: i.birimMaliyet, kaliteSinifi: i.kaliteSinifi },
    i.defaults,
  )
  const satirlar: EstimateRow[] = card.rows.map((r, idx) => {
    const ham = r.arsaSahibiDaireSayisi
    const daire = ham === null ? null : Math.round(ham * 10) / 10
    return {
      muteahhitYuzde: muteahhitPaylari[idx],
      arsaSahibiYuzde: 100 - muteahhitPaylari[idx],
      arsaSahibiDaire: daire,
      arsaSahibiDegerTL: r.arsaSahibiDegeriTL === null ? null : Math.round(r.arsaSahibiDegeriTL),
      piyasaDegerTL: ham !== null && daireFiyatiTL !== null ? Math.round(ham * daireFiyatiTL) : null,
      asiyor: yapilamaz || (xMaxYuzde !== null && 100 - muteahhitPaylari[idx] > xMaxYuzde),
    }
  })
  // card.defaultsUsed: birim maliyet / kalite varsayımları (daire m² zaten yukarıda yönetildi).
  for (const m of [...card.defaultsUsed.filter((d) => !d.startsWith('ortalama daire')), ...card.assumptions]) {
    if (!varsayimlar.includes(m)) varsayimlar.push(m)
  }

  return {
    ok: true,
    mod: 'tam',
    daireM2: ad,
    daireFiyatiTL,
    xMaxYuzde,
    yapilamaz,
    toplamDaire: Math.floor((arsaAlani * emsal) / ad),
    satirlar,
    varsayimlar,
    notlar: [card.emsalNote],
  }
}
