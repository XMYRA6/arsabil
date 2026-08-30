/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DegerKarti } from './DegerKarti'
import type { DegerCardDTO } from '@/lib/deger/card'

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

it('thinData → uyarı satırı', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/Sınırlı emsal verisine dayanıyor/i)).toBeInTheDocument()
})

it('oturumsuz → bulanık blok + Üye Ol linki callbackUrl ile', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="mahalleId=1&ada=142&parsel=7" />)
  const link = screen.getByRole('link', { name: /Üye Ol/i })
  expect(link).toHaveAttribute(
    'href',
    '/register?callbackUrl=' + encodeURIComponent('/deger?mahalleId=1&ada=142&parsel=7'),
  )
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
  expect(screen.queryByRole('link', { name: /Üye Ol/i })).not.toBeInTheDocument()
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
