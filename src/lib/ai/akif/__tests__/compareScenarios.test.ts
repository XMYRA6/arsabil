import { compareContractorOffers, compareApartmentSizes } from '../gateway/compareContractorOffers'

const defaults = { P: 12000, K: 1.30, qualityLevels: { standart: 1, orta: 1.2, luks: 1.4 } }

describe('compareContractorOffers', () => {
  it('her müteahhit payı için bir satır, x = 1 - p/100', () => {
    const card = compareContractorOffers({ arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [45, 50, 55] }, defaults)
    expect(card.kind).toBe('contractor_offers')
    expect(card.rows).toHaveLength(3)
    expect(card.rows[0].arsaPayiX).toBeCloseTo(0.55)
    expect(card.rows.every(r => r.daireSatisFiyatiTL > 0)).toBe(true)
  })
  it('varsayılanlar defaultsUsed + emsalNote', () => {
    const card = compareContractorOffers({ arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [50] }, defaults)
    expect(card.defaultsUsed.join(' ')).toMatch(/varsayılan/)
    expect(card.emsalNote).toMatch(/1350|1\.350/)
  })
  it("birimMaliyet verilince defaultsUsed'ta yok", () => {
    const card = compareContractorOffers({ arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [50], birimMaliyet: 15000 }, defaults)
    expect(card.defaultsUsed.join(' ')).not.toMatch(/birim maliyet/)
  })
})
describe('compareApartmentSizes', () => {
  it('daire boyutu varyasyonu → satırlar', () => {
    const card = compareApartmentSizes({ arsaAlani: 900, emsal: 1.5, muteahhitPayi: 50, daireBuyuklukleri: [80, 100, 120] }, defaults)
    expect(card.rows.map(r => r.label)).toEqual(['80 m²', '100 m²', '120 m²'])
  })
})
