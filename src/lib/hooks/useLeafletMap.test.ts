/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useLeafletMap } from './useLeafletMap'

const harita = {
    invalidateSize: jest.fn(),
    remove: jest.fn(),
}
jest.mock('leaflet', () => ({
    map: jest.fn(() => harita),
}))

let olusanGozlemciler: Array<{ disconnect: jest.Mock; observe: jest.Mock }> = []

beforeEach(() => {
    jest.clearAllMocks()
    olusanGozlemciler = []
    class SahteResizeObserver {
        disconnect = jest.fn()
        observe = jest.fn()
        constructor(_cb: () => void) {
            olusanGozlemciler.push(this)
        }
    }
    ; (global as unknown as { ResizeObserver: unknown }).ResizeObserver = SahteResizeObserver
})

function tikBekle() {
    return act(async () => { await Promise.resolve(); await Promise.resolve() })
}

describe('useLeafletMap', () => {
    it('haritayi kurar, onReady cagirir, mapReady onReady bittikten sonra true olur', async () => {
        const onReady = jest.fn()
        const containerRef = { current: document.createElement('div') }

        const { result } = renderHook(() => useLeafletMap(containerRef, {
            center: [41, 29], zoom: 12, onReady,
        }))

        expect(result.current.mapReady).toBe(false)
        await tikBekle()

        expect(onReady).toHaveBeenCalledWith(harita, expect.anything())
        expect(result.current.mapReady).toBe(true)
        expect(result.current.mapRef.current).toBe(harita)
    })

    it('_leaflet_id onceden atanmissa sifirlanir (StrictMode remount korumasi)', async () => {
        const el = document.createElement('div')
        ; (el as unknown as { _leaflet_id: number })._leaflet_id = 42
        const containerRef = { current: el }

        renderHook(() => useLeafletMap(containerRef, { center: [0, 0], zoom: 1 }))
        await tikBekle()

        expect((el as unknown as { _leaflet_id?: number })._leaflet_id).toBeUndefined()
    })

    it('center/zoom/leafletMapOptions L.map cagrisina birlesik gecilir', async () => {
        const containerRef = { current: document.createElement('div') }
        renderHook(() => useLeafletMap(containerRef, {
            center: [41, 29], zoom: 12, leafletMapOptions: { zoomControl: false },
        }))
        await tikBekle()

        const mapMock = (jest.requireMock('leaflet') as { map: jest.Mock }).map
        expect(mapMock).toHaveBeenCalledWith(containerRef.current, {
            center: [41, 29], zoom: 12, zoomControl: false,
        })
    })

    it('onReady ASYNC ise mapReady onReady tamamen bitene kadar true olmaz', async () => {
        let cozBekleyen: (() => void) | null = null
        const onReady = jest.fn(() => new Promise<void>((resolve) => { cozBekleyen = resolve }))
        const containerRef = { current: document.createElement('div') }

        const { result } = renderHook(() => useLeafletMap(containerRef, {
            center: [0, 0], zoom: 1, onReady,
        }))

        await tikBekle()
        expect(result.current.mapReady).toBe(false)

        await act(async () => { cozBekleyen!() })
        await tikBekle()
        expect(result.current.mapReady).toBe(true)
    })

    it('observeResize false ise ResizeObserver kurulmaz', async () => {
        const containerRef = { current: document.createElement('div') }
        renderHook(() => useLeafletMap(containerRef, { center: [0, 0], zoom: 1, observeResize: false }))
        await tikBekle()

        expect(olusanGozlemciler).toHaveLength(0)
    })

    it('varsayilan deps [] ile prop degisikliginde yeniden kurulum tetiklenmez', async () => {
        const onReady = jest.fn()
        const containerRef = { current: document.createElement('div') }
        const { rerender } = renderHook(
            (props: { zoom: number }) => useLeafletMap(containerRef, { center: [0, 0], zoom: props.zoom, onReady }),
            { initialProps: { zoom: 1 } },
        )
        await tikBekle()
        expect(onReady).toHaveBeenCalledTimes(1)

        rerender({ zoom: 2 })
        await tikBekle()
        expect(onReady).toHaveBeenCalledTimes(1)
    })

    it('deps degisince harita yikilip yeniden kurulur (MiniMap davranisi)', async () => {
        const onReady = jest.fn()
        const containerRef = { current: document.createElement('div') }
        const { rerender } = renderHook(
            (props: { lat: number }) => useLeafletMap(containerRef, {
                center: [props.lat, 0], zoom: 1, onReady, deps: [props.lat],
            }),
            { initialProps: { lat: 41 } },
        )
        await tikBekle()
        expect(onReady).toHaveBeenCalledTimes(1)

        rerender({ lat: 42 })
        await tikBekle()

        expect(harita.remove).toHaveBeenCalledTimes(1)
        expect(onReady).toHaveBeenCalledTimes(2)
    })

    it('unmount onReady temizligini VE harita remove()ini cagirir', async () => {
        const onReadyCleanup = jest.fn()
        const onReady = jest.fn(() => onReadyCleanup)
        const containerRef = { current: document.createElement('div') }

        const { unmount } = renderHook(() => useLeafletMap(containerRef, { center: [0, 0], zoom: 1, onReady }))
        await tikBekle()
        expect(olusanGozlemciler).toHaveLength(1)

        unmount()

        expect(onReadyCleanup).toHaveBeenCalledTimes(1)
        expect(harita.remove).toHaveBeenCalledTimes(1)
        expect(olusanGozlemciler[0].disconnect).toHaveBeenCalledTimes(1)
    })
})
