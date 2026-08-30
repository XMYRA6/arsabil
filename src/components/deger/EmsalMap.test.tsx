/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const onReadyCalls: Array<(m: unknown, l: unknown) => void | Promise<void>> = []
jest.mock('@/lib/hooks/useLeafletMap', () => ({
  useLeafletMap: (_r: unknown, o: { onReady?: (m: unknown, l: unknown) => void }) => {
    if (o.onReady) onReadyCalls.push(o.onReady)
    return { mapRef: { current: null }, mapReady: false, LRef: { current: null } }
  },
}))
jest.mock('leaflet.markercluster', () => ({}))
import { EmsalMap } from './EmsalMap'

const layer = () => ({ addTo: jest.fn().mockReturnThis(), addLayer: jest.fn(), bindPopup: jest.fn().mockReturnThis(), getBounds: () => ({}) })
const L = {
  tileLayer: jest.fn(layer), geoJSON: jest.fn(layer), marker: jest.fn(layer),
  markerClusterGroup: jest.fn(layer), featureGroup: jest.fn(layer),
}
const map = { fitBounds: jest.fn() }
const CMP = [
  { pricePerSqm: 2500, areaSqm: 480, price: 1, distanceM: 900, approxDistance: true, lat: 41.001, lng: 39.7, listedAt: null, source: 'emlakjet', sourceUrl: 'https://emlakjet.com/ilan/c1' },
]

beforeEach(() => { onReadyCalls.length = 0; Object.values(L).forEach((f) => (f as jest.Mock).mockClear?.()) })

it('parsel + sınır + cluster katmanları ekler', async () => {
  render(<EmsalMap parcelGeometry={{ type: 'Polygon', coordinates: [] }} neighborhoodGeojson={{ type: 'MultiPolygon', coordinates: [] }} comparables={CMP} center={{ lat: 41, lng: 39.7 }} onClose={jest.fn()} />)
  await onReadyCalls[0](map, L)
  expect(L.tileLayer).toHaveBeenCalled()
  expect(L.geoJSON).toHaveBeenCalledTimes(2) // parsel + sınır
  expect(L.markerClusterGroup).toHaveBeenCalled()
  expect(L.marker).toHaveBeenCalledTimes(1)
})

it('neighborhoodGeojson null → sınır katmanı eklenmez', async () => {
  render(<EmsalMap parcelGeometry={{ type: 'Polygon', coordinates: [] }} neighborhoodGeojson={null} comparables={CMP} center={{ lat: 41, lng: 39.7 }} onClose={jest.fn()} />)
  await onReadyCalls[0](map, L)
  expect(L.geoJSON).toHaveBeenCalledTimes(1)
})

it('kapat butonu onClose çağırır', () => {
  const onClose = jest.fn()
  render(<EmsalMap parcelGeometry={{ type: 'Polygon', coordinates: [] }} neighborhoodGeojson={null} comparables={CMP} center={{ lat: 41, lng: 39.7 }} onClose={onClose} />)
  fireEvent.click(screen.getByLabelText('Kapat'))
  expect(onClose).toHaveBeenCalled()
})
