import { renderCard } from '../renderCard'
import type { DegerCardDTO } from '@/lib/deger/card'

const base: DegerCardDTO = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45', areaSqm: 512, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 3200, floodQ100: false, status: 'ok' },
  value: { tier: 'free', insufficientData: false, basis: 'mahalle', thinData: false, freeRangeLow: 2100000, freeRangeHigh: 2800000, pricePerSqmCoarse: 4900 },
  neighborhood: { geojson: null },
  comparables: { count: 6 },
}
const URL = 'https://www.arsabil.com/deger?mahalleId=1&ada=123&parsel=45'

describe('renderCard', () => {
  it('tam veri: başlık, değer aralığı, ₺/m², risk, emsal, link, placeholder', () => {
    const t = renderCard(base, URL)
    expect(t).toContain('*Uğurlu Mah., Ortahisar / Trabzon*')
    expect(t).toContain('123/45')
    expect(t).toContain('512 m²')
    expect(t).toContain('2,1M – 2,8M ₺')
    expect(t).toContain('4.900 ₺/m²')
    expect(t).toContain('~3,2 km')
    expect(t).toContain('Taşkın (Q100): risk yok')
    expect(t).toContain('emsal ilan: 6')
    expect(t).toContain(URL)
    expect(t).toContain('Yakında:')
  })
  it('insufficientData: değer/₺m² satırı yok, açıklama var', () => {
    const t = renderCard({ ...base, value: { tier: 'free', insufficientData: true } }, URL)
    expect(t).not.toContain('Tahmini değer')
    expect(t).toContain('yeterli ilan verisi yok')
    expect(t).toContain('123/45')
    expect(t).toContain(URL)
  })
  it('thinData: değer satırına "(sınırlı veri)" eklenir', () => {
    const t = renderCard({ ...base, value: { ...base.value, thinData: true } }, URL)
    expect(t).toContain('(sınırlı veri)')
  })
  it('risk unavailable: risk satırı atlanır', () => {
    const t = renderCard({ ...base, risk: { faultDistanceM: null, floodQ100: null, status: 'unavailable' } }, URL)
    expect(t).not.toContain('Deprem')
  })
  it('faultDistanceM null ama status ok: "diri fay verisi yok"', () => {
    const t = renderCard({ ...base, risk: { faultDistanceM: null, floodQ100: true, status: 'ok' } }, URL)
    expect(t).toContain('diri fay verisi yok')
    expect(t).toContain('Taşkın (Q100): risk var')
  })
})
