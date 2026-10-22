import { listTurler, listVarianlar, resolveScene, yamacMumkun } from './scene'

describe('listTurler', () => {
  it('altı tür, Türkçe etiketle ve sabit sırayla', () => {
    expect(listTurler()).toEqual([
      { key: 'arsa', label: 'Arsa' },
      { key: 'tarla', label: 'Tarla' },
      { key: 'villa', label: 'Villa' },
      { key: 'ticari', label: 'Ticari' },
      { key: 'bag', label: 'Bağ-Bahçe' },
      { key: 'kat', label: 'Kat karşılığı' },
    ])
  })
})

describe('listVarianlar', () => {
  it('manifestteki varyantlar etiketli döner', () => {
    expect(listVarianlar('arsa')).toEqual([
      { key: 'agacli', label: 'Ağaçlı' },
      { key: 'agacsiz', label: 'Ağaçsız' },
    ])
    expect(listVarianlar('tarla').map((v) => v.key)).toEqual(['bugday', 'surulu', 'aycicegi'])
    expect(listVarianlar('ticari').map((v) => v.key)).toEqual(['ofis'])
  })
})

describe('yamacMumkun', () => {
  it('şehir içi türlerde (ticari, kat) yamaç yok', () => {
    expect(yamacMumkun('ticari', 'ofis')).toBe(false)
    expect(yamacMumkun('kat', 'bitmis')).toBe(false)
  })
  it('arsa/tarla/villa/bağ varyantlarında yamaç var', () => {
    expect(yamacMumkun('arsa', 'agacli')).toBe(true)
    expect(yamacMumkun('tarla', 'bugday')).toBe(true)
    expect(yamacMumkun('villa', 'modern')).toBe(true)
    expect(yamacMumkun('bag', 'zeytin')).toBe(true)
  })
})

describe('resolveScene', () => {
  it('tam eşleşme: id, görsel yolları, oran', () => {
    const s = resolveScene({ tur: 'villa', varyant: 'modern', egim: 'duz', zaman: 'gunduz' })
    expect(s.id).toBe('villa_modern_duz_gunduz')
    expect(s.egim).toBe('duz')
    expect(s.zaman).toBe('gunduz')
    expect(s.egimYedek).toBe(false)
    expect(s.src800).toBe('/dioramas/villa_modern_duz_gunduz-800.webp')
    expect(s.src1600).toBe('/dioramas/villa_modern_duz_gunduz-1600.webp')
    expect(s.aspect).toBeCloseTo(1.595, 2)
  })
  it('gece zamanı', () => {
    expect(resolveScene({ tur: 'arsa', varyant: 'agacli', egim: 'duz', zaman: 'gece' }).id).toBe('arsa_agacli_duz_gece')
  })
  it('yamaç: "yamac" tercih edilir (yamac2 değil)', () => {
    expect(resolveScene({ tur: 'arsa', varyant: 'agacli', egim: 'yamac', zaman: 'gunduz' }).id).toBe('arsa_agacli_yamac_gunduz')
  })
  it('yamaç istenip yoksa düze düşer ve egimYedek true', () => {
    const s = resolveScene({ tur: 'ticari', varyant: 'ofis', egim: 'yamac', zaman: 'gunduz' })
    expect(s.id).toBe('ticari_ofis_duz_gunduz')
    expect(s.egim).toBe('duz')
    expect(s.egimYedek).toBe(true)
  })
  it('düz istenip yalnız yamaç varsa (villa tas3) yamaca düşer', () => {
    const s = resolveScene({ tur: 'villa', varyant: 'tas3', egim: 'duz', zaman: 'gunduz' })
    expect(s.id).toBe('villa_tas3_yamac_gunduz')
    expect(s.egimYedek).toBe(true)
  })
  it('varyant verilmezse türün ilk varyantı', () => {
    expect(resolveScene({ tur: 'tarla', egim: 'duz', zaman: 'gunduz' }).id).toBe('tarla_bugday_duz_gunduz')
  })
  it('geçersiz varyant → ilk varyant', () => {
    expect(resolveScene({ tur: 'kat', varyant: 'yok', egim: 'duz', zaman: 'gece' }).id).toBe('kat_bitmis_duz_gece')
  })
  it('etiket: tür etiketi + varyant etiketi', () => {
    expect(resolveScene({ tur: 'bag', varyant: 'zeytin', egim: 'duz', zaman: 'gunduz' }).etiket).toBe('Bağ-Bahçe · Zeytin')
  })
  it('yamac2 hariç tüm 52 görsel için çözümleme kendi id\'sini döndürür', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('./manifest.json')
    let n = 0
    for (const [tur, t] of Object.entries<{ items: { id: string; varyant: string; egim: string; zaman: string }[] }>(m.types)) {
      for (const it of t.items) {
        if (it.egim === 'yamac2') continue
        const s = resolveScene({ tur: tur as never, varyant: it.varyant, egim: it.egim as never, zaman: it.zaman as never })
        expect(s.id).toBe(it.id)
        n++
      }
    }
    expect(n).toBe(52)
  })
})
