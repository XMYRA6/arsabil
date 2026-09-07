/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DegerKarti } from './DegerKarti'
import type { DegerCardDTO } from '@/lib/deger/card'

// DegerMiniMap'i ve EmsalMap lazy import'unu mock'la ki DegerKarti testi leaflet'e girmesin.
jest.mock('./DegerMiniMap', () => ({ DegerMiniMap: () => <div data-testid="mini-map" /> }))
jest.mock('next/dynamic', () => () => () => <div data-testid="emsal-map" />)
jest.mock('@/components/charts/PriceTrendChart', () => ({ PriceTrendChart: () => <div data-testid="trend-chart" /> }))

const baseCard: DegerCardDTO = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '142', parsel: '7', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 1800, floodQ100: false, status: 'ok' },
  value: {
    tier: 'free',
    insufficientData: false,
    basis: 'ilce',
    thinData: true,
    freeRangeLow: 750000,
    freeRangeHigh: 1250000,
    pricePerSqmCoarse: 2000,
  },
  neighborhood: { geojson: null },
  comparables: { count: 0 },
}

const memberValue = {
  tier: 'member' as const,
  insufficientData: false,
  basis: 'ilce' as const,
  thinData: false,
  freeRangeLow: 750000,
  freeRangeHigh: 1250000,
  pricePerSqmCoarse: 2000,
  estimate: 1000000,
  memberRangeLow: 900000,
  memberRangeHigh: 1200000,
  confidence: 'orta' as const,
  pricePerSqm: { mahalle: 2200, ilce: 2000 },
  sampleCount: { mahalle: 6, ilce: 20 },
  feasibilityHref: '/hesapla',
}

it('ücretsiz kısım her zaman render olur', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="mahalleId=1&ada=142&parsel=7" />)
  expect(screen.getByText(/Tahmini Değer Aralığı/i)).toBeInTheDocument()
  expect(screen.getByText(/750\.000/)).toBeInTheDocument()
  expect(screen.getByText(/Faya 1,8 km/)).toBeInTheDocument()
})

it('kalıcı v1 sorumluluk reddi her zaman görünür', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  expect(
    screen.getByText(/v1 tahmini; imar, cephe, eğim gibi parsel özellikleri hariç/i),
  ).toBeInTheDocument()
})

it('fay menzil dışında (faultDistanceM null, status ok) → fay çipi chipOk', () => {
  const card: DegerCardDTO = { ...baseCard, risk: { faultDistanceM: null, floodQ100: false, status: 'ok' } }
  render(<DegerKarti card={card} isLoggedIn={false} parcelQuery="q=1" />)
  const chip = screen.getByText(/Faya 25 km/i)
  expect(chip.className).toMatch(/chipOk/)
  expect(chip.className).not.toMatch(/chipWarn/)
})

it('fay yakın (faultDistanceM sayı) → fay çipi chipWarn', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/Faya 1,8 km/).className).toMatch(/chipWarn/)
})

it('thinData → uyarı satırı', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/Sınırlı emsal verisine dayanıyor/i)).toBeInTheDocument()
})

it('oturumsuz → bulanık blok + Üye Ol linki callbackUrl ile', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="mahalleId=1&ada=142&parsel=7" />)
  // Net değer + demografi iki ayrı "Üye Ol" CTA'sı üretir; ikisi de doğru callbackUrl taşımalı.
  const links = screen.getAllByRole('link', { name: /Üye Ol/i })
  expect(links.length).toBeGreaterThanOrEqual(1)
  for (const link of links) {
    expect(link).toHaveAttribute(
      'href',
      '/register?callbackUrl=' + encodeURIComponent('/deger?mahalleId=1&ada=142&parsel=7'),
    )
  }
  expect(screen.queryByText(/Net Tahmini Değer/i)).not.toBeInTheDocument()
})

it('oturumlu → net değer, kırılım, fizibilite linki', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue }} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByText(/Net Tahmini Değer/i)).toBeInTheDocument()
  expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument()
  expect(screen.getByText(/2\.200/)).toBeInTheDocument() // mahalle ₺/m²
  expect(screen.getByRole('link', { name: /fizibilite hesapla/i })).toHaveAttribute('href', '/hesapla')
  expect(screen.queryByRole('link', { name: /Üye Ol/i })).not.toBeInTheDocument()
})

it('insufficientData → yeterli veri yok metni, üye kısmı yok, risk yine görünür', () => {
  const card: DegerCardDTO = { ...baseCard, value: { tier: 'free', insufficientData: true } }
  render(<DegerKarti card={card} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/yeterli emsal verisi yok/i)).toBeInTheDocument()
  expect(screen.queryByText(/Tahmini Değer Aralığı/i)).not.toBeInTheDocument()
  expect(screen.getByText(/Faya 1,8 km/)).toBeInTheDocument()
  // Değerleme (net değer) üye kırılımı gösterilmez; demografi teaser'ı ayrı bir bloktur.
  expect(screen.queryByText(/Net değer \+ mahalle kırılımı/i)).not.toBeInTheDocument()
})

it('risk unavailable → tek çip "risk verisi alınamadı"', () => {
  const card: DegerCardDTO = { ...baseCard, risk: { faultDistanceM: null, floodQ100: null, status: 'unavailable' } }
  render(<DegerKarti card={card} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/risk verisi alınamadı/i)).toBeInTheDocument()
  expect(screen.queryByText(/Faya/)).not.toBeInTheDocument()
})

it('yakında metni her zaman var', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/Yakında/i)).toBeInTheDocument()
})

it('üye: emsal listesi render (₺/m², link, ~ approx)', () => {
  const card: DegerCardDTO = { ...baseCard, comparables: { count: 2, items: [
    { pricePerSqm: 2500, areaSqm: 480, price: 1200000, distanceM: 1200, approxDistance: true, lat: 41, lng: 39.7, listedAt: '2026-08-21T00:00:00.000Z', source: 'emlakjet', sourceUrl: 'https://emlakjet.com/ilan/c1' },
  ] } }
  render(<DegerKarti card={card} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByText(/Bölgedeki Emsal İlanlar \(2\)/)).toBeInTheDocument()
  expect(screen.getByText(/2\.500 ₺\/m²/)).toBeInTheDocument()
  expect(screen.getByText(/~1,2 km/)).toBeInTheDocument()
  const link = screen.getByRole('link', { name: /Emlakjet/ })
  expect(link).toHaveAttribute('href', 'https://emlakjet.com/ilan/c1')
  expect(link).toHaveAttribute('rel', 'noopener nofollow')
})

it('anonim: emsal bulanık + count teaser, liste yok', () => {
  const card: DegerCardDTO = { ...baseCard, comparables: { count: 5 } }
  render(<DegerKarti card={card} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/5 emsal ilan/)).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Emlakjet/ })).not.toBeInTheDocument()
})

it('üye + count 0 → "bulunamadı" mesajı', () => {
  render(<DegerKarti card={{ ...baseCard, comparables: { count: 0 } }} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByText(/aktif emsal ilan bulunamadı/i)).toBeInTheDocument()
})

it('neighborhood.geojson varsa mini-harita render', () => {
  render(<DegerKarti card={{ ...baseCard, neighborhood: { geojson: { type: 'MultiPolygon', coordinates: [] } } }} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByTestId('mini-map')).toBeInTheDocument()
})

it('"haritada gör" → EmsalMap lazy mount', () => {
  const card: DegerCardDTO = { ...baseCard, comparables: { count: 1, items: [{ pricePerSqm: 2500, areaSqm: 480, price: 1200000, distanceM: 900, approxDistance: true, lat: 41, lng: 39.7, listedAt: null, source: 'emlakjet', sourceUrl: 'https://emlakjet.com/ilan/c1' }] } }
  render(<DegerKarti card={card} isLoggedIn parcelQuery="q=1" />)
  fireEvent.click(screen.getByRole('button', { name: /haritada gör/i }))
  expect(screen.getByTestId('emsal-map')).toBeInTheDocument()
})

it('".soon" artık "Emsal ilanlar" içermiyor', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/Yakında/)).not.toHaveTextContent('Emsal ilanlar')
})

it('üye + priceTrend → trend bloğu render', () => {
  const card: DegerCardDTO = { ...baseCard, priceTrend: {
    basis: 'il' as const,
    points: [{ month: '2026-06', medianPricePerSqm: 1000, sampleCount: 10 }],
    changePct3m: 5, thinTrend: false,
  } }
  render(<DegerKarti card={card} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByText(/Bölge Fiyat Eğilimi/)).toBeInTheDocument()
  expect(screen.getByText(/İl geneli/)).toBeInTheDocument()
  expect(screen.getByTestId('trend-chart')).toBeInTheDocument()
})

it('priceTrend yoksa trend bloğu YOK', () => {
  render(<DegerKarti card={baseCard} isLoggedIn parcelQuery="q=1" />)
  expect(screen.queryByText(/Bölge Fiyat Eğilimi/)).not.toBeInTheDocument()
})

it('anonim + priceTrend (imkânsız ama) → trend bloğu YOK', () => {
  const card: DegerCardDTO = { ...baseCard, priceTrend: { basis: 'il' as const, points: [], changePct3m: null, thinTrend: true } }
  render(<DegerKarti card={card} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.queryByText(/Bölge Fiyat Eğilimi/)).not.toBeInTheDocument()
})

it('.soon artık "Fiyat trendi" içermiyor, "Uzman görüşü" içeriyor', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  const soon = screen.getByText(/Yakında/)
  expect(soon).not.toHaveTextContent('Fiyat trendi')
  expect(soon).toHaveTextContent('Uzman görüşü')
})

const demographics = {
  dataYear: 2024,
  population: 320000,
  populationGrowthPerMille: 14,
  medianAge: 36,
  avgHouseholdSize: 3.1,
  summary: 'Bu ilçede nüfus belirgin şekilde büyüyor — konut talebi güçlü.',
}

it('üye + demographics: özet cümle + metrikler + il-geneli etiketi render edilir', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics }} isLoggedIn={true} parcelQuery="x" />)
  expect(screen.getByText(/konut talebi güçlü/)).toBeInTheDocument()
  expect(screen.getByText(/320\.000/)).toBeInTheDocument()
  expect(screen.getByText(/\+14/)).toBeInTheDocument()            // ‰ işaretli artış
  expect(screen.getAllByText(/il geneli/i).length).toBeGreaterThanOrEqual(1)  // medyan yaş/hane etiketi
  expect(screen.getByText(/Kaynak: TÜİK 2024/)).toBeInTheDocument()
})

it('anonim + demographics undefined: blur overlay + Üye Ol, gerçek sayı yok', () => {
  render(<DegerKarti card={{ ...baseCard }} isLoggedIn={false} parcelQuery="x" />)
  expect(screen.getByText(/Bölge Demografisi/)).toBeInTheDocument()
  expect(screen.queryByText(/320\.000/)).not.toBeInTheDocument()
})

it('demografi bloğu hiçbir fetch tetiklemez', () => {
  // jsdom/Node ortamında global.fetch tanımsız; spyOn yerine mock atayıp geri alıyoruz.
  const fetchMock = jest.fn()
  const orig = (global as { fetch?: unknown }).fetch
  ;(global as { fetch?: unknown }).fetch = fetchMock
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics }} isLoggedIn={true} parcelQuery="x" />)
  expect(fetchMock).not.toHaveBeenCalled()
  ;(global as { fetch?: unknown }).fetch = orig
})

it('summary null → cümle yok ama metrikler var', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics: { ...demographics, summary: null } }} isLoggedIn={true} parcelQuery="x" />)
  expect(screen.getByText(/320\.000/)).toBeInTheDocument()
})

it('null metrik satırı render edilmez', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics: { ...demographics, avgHouseholdSize: null } }} isLoggedIn={true} parcelQuery="x" />)
  expect(screen.queryByText(/Ortalama hane/)).not.toBeInTheDocument()
})

it('üye + demographics ama tüm metrikler null → blok hiç render edilmez', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics: { dataYear: 2024, population: null, populationGrowthPerMille: null, medianAge: null, avgHouseholdSize: null, summary: null } }} isLoggedIn={true} parcelQuery="x" />)
  expect(screen.queryByText(/Bölge Demografisi/)).not.toBeInTheDocument()
})
