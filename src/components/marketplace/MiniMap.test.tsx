/** @jest-environment jsdom */

// jsdom Leaflet'i gercekten "boyayamaz" (bkz. gorev notu); onceki surumde
// `leaflet` mock'lanmamisti, bu yuzden `await import('leaflet')` hicbir zaman
// senkron cozulmuyordu ve `init()` testler bitene kadar hep asilida kaliyordu.
// mapRef.current asla set edilmedigi icin remount testi sadece controlled
// checkbox state'ini olcuyordu, faultRef/floodRef mantigina hic girmiyordu.
// Bu yuzden burada minimal ama gercek bir Leaflet sahtesi kuruluyor: her
// L.map() cagrisi izlenebilir ayri bir sahte harita, her
// L.tileLayer.wms() cagrisi izlenebilir ayri bir sahte katman dondurur.
jest.mock('leaflet', () => {
    const makeLayer = () => {
        const layer: { addTo: jest.Mock } = { addTo: jest.fn() }
        layer.addTo.mockImplementation(() => layer)
        return layer
    }
    const makeMap = () => ({
        removeLayer: jest.fn(),
        remove: jest.fn(),
    })
    const tileLayer = jest.fn(() => makeLayer()) as unknown as jest.Mock & { wms: jest.Mock }
    tileLayer.wms = jest.fn(() => makeLayer())
    return {
        map: jest.fn(() => makeMap()),
        tileLayer,
        marker: jest.fn(() => makeLayer()),
        circle: jest.fn(() => makeLayer()),
        divIcon: jest.fn(() => ({})),
        CRS: { EPSG4326: 'EPSG4326' },
    }
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import leafletDefault from 'leaflet'
import { MiniMap } from './MiniMap'

// MiniMap.tsx `(await import('leaflet')).default` uzerinden erisiyor; statik
// default import ayni sahte modul nesnesine cozulur (esModuleInterop), yani
// burada gorulen cagri kayitlari bilesenin gercekten yaptigi cagrilardir.
const mockL = leafletDefault as unknown as {
    map: jest.Mock
    tileLayer: jest.Mock & { wms: jest.Mock }
}

describe('MiniMap risk katmanlari', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('riskLayers verilmediginde katman kontrolu gosterilmez', () => {
        render(<MiniMap lat={41} lng={29} />)
        expect(screen.queryByLabelText('Diri fay katmanı')).toBeNull()
    })

    it('riskLayers true iken iki katman kontrolu gosterilir', () => {
        render(<MiniMap lat={41} lng={29} riskLayers />)
        expect(screen.getByLabelText('Diri fay katmanı')).toBeInTheDocument()
        expect(screen.getByLabelText('Taşkın katmanı')).toBeInTheDocument()
    })

    it('katman kontrolleri varsayilan olarak kapalidir', () => {
        render(<MiniMap lat={41} lng={29} riskLayers />)
        expect(screen.getByLabelText('Diri fay katmanı')).not.toBeChecked()
    })

    // lat/lng degisince ilk effect haritayi yok edip yeniden kurar (`[lat, lng]`
    // bagimliligi). faultRef/floodRef sifirlanmazsa: (1) onceden isaretli katman
    // yeni haritaya sessizce yeniden eklenmez ("!ref.current" koşulu artik
    // yeniden var olmayan bir haritaya ait sahte-olmayan bir nesneyi gorup
    // no-op yapar), (2) isareti kaldirmak eski (yok edilmis) haritanin katman
    // nesnesini YENI haritadan kaldirmaya calisir. Asagida her iki sonuc da
    // sahte Leaflet uzerinden dogrudan gozlemleniyor.
    it('lat/lng degisip harita yeniden kurulunca eski katman referansi yeni haritaya sizmaz', async () => {
        const { rerender } = render(<MiniMap lat={41} lng={29} riskLayers />)
        await waitFor(() => expect(mockL.map).toHaveBeenCalledTimes(1))
        const firstMap = mockL.map.mock.results[0].value

        // Diri fay'i ac: katman ilk haritaya eklenir.
        fireEvent.click(screen.getByLabelText('Diri fay katmanı'))
        await waitFor(() => expect(mockL.tileLayer.wms).toHaveBeenCalledTimes(1))
        const firstFaultLayer = mockL.tileLayer.wms.mock.results[0].value
        expect(firstFaultLayer.addTo).toHaveBeenCalledWith(firstMap)

        // lat/lng degisir: ilk harita yok edilir, ikincisi kurulur.
        rerender(<MiniMap lat={42} lng={30} riskLayers />)
        expect(firstMap.remove).toHaveBeenCalledTimes(1)
        await waitFor(() => expect(mockL.map).toHaveBeenCalledTimes(2))
        const secondMap = mockL.map.mock.results[1].value

        // Diri fay checkbox'i hala isaretli (React state remount'tan etkilenmez),
        // ama katman artik yok edilen haritaya bagliydi. Baska bir katmani
        // (Taskin) acmak ayni effect'i tekrar calistirir; bu calisma sirasinda
        // faultRef sifirlanmis olmali ki 'diri_fay' yeni haritaya yeniden eklensin.
        expect(screen.getByLabelText('Diri fay katmanı')).toBeChecked()
        fireEvent.click(screen.getByLabelText('Taşkın katmanı'))
        await waitFor(() => expect(mockL.tileLayer.wms).toHaveBeenCalledTimes(3))

        const wmsCalls = mockL.tileLayer.wms.mock.calls as [string, { layers?: string }][]
        const faultReattachIndex = wmsCalls.findIndex(
            (call, i) => i > 0 && call[1]?.layers === 'diri_fay',
        )
        expect(faultReattachIndex).toBeGreaterThan(-1)
        const reattachedFaultLayer = mockL.tileLayer.wms.mock.results[faultReattachIndex].value
        expect(reattachedFaultLayer.addTo).toHaveBeenCalledWith(secondMap)

        // Simdi isareti kaldirmak, eski degil, YENI haritanin katmanini hedeflemeli.
        expect(() => fireEvent.click(screen.getByLabelText('Diri fay katmanı'))).not.toThrow()
        await waitFor(() => expect(secondMap.removeLayer).toHaveBeenCalledTimes(1))
        expect(secondMap.removeLayer).toHaveBeenCalledWith(reattachedFaultLayer)
        expect(firstMap.removeLayer).not.toHaveBeenCalled()
    })
})
