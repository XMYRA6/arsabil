/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const replaceMock = jest.fn()
let searchParamsValue = new URLSearchParams('')
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: jest.fn() }),
  useSearchParams: () => searchParamsValue,
}))
jest.mock('@/components/listing-wizard/ManualParcelEntryForm', () => ({
  ManualParcelEntryForm: ({
    onLocationFound,
  }: {
    onLocationFound: (lat: number, lng: number, ref: unknown, exactParcel?: unknown) => void
  }) => (
    <>
      <button
        onClick={() =>
          onLocationFound(41.0, 39.7, { il: 'T', ilce: 'O', mahalle: 'U', ada: '142', parsel: '7' }, { adaNo: '142' })
        }
      >
        manuel-bul
      </button>
      <button onClick={() => onLocationFound(41.0, 39.7, { il: 'T', ilce: 'O', mahalle: 'U', ada: '142', parsel: '7' })}>
        manuel-bul-yaklasik
      </button>
      <button
        onClick={() =>
          onLocationFound(42.0, 40.0, { il: 'T', ilce: 'O', mahalle: 'M', ada: '9', parsel: '9' }, { adaNo: '9' })
        }
      >
        manuel-bul-2
      </button>
    </>
  ),
}))
jest.mock('@/components/listing-wizard/ParcelPicker', () => ({
  ParcelPicker: () => <div>harita-picker</div>,
}))
// DegerKarti alt bileşenleri leaflet'e girmesin (component testlerindeki desen).
jest.mock('@/components/deger/DegerMiniMap', () => ({ DegerMiniMap: () => <div data-testid="mini-map" /> }))
jest.mock('next/dynamic', () => () => () => <div data-testid="emsal-map" />)

import DegerPage from './page'

const CARD = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '142', parsel: '7', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 1800, floodQ100: false, status: 'ok' },
  value: { tier: 'free', insufficientData: false, basis: 'ilce', thinData: false, freeRangeLow: 750000, freeRangeHigh: 1250000, pricePerSqmCoarse: 2000 },
  neighborhood: { geojson: null },
  comparables: { count: 0 },
}

beforeEach(() => {
  replaceMock.mockReset()
  searchParamsValue = new URLSearchParams('')
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => CARD }) as jest.Mock
})

it('ada/parsel sekmesi: parsel çözülünce kart görünür + URL güncellenir', async () => {
  render(<DegerPage />)
  fireEvent.click(screen.getByText('manuel-bul'))
  await waitFor(() => expect(screen.getByText(/Tahmini Değer Aralığı/i)).toBeInTheDocument())
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/deger/kart?lat=41&lng=39.7')
  expect(replaceMock).toHaveBeenCalledWith('/deger?lat=41&lng=39.7')
})

it('ada/parsel TKGM ile doğrulanmadıysa (4. arg yok) kart üretilmez, hata gösterilir', async () => {
  render(<DegerPage />)
  fireEvent.click(screen.getByText('manuel-bul-yaklasik'))
  await waitFor(() =>
    expect(screen.getByText(/Bu ada\/parsel için TKGM kaydı bulunamadı/i)).toBeInTheDocument(),
  )
  expect(global.fetch).not.toHaveBeenCalled()
  expect(screen.queryByText(/Tahmini Değer Aralığı/i)).not.toBeInTheDocument()
})

it('sekme değiştirince harita bileşeni görünür', () => {
  render(<DegerPage />)
  fireEvent.click(screen.getByRole('tab', { name: /Haritadan/i }))
  expect(screen.getByText('harita-picker')).toBeInTheDocument()
})

it('fetch reject → bağlantı hatası mesajı', async () => {
  ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))
  render(<DegerPage />)
  fireEvent.click(screen.getByText('manuel-bul'))
  await waitFor(() => expect(screen.getByText(/Bağlantı hatası, tekrar deneyin/i)).toBeInTheDocument())
})

it('404 → parsel bulunamadı mesajı', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'parcel_not_found' }) })
  render(<DegerPage />)
  fireEvent.click(screen.getByText('manuel-bul'))
  await waitFor(() => expect(screen.getByText(/Parsel bulunamadı/i)).toBeInTheDocument())
})

it('parsel değişince DegerKarti remount olur — aç-kapa state ve mini-harita sıfırlanır', async () => {
  const mkItems = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      pricePerSqm: 2500, areaSqm: 480, price: 1200000, distanceM: 900, approxDistance: true,
      lat: 41, lng: 39.7, listedAt: null, source: 'emlakjet', sourceUrl: `https://emlakjet.com/ilan/c${i}`,
    }))
  const cardA = { ...CARD, value: { ...CARD.value, tier: 'member' }, comparables: { count: 1, items: mkItems(1) } }
  const cardB = {
    ...CARD,
    parcel: { ...CARD.parcel, mahalle: 'Merkezköy' },
    value: { ...CARD.value, tier: 'member' },
    comparables: { count: 2, items: mkItems(2) },
  }
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => cardA })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => cardB })

  render(<DegerPage />)
  fireEvent.click(screen.getByText('manuel-bul'))
  await waitFor(() => expect(screen.getByText(/Bölgedeki Emsal İlanlar \(1\)/)).toBeInTheDocument())

  // A parselinde emsal haritasını aç
  fireEvent.click(screen.getByRole('button', { name: /haritada gör/i }))
  expect(screen.getByTestId('emsal-map')).toBeInTheDocument()

  // İkinci parsel (farklı lat/lng → farklı parcelQuery → key değişir)
  fireEvent.click(screen.getByText('manuel-bul-2'))
  await waitFor(() => expect(screen.getByText(/Merkezköy/)).toBeInTheDocument())
  expect(screen.getByText(/Bölgedeki Emsal İlanlar \(2\)/)).toBeInTheDocument()
  expect(screen.queryByText(/Uğurlu/)).not.toBeInTheDocument()
  // key={parcelQuery}: yeni parsel = taze DegerKarti alt ağacı → showMap=false, EmsalMap kapalı.
  // key olmadan showMap true kalır ve B'nin item'ları olduğu için harita açık kalırdı.
  expect(screen.queryByTestId('emsal-map')).not.toBeInTheDocument()
})

it('?mahalleId&ada&parsel ile açılınca kartı otomatik getirir', async () => {
  searchParamsValue = new URLSearchParams('mahalleId=5000&ada=12&parsel=3')
  render(<DegerPage />)
  await waitFor(() => expect(screen.getByText(/Tahmini Değer Aralığı/i)).toBeInTheDocument())
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(
    '/api/deger/kart?mahalleId=5000&ada=12&parsel=3',
  )
  expect(replaceMock).toHaveBeenCalledWith('/deger?mahalleId=5000&ada=12&parsel=3')
})

it('mahalleId sayı değilse deep-link tetiklenmez', async () => {
  searchParamsValue = new URLSearchParams('mahalleId=abc&ada=12&parsel=3')
  render(<DegerPage />)
  await new Promise((r) => setTimeout(r, 0))
  expect(global.fetch as jest.Mock).not.toHaveBeenCalled()
})
