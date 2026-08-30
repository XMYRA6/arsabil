/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const replaceMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))
jest.mock('@/components/listing-wizard/ManualParcelEntryForm', () => ({
  ManualParcelEntryForm: ({ onLocationFound }: { onLocationFound: (lat: number, lng: number, ref: unknown) => void }) => (
    <button onClick={() => onLocationFound(41.0, 39.7, { il: 'T', ilce: 'O', mahalle: 'U', ada: '142', parsel: '7' })}>
      manuel-bul
    </button>
  ),
}))
jest.mock('@/components/listing-wizard/ParcelPicker', () => ({
  ParcelPicker: () => <div>harita-picker</div>,
}))

import DegerPage from './page'

const CARD = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '142', parsel: '7', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 1800, floodQ100: false, status: 'ok' },
  value: { tier: 'free', insufficientData: false, basis: 'ilce', thinData: false, freeRangeLow: 750000, freeRangeHigh: 1250000, pricePerSqmCoarse: 2000 },
}

beforeEach(() => {
  replaceMock.mockReset()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => CARD }) as jest.Mock
})

it('ada/parsel sekmesi: parsel çözülünce kart görünür + URL güncellenir', async () => {
  render(<DegerPage />)
  fireEvent.click(screen.getByText('manuel-bul'))
  await waitFor(() => expect(screen.getByText(/Tahmini Değer Aralığı/i)).toBeInTheDocument())
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/deger/kart?lat=41&lng=39.7')
  expect(replaceMock).toHaveBeenCalledWith('/deger?lat=41&lng=39.7')
})

it('sekme değiştirince harita bileşeni görünür', () => {
  render(<DegerPage />)
  fireEvent.click(screen.getByRole('tab', { name: /Haritadan/i }))
  expect(screen.getByText('harita-picker')).toBeInTheDocument()
})

it('404 → parsel bulunamadı mesajı', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'parcel_not_found' }) })
  render(<DegerPage />)
  fireEvent.click(screen.getByText('manuel-bul'))
  await waitFor(() => expect(screen.getByText(/Parsel bulunamadı/i)).toBeInTheDocument())
})
