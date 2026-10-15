import { computeProjectEstimate } from '../hesap'

const defaults = { P: 10_000, K: 1.25, qualityLevels: { standart: 1, orta: 1, luks: 1.5 } }
const FIYAT = { m2: 150, tl: 7_000_000 }

describe('computeProjectEstimate — imarsız mod', () => {
  it('yalnız fiyatla x_max verir: 1 − (1.5M×1.25)/7M = %73 (aşağı yuvarla)', () => {
    const r = computeProjectEstimate({ daireBuyuklugu: 150, fiyat: FIYAT, defaults })
    expect(r).toMatchObject({ ok: true, mod: 'imarsiz', daireM2: 150, daireFiyatiTL: 7_000_000, xMaxYuzde: 73, yapilamaz: false, toplamDaire: null })
    if (r.ok) {
      expect(r.satirlar).toEqual([])
      expect(r.notlar.join(' ')).toMatch(/daire sayısı hesaplanamaz/)
    }
  })
  it('daire büyüklüğü verilmediyse fiyatın m²sini kullanır', () => {
    const r = computeProjectEstimate({ fiyat: FIYAT, defaults })
    expect(r).toMatchObject({ ok: true, daireM2: 150, xMaxYuzde: 73 })
  })
  it('fiyat m²si ile daire m²si farklıysa fiyatı m² başına ölçekler', () => {
    const r = computeProjectEstimate({ daireBuyuklugu: 100, fiyat: FIYAT, defaults })
    // 7M/150×100 = 4 666 667; Mi = 1M; x_max = 1 − 1.25M/4 666 667 = 0.7321
    expect(r).toMatchObject({ ok: true, daireFiyatiTL: 4_666_667, xMaxYuzde: 73 })
  })
  it('maliyet piyasa fiyatını aşıyorsa yapilamaz=true, xMaxYuzde=null (negatif yüzde gösterilmez)', () => {
    const r = computeProjectEstimate({ daireBuyuklugu: 150, birimMaliyet: 60_000, fiyat: FIYAT, defaults })
    expect(r).toMatchObject({ ok: true, yapilamaz: true, xMaxYuzde: null })
  })
})

describe('computeProjectEstimate — tam mod', () => {
  const base = { arsaAlani: 1000, emsal: 1.5, daireBuyuklugu: 100, defaults }
  it('toplam daire = floor(1000×1.5/100) = 15; verilen pay tek satır', () => {
    const r = computeProjectEstimate({ ...base, arsaSahibiPayiYuzde: 40 })
    expect(r).toMatchObject({ ok: true, mod: 'tam', toplamDaire: 15 })
    if (r.ok) {
      expect(r.satirlar).toHaveLength(1)
      expect(r.satirlar[0]).toMatchObject({ muteahhitYuzde: 60, arsaSahibiYuzde: 40, arsaSahibiDaire: 6 })
    }
  })
  it('pay verilmezse %40/45/50 senaryoları ve varsayım notu', () => {
    const r = computeProjectEstimate(base)
    if (!r.ok) throw new Error('beklenmedik')
    expect(r.satirlar.map((s) => s.arsaSahibiYuzde)).toEqual([40, 45, 50])
    expect(r.varsayimlar.join(' ')).toMatch(/%40 \/ %45 \/ %50/)
  })
  it('fiyat varsa piyasa değeri = arsa sahibi daire × daire fiyatı ve x_max de gelir', () => {
    const r = computeProjectEstimate({ ...base, arsaSahibiPayiYuzde: 40, fiyat: { m2: 100, tl: 5_000_000 } })
    if (!r.ok) throw new Error('beklenmedik')
    expect(r.satirlar[0].piyasaDegerTL).toBe(30_000_000) // 6 daire × 5M
    // Mi = 1×10000×100 = 1M; x_max = 1 − 1.25M/5M = 0.75
    expect(r.xMaxYuzde).toBe(75)
  })
  it('fiyat yoksa piyasaDegerTL ve xMax null', () => {
    const r = computeProjectEstimate({ ...base, arsaSahibiPayiYuzde: 40 })
    if (!r.ok) throw new Error('beklenmedik')
    expect(r.satirlar[0].piyasaDegerTL).toBeNull()
    expect(r.xMaxYuzde).toBeNull()
    expect(r.yapilamaz).toBe(false)
  })
  it('daire büyüklüğü hiç yoksa tam modda 100 m² varsayılır ve belirtilir', () => {
    const r = computeProjectEstimate({ arsaAlani: 1000, emsal: 1.5, arsaSahibiPayiYuzde: 40, defaults })
    if (!r.ok) throw new Error('beklenmedik')
    expect(r.daireM2).toBe(100)
    expect(r.varsayimlar.join(' ')).toMatch(/100 m²/)
  })
})

describe('computeProjectEstimate — eksik girdi', () => {
  it('ne imar ne fiyat: ok=false, eksikler adlandırılır', () => {
    const r = computeProjectEstimate({ defaults })
    expect(r).toMatchObject({ ok: false })
    if (!r.ok) expect(r.eksik).toEqual(expect.arrayContaining(['emsal', 'daireFiyati']))
  })
  it('emsal var ama arsa alanı yok ve fiyat da yok: arsaAlani eksik', () => {
    const r = computeProjectEstimate({ emsal: 1.5, defaults })
    if (r.ok) throw new Error('beklenmedik')
    expect(r.eksik).toEqual(expect.arrayContaining(['arsaAlani', 'daireFiyati']))
  })
  it('imarsız modda daire büyüklüğü ve fiyat m²si de yoksa (fiyat m2 zorunlu olduğundan) pratikte oluşmaz; fiyat m2 daima Ad verir', () => {
    expect(computeProjectEstimate({ fiyat: FIYAT, defaults }).ok).toBe(true)
  })
})
