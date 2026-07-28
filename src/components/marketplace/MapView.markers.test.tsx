/** @jest-environment jsdom */

// MapView marker'lari YALNIZCA harita kurulum effect'inin icinde olusturuluyordu
// ve o effect'in bagimlilik dizisi []. Marketplace ise `listings`i [] ile mount
// edip sonra fetch ile dolduruyor (marketplace/page.tsx:65,90) ve MapView'i
// `!loading` guard'i OLMADAN render ediyor. Sonuc: marker'lar bos diziden bir
// kez kuruluyor, ilanlar geldiginde bir daha kurulmuyor -- harita kalici olarak
// bos kaliyor ve filtre degisiklikleri de haritaya hic yansimiyor.
//
// Bu dosya o davranisi sahte bir Leaflet uzerinden dogrudan olcer.
jest.mock('leaflet', () => {
    const makeLayer = () => {
        const layer: Record<string, jest.Mock> = {
            addTo: jest.fn(),
            bindPopup: jest.fn(),
            on: jest.fn(),
            setContent: jest.fn(),
        }
        Object.values(layer).forEach(fn => fn.mockImplementation(() => layer))
        return layer
    }
    const makeGroup = () => {
        const group: Record<string, jest.Mock> = {
            addLayer: jest.fn(),
            removeLayer: jest.fn(),
            clearLayers: jest.fn(),
            addTo: jest.fn(),
        }
        Object.values(group).forEach(fn => fn.mockImplementation(() => group))
        return group
    }
    const makeMap = () => ({
        setView: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        addLayer: jest.fn(),
        removeLayer: jest.fn(),
        remove: jest.fn(),
        invalidateSize: jest.fn(),
        getCenter: jest.fn(() => ({ lat: 41, lng: 29 })),
        getZoom: jest.fn(() => 12),
        flyTo: jest.fn(),
        fitBounds: jest.fn(),
        getBounds: jest.fn(() => ({ contains: () => true })),
        eachLayer: jest.fn(),
    })
    return {
        map: jest.fn(() => makeMap()),
        control: { zoom: jest.fn(() => makeLayer()) },
        tileLayer: jest.fn(() => makeLayer()),
        marker: jest.fn(() => makeLayer()),
        divIcon: jest.fn(() => ({})),
        popup: jest.fn(() => makeLayer()),
        layerGroup: jest.fn(() => makeGroup()),
        polyline: jest.fn(() => makeLayer()),
        polygon: jest.fn(() => makeLayer()),
        circleMarker: jest.fn(() => makeLayer()),
        geoJSON: jest.fn(() => makeGroup()),
        latLngBounds: jest.fn(() => ({ contains: () => true })),
    }
})

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

import { render, waitFor } from '@testing-library/react'
import leafletDefault from 'leaflet'
import { MapView } from './MapView'

const mockL = leafletDefault as unknown as {
    map: jest.Mock
    marker: jest.Mock
    layerGroup: jest.Mock
}

const LISTINGS = [
    { id: 'a', title: '600 m2 Arsa', type: 'SALE', city: 'Tekirdag', district: 'Muratli', lat: 41.16, lng: 27.58, price: 4950000 },
    { id: 'b', title: '820 m2 Arsa', type: 'KAT_KARSILIGI', city: 'Istanbul', district: 'Kadikoy', lat: 40.99, lng: 29.02 },
]

// ResizeObserver jsdom'da yok; MapView kurulum sirasinda kullaniyor.
beforeAll(() => {
    ; (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
        observe() { }
        unobserve() { }
        disconnect() { }
    }
})

describe('MapView marker kurulumu', () => {
    afterEach(() => { jest.clearAllMocks() })

    it('ilanlar sonradan geldiginde marker olusturur', async () => {
        // Marketplace'in gercek davranisi: once bos dizi ile mount, sonra fetch.
        const { rerender } = render(
            <MapView listings={[]} highlightedId={null} onHighlight={() => { }} />,
        )
        await waitFor(() => expect(mockL.map).toHaveBeenCalledTimes(1))
        expect(mockL.marker).not.toHaveBeenCalled()

        rerender(<MapView listings={LISTINGS} highlightedId={null} onHighlight={() => { }} />)

        // Bu, duzeltme olmadan BASARISIZ olur: marker hic olusturulmaz.
        await waitFor(() => expect(mockL.marker).toHaveBeenCalledTimes(2))
        const group = mockL.layerGroup.mock.results[0].value
        expect(group.addLayer).toHaveBeenCalledTimes(2)
    })

    it('koordinatsiz ilan haritaya konmaz', async () => {
        render(
            <MapView
                listings={[{ id: 'c', title: 'Konumsuz' }, ...LISTINGS]}
                highlightedId={null}
                onHighlight={() => { }}
            />,
        )
        await waitFor(() => expect(mockL.marker).toHaveBeenCalledTimes(2))
    })

    it('ilan listesi degisince marker seti yeniden kurulur, eskiler birikmez', async () => {
        const { rerender } = render(
            <MapView listings={LISTINGS} highlightedId={null} onHighlight={() => { }} />,
        )
        await waitFor(() => expect(mockL.marker).toHaveBeenCalledTimes(2))
        const group = mockL.layerGroup.mock.results[0].value

        // Filtre daraltildi: tek ilan kaldi.
        rerender(
            <MapView listings={[LISTINGS[0]]} highlightedId={null} onHighlight={() => { }} />,
        )

        await waitFor(() => expect(group.clearLayers).toHaveBeenCalled())
        await waitFor(() => expect(mockL.marker).toHaveBeenCalledTimes(3))
    })
})
