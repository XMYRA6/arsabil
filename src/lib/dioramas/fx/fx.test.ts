import fs from 'fs'
import path from 'path'
import { getFx } from './fx'

describe('getFx', () => {
  it('villa gündüz: 4 ağaç, su noktaları, hava varyantları', () => {
    const fx = getFx('villa_modern_duz_gunduz')
    expect(fx.trees).toHaveLength(4)
    expect(fx.water.length).toBeGreaterThan(5)
    expect(fx.surface.length).toBeGreaterThan(50)
    expect(fx.weather).toEqual({
      snow: '/dioramas/weather/villa_modern_duz_gunduz-snow.webp',
      wet: '/dioramas/weather/villa_modern_duz_gunduz-wet.webp',
    })
    expect(fx.crop).toBeNull()
  })
  it('tarla ve bağ: ürün maskesi var', () => {
    expect(getFx('tarla_bugday_duz_gece').crop).toBe('/dioramas/weather/tarla_bugday_duz_gece-crop.webp')
    expect(getFx('bag_asma_duz_gunduz').crop).toBe('/dioramas/weather/bag_asma_duz_gunduz-crop.webp')
  })
  it('gece sahnelerinde su parıltısı yok, ışık noktaları var', () => {
    const fx = getFx('villa_modern_duz_gece')
    expect(fx.glow.length).toBeGreaterThan(5)
  })
  it('verisi olmayan sahne (ör. yamaç) boş katman döner, hata vermez', () => {
    const fx = getFx('arsa_agacli_yamac_gunduz')
    expect(fx.trees).toEqual([])
    expect(fx.weather).toBeNull()
    expect(fx.crop).toBeNull()
  })
  it('döndürülen tüm hava ve ürün dosyaları public altında gerçekten var', () => {
    for (const t of ['arsa_agacli', 'tarla_bugday', 'villa_modern', 'ticari_ofis', 'bag_asma', 'kat_bitmis']) {
      for (const z of ['gunduz', 'gece']) {
        const fx = getFx(`${t}_duz_${z}`)
        expect(fx.weather).not.toBeNull()
        for (const p of [fx.weather!.snow, fx.weather!.wet, fx.crop].filter(Boolean) as string[]) {
          expect(fs.existsSync(path.join(process.cwd(), 'public', p))).toBe(true)
        }
      }
    }
  })
  it('ağaç koordinatları 0-1 aralığında', () => {
    for (const t of ['arsa_agacli', 'villa_modern', 'ticari_ofis', 'kat_bitmis']) {
      for (const tree of getFx(`${t}_duz_gunduz`).trees) {
        for (const v of [...tree.c, ...tree.r, ...tree.b]) {
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})
