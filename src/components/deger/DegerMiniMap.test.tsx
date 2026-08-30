/** @jest-environment jsdom */
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

const onReadyCalls: Array<(map: unknown, L: unknown) => void> = []
jest.mock('@/lib/hooks/useLeafletMap', () => ({
  useLeafletMap: (_ref: unknown, opts: { onReady?: (m: unknown, l: unknown) => void }) => {
    if (opts.onReady) onReadyCalls.push(opts.onReady)
    return { mapRef: { current: null }, mapReady: false, LRef: { current: null } }
  },
}))
import { DegerMiniMap } from './DegerMiniMap'

const geoJSON = jest.fn(() => ({ addTo: jest.fn(), getBounds: () => ({}) }))
const fakeL = { tileLayer: jest.fn(() => ({ addTo: jest.fn() })), geoJSON }
const fakeMap = { fitBounds: jest.fn() }

beforeEach(() => { onReadyCalls.length = 0; geoJSON.mockClear() })

it('parsel + mahalle sınırı katmanı ekler', () => {
  render(<DegerMiniMap parcelGeometry={{ type: 'Polygon', coordinates: [[[39.7, 41], [39.71, 41], [39.71, 41.01], [39.7, 41]]] }} neighborhoodGeojson={{ type: 'MultiPolygon', coordinates: [] }} />)
  onReadyCalls[0](fakeMap, fakeL)
  expect(fakeL.tileLayer).toHaveBeenCalled()
  expect(geoJSON).toHaveBeenCalledTimes(2) // parsel + sınır
})

it('neighborhoodGeojson null → sadece parsel katmanı', () => {
  render(<DegerMiniMap parcelGeometry={{ type: 'Polygon', coordinates: [[[39.7, 41]]] }} neighborhoodGeojson={null} />)
  onReadyCalls[0](fakeMap, fakeL)
  expect(geoJSON).toHaveBeenCalledTimes(1)
})
