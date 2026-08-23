/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useLeafletMap } from './useLeafletMap'

let sira: string[] = []

const harita = {
    invalidateSize: jest.fn(),
    remove: jest.fn(() => { sira.push('remove') }),
}
jest.mock('leaflet', () => ({
    map: jest.fn(() => harita),
}))

let olusanGozlemciler: Array<{ disconnect: jest.Mock; observe: jest.Mock }> = []

beforeEach(() => {
    jest.clearAllMocks()
    sira = []
    olusanGozlemciler = []
    class SahteResizeObserver {
        disconnect = jest.fn(() => { sira.push('disconnect') })
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

        // First mount: _leaflet_id should be cleared before L.map()
        renderHook(() => useLeafletMap(containerRef, { center: [0, 0], zoom: 1 }))
        await tikBekle()

        expect((el as unknown as { _leaflet_id?: number })._leaflet_id).toBeUndefined()
    })

    it('_leaflet_id sifirlanir her L.map() cagrisinda (deps yeniden kurulusunda)', async () => {
        const el = document.createElement('div')
        const containerRef = { current: el }

        const { rerender } = renderHook(
            (props: { lat: number }) => useLeafletMap(containerRef, {
                center: [props.lat, 0], zoom: 1, deps: [props.lat],
            }),
            { initialProps: { lat: 41 } },
        )
        await tikBekle()

        // After first mount, manually set _leaflet_id to simulate what Leaflet would do
        ; (el as unknown as { _leaflet_id: number })._leaflet_id = 42

        // deps change triggers rebuild, should clear _leaflet_id before second L.map()
        rerender({ lat: 42 })
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

    it('unmount onReady temizligini VE harita remove()ini cagirir (dogru sirada)', async () => {
        const onReadyCleanup = jest.fn(() => { sira.push('onReadyCleanup') })
        const onReady = jest.fn(() => onReadyCleanup)
        const containerRef = { current: document.createElement('div') }

        const { unmount } = renderHook(() => useLeafletMap(containerRef, { center: [0, 0], zoom: 1, onReady }))
        await tikBekle()
        expect(olusanGozlemciler).toHaveLength(1)

        sira = [] // Reset sira before unmount to capture only cleanup sequence
        unmount()

        expect(onReadyCleanup).toHaveBeenCalledTimes(1)
        expect(olusanGozlemciler[0].disconnect).toHaveBeenCalledTimes(1)
        expect(harita.remove).toHaveBeenCalledTimes(1)
        // Verify cleanup order: onReadyCleanup -> disconnect -> remove
        expect(sira).toEqual(['onReadyCleanup', 'disconnect', 'remove'])
    })

    it('deps degisince temizlik dogru sirada yapilir (onReadyCleanup->disconnect->remove)', async () => {
        const onReadyCleanup = jest.fn(() => { sira.push('onReadyCleanup') })
        const onReady = jest.fn(() => onReadyCleanup)
        const containerRef = { current: document.createElement('div') }

        const { rerender } = renderHook(
            (props: { lat: number }) => useLeafletMap(containerRef, {
                center: [props.lat, 0], zoom: 1, onReady, deps: [props.lat],
            }),
            { initialProps: { lat: 41 } },
        )
        await tikBekle()
        expect(onReady).toHaveBeenCalledTimes(1)

        sira = [] // Reset sira before rerender to capture only cleanup sequence
        rerender({ lat: 42 })
        await tikBekle()

        // After deps change, the first setup should be cleaned up (onReadyCleanup + disconnect + remove)
        expect(sira).toEqual(['onReadyCleanup', 'disconnect', 'remove'])
        expect(onReady).toHaveBeenCalledTimes(2)
    })

    it('cancelled during onReady uzun islemde temizlik fonksiyonunu cagirir', async () => {
        let cozBekleyen: (() => void) | null = null
        const onReadyCleanup = jest.fn(() => { sira.push('onReadyCleanup') })
        const onReady = jest.fn(() => new Promise<(() => void) | void>((resolve) => {
            cozBekleyen = () => resolve(onReadyCleanup)
        }))
        const containerRef = { current: document.createElement('div') }

        const { rerender } = renderHook(
            (props: { lat: number }) => useLeafletMap(containerRef, {
                center: [props.lat, 0], zoom: 1, onReady, deps: [props.lat],
            }),
            { initialProps: { lat: 41 } },
        )
        await tikBekle()

        // deps change before onReady resolves
        rerender({ lat: 42 })
        // Now onReady async promise resolves, but effect is cancelled
        await act(async () => { cozBekleyen?.() })
        await tikBekle()

        // onReadyCleanup should be called even though cancelled, then map.remove()
        expect(onReadyCleanup).toHaveBeenCalledTimes(1)
        expect(harita.remove).toHaveBeenCalled()
    })
})
