/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ParcelPicker, type ParcelPickerValue } from './ParcelPicker'

// Leaflet, haritayi kurarken konteynerin O ANDAKI olcusunu okur ve tile
// izgarasini ona gore olusturur. `/hesapla`daki `ParcelModal` haritayi
// acilirken mount ediyor: konteyner o an ya 0 boyutlu ya da animasyon
// ortasinda. Sonuc canli turda olculdu — tile'lar kopuk sutunlar halinde
// ciziliyor, aralarinda bos alanlar kaliyor ve tiklama koordinatlari kayiyor.
// Cozum `invalidateSize`: Leaflet'in olculeri yeniden okumasi.
//
// Bu, projede DORDUNCU kez cikan "async harita kurulumuyla yarisan effect"
// vakasi (MapView marker'lari, MiniMap katman ref'leri, ParcelPicker
// marker+poligon). Onceki uc vakada cozum `mapReady` bayragiydi; burada
// yaris DOM olcusuyle oldugu icin `ResizeObserver` gerekiyor.

const harita = {
    setView: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    remove: jest.fn(),
    removeLayer: jest.fn(),
    invalidateSize: jest.fn(),
    fitBounds: jest.fn(),
    addLayer: jest.fn(),
}
// Gercek Leaflet'te setView() zincirlenebilir olsun diye map instance'inin
// kendisini dondurur; kurulum kodu `L.map(el).setView(...)` seklinde
// zincirliyor. Mock varsayilan `undefined` donerse `map` degiskeni
// undefined'a baglanir ve sonraki her cagri patlar.
harita.setView.mockImplementation(() => harita)

jest.mock('leaflet', () => {
    const katman = () => {
        const l: Record<string, jest.Mock> = { addTo: jest.fn(), bindPopup: jest.fn(), on: jest.fn() }
        Object.values(l).forEach(fn => fn.mockImplementation(() => l))
        l.getBounds = jest.fn(() => ({}))
        return l
    }
    return {
        map: jest.fn(() => harita),
        tileLayer: jest.fn(() => katman()),
        marker: jest.fn(() => katman()),
        polygon: jest.fn(() => katman()),
        divIcon: jest.fn(() => ({})),
    }
})

const BOS: ParcelPickerValue = { lat: null, lng: null, parcel: null, status: 'idle' }

/** Kurulan `ResizeObserver`in geri cagrisini yakalar. */
let olcuGeriCagrisi: (() => void) | null = null
/** Kurulan `map.on('click', ...)` geri cagrisini yakalar — testler gercek
    bir DOM tiklamasi yerine bunu dogrudan cagirir. */
let tiklamaGeriCagrisi: ((e: { latlng: { lat: number; lng: number } }) => void) | null = null

beforeEach(() => {
    jest.clearAllMocks()
    olcuGeriCagrisi = null
    tiklamaGeriCagrisi = null
    harita.on.mockImplementation((event: string, cb: (e: { latlng: { lat: number; lng: number } }) => void) => {
        if (event === 'click') tiklamaGeriCagrisi = cb
    })
    class SahteResizeObserver {
        constructor(cb: () => void) { olcuGeriCagrisi = cb }
        observe = jest.fn()
        unobserve = jest.fn()
        disconnect = jest.fn()
    }
    ; (global as unknown as { ResizeObserver: unknown }).ResizeObserver = SahteResizeObserver
})

// Kullanici bulgusu: TKGM'nin kendi Atlas haritasi Arazi (uydu/topografya)
// gorunumu sunuyor, biz sokak haritasi (OSM Mapnik) kullaniyorduk — arsa
// sinirlarini/topografyayi degerlendirmek icin Arazi gorunumu daha isliyor.
// Esri World Imagery, Leaflet ile ayni sekilde (atif sarti disinda) ucretsiz
// kullanilabilen uydu katmani.
describe('ParcelPicker — harita katmani (uydu/arazi gorunumu)', () => {
    it('OpenStreetMap sokak katmani yerine Esri World Imagery uydu katmani kullanilir', async () => {
        render(<ParcelPicker value={BOS} onChange={jest.fn()} />)

        await waitFor(() => expect(harita.invalidateSize).toHaveBeenCalled())

        const tileLayer = (jest.requireMock('leaflet') as { tileLayer: jest.Mock }).tileLayer
        expect(tileLayer).toHaveBeenCalledWith(
            expect.stringContaining('server.arcgisonline.com/ArcGIS/rest/services/World_Imagery'),
            expect.any(Object),
        )
        expect(tileLayer).not.toHaveBeenCalledWith(
            expect.stringContaining('tile.openstreetmap.org'),
            expect.any(Object),
        )
    })
})

// Kullanici bulgusu: TKGM'de dogrulanan parsel sinirini haritada kirmizi ile
// gosteriyor — bizim yesil cizgimiz TKGM'nin gorsel diliyle tutarsiz.
describe('ParcelPicker — dogrulanan parsel sinir rengi', () => {
    it('dogrulanan parsel poligonu kirmizi (#ef4444) cizilir', async () => {
        const VERIFIED: ParcelPickerValue = {
            lat: 41.167877, lng: 27.583458, status: 'verified',
            parcel: {
                il: 'Tekirdağ', ilce: 'Muratli', mahalle: 'Kirkkepenekli',
                adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
                geometry: { type: 'Polygon', coordinates: [[[27.58, 41.16], [27.59, 41.16], [27.59, 41.17]]] },
            },
        }
        render(<ParcelPicker value={VERIFIED} onChange={jest.fn()} />)

        await waitFor(() => expect(harita.invalidateSize).toHaveBeenCalled())

        const polygon = (jest.requireMock('leaflet') as { polygon: jest.Mock }).polygon
        await waitFor(() => expect(polygon).toHaveBeenCalled())
        expect(polygon).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ color: '#ef4444' }))
    })
})

describe('ParcelPicker — harita olculeri', () => {
    it('harita kurulduktan sonra invalidateSize cagrilir', async () => {
        render(<ParcelPicker value={BOS} onChange={jest.fn()} />)

        await waitFor(() => {
            expect(harita.invalidateSize).toHaveBeenCalled()
        })
    })

    it('konteyner olcusu degisince harita yeniden olculur', async () => {
        render(<ParcelPicker value={BOS} onChange={jest.fn()} />)

        await waitFor(() => expect(olcuGeriCagrisi).not.toBeNull())
        const oncekiCagriSayisi = harita.invalidateSize.mock.calls.length

        // Modalin acilis animasyonu sirasindaki olcu degisimi.
        olcuGeriCagrisi!()

        expect(harita.invalidateSize.mock.calls.length).toBeGreaterThan(oncekiCagriSayisi)
    })

    it('bilesen sokulunce gozlemci birakilir (sizinti yok)', async () => {
        const { unmount } = render(<ParcelPicker value={BOS} onChange={jest.fn()} />)
        await waitFor(() => expect(olcuGeriCagrisi).not.toBeNull())

        unmount()

        // Sokulmus bilesenin gozlemcisi hala haritayi olcmeye calisirsa
        // kaldirilmis bir Leaflet ornegine dokunur.
        expect(harita.remove).toHaveBeenCalled()
    })
})

/** Harita kurulumu tamamlanana kadar bekler (placePinRef bu noktada zaten atanmis olur). */
async function haritaHazirOlanaKadarBekle() {
    await waitFor(() => expect(harita.invalidateSize).toHaveBeenCalled())
}

describe('ParcelPicker — Konumumu Bul (geolocation)', () => {
    afterEach(() => {
        // navigator.geolocation testler arasi sizmasin.
        Object.defineProperty(global.navigator, 'geolocation', { value: undefined, configurable: true })
    })

    it('konum izni verilince harita o noktaya gider ve onChange cagirilir', async () => {
        const getCurrentPosition = jest.fn((success: PositionCallback) => {
            success({ coords: { latitude: 41.1, longitude: 27.5 } } as GeolocationPosition)
        })
        Object.defineProperty(global.navigator, 'geolocation', {
            value: { getCurrentPosition },
            configurable: true,
        })

        const onChange = jest.fn()
        render(<ParcelPicker value={BOS} onChange={onChange} />)
        await haritaHazirOlanaKadarBekle()

        fireEvent.click(screen.getByRole('button', { name: /Konumumu Bul/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ lat: 41.1, lng: 27.5, parcel: null, status: 'idle' })
        })
        expect(harita.setView).toHaveBeenCalledWith([41.1, 27.5], 17)
    })

    it('konum izni reddedilince uyari gosterilir, onChange cagirilmaz', async () => {
        const getCurrentPosition = jest.fn((_success: PositionCallback, error: PositionErrorCallback) => {
            error({ code: 1, message: 'denied' } as GeolocationPositionError)
        })
        Object.defineProperty(global.navigator, 'geolocation', {
            value: { getCurrentPosition },
            configurable: true,
        })

        const onChange = jest.fn()
        render(<ParcelPicker value={BOS} onChange={onChange} />)
        await haritaHazirOlanaKadarBekle()

        fireEvent.click(screen.getByRole('button', { name: /Konumumu Bul/i }))

        await waitFor(() => {
            expect(screen.getByText(/Konum izni alınamadı/i)).toBeInTheDocument()
        })
        expect(onChange).not.toHaveBeenCalled()
    })

    it('tarayici geolocation desteklemiyorsa uyari gosterir', async () => {
        Object.defineProperty(global.navigator, 'geolocation', { value: undefined, configurable: true })

        render(<ParcelPicker value={BOS} onChange={jest.fn()} />)
        await haritaHazirOlanaKadarBekle()

        fireEvent.click(screen.getByRole('button', { name: /Konumumu Bul/i }))

        expect(screen.getByText(/Tarayıcın konum tespitini desteklemiyor/i)).toBeInTheDocument()
    })
})

// "Elle Gir" akisi (manuel TKGM referansi) artik ParcelPicker'in sorumlulugunda
// degil — Task 3 ile bu bilesenden sokuldu, form artik disaridan (sheet
// seviyesinde, Task 5) suruluyor. Eski test burada silindi; ManualParcelEntryForm
// kendi test dosyasinda (Task 2) ayrica kapsanmis durumda.

// Kullanici bulgusu: haritada bir noktaya tiklayinca parsel otomatik
// dogrulanmiyordu, ayri "Parseli Dogrula" butonuna basmak gerekiyordu.
// Artik tiklama pini koyar VE ayni anda dogrulamayi tetikler.
describe('ParcelPicker — tiklaninca otomatik dogrulama', () => {
    const PARCEL = {
        il: 'Tekirdağ', ilce: 'Muratli', mahalle: 'Kirkkepenekli',
        adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
        geometry: { type: 'Polygon' as const, coordinates: [[[27.58, 41.16], [27.59, 41.16], [27.59, 41.17]]] },
    }

    afterEach(() => { jest.restoreAllMocks() })

    it('haritaya tiklaninca ayri bir buton tiklamaya gerek kalmadan parsel dogrulanir', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 200, json: async () => ({ status: 'verified', parcel: PARCEL }),
        }) as unknown as typeof fetch
        const onChange = jest.fn()
        render(<ParcelPicker value={BOS} onChange={onChange} />)
        await waitFor(() => expect(harita.invalidateSize).toHaveBeenCalled())
        await waitFor(() => expect(tiklamaGeriCagrisi).not.toBeNull())

        act(() => { tiklamaGeriCagrisi!({ latlng: { lat: 41.167877, lng: 27.583458 } }) })

        // 1) Tiklama hemen pini koyar (mevcut davranis, degismedi).
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ lat: 41.167877, lng: 27.583458, parcel: null, status: 'idle' })
        })
        // 2) Ayri bir "Parseli Dogrula" tiklamasi OLMADAN dogrulama sonucu gelir.
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: PARCEL, status: 'verified' })
        })
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('lat=41.167877&lng=27.583458'),
            expect.anything(),
        )
    })

    it('ard arda iki farkli noktaya tiklaninca yalnizca SON tiklamanin sonucu uygulanir (yaris korumasi)', async () => {
        const ILK_PARSEL = { ...PARCEL, parselNo: 'İLK-YANLIŞ' }
        const SON_PARSEL = { ...PARCEL, parselNo: 'SON-DOGRU' }
        const cozucler: Array<(v: { status: number; json: () => Promise<unknown> }) => void> = []
        const reddediciler: Array<(err: Error) => void> = []
        global.fetch = jest.fn((_url: string, opts?: { signal?: AbortSignal }) => {
            return new Promise((resolve, reject) => {
                cozucler.push(resolve)
                reddediciler.push(reject)
                opts?.signal?.addEventListener('abort', () => {
                    const err = new Error('aborted')
                    err.name = 'AbortError'
                    reject(err)
                })
            })
        }) as unknown as typeof fetch
        const onChange = jest.fn()
        render(<ParcelPicker value={BOS} onChange={onChange} />)
        await waitFor(() => expect(harita.invalidateSize).toHaveBeenCalled())
        await waitFor(() => expect(tiklamaGeriCagrisi).not.toBeNull())

        // Ilk tiklama — istegi baslatir ama henuz cozulmez.
        act(() => { tiklamaGeriCagrisi!({ latlng: { lat: 41.0, lng: 27.0 } }) })
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

        // Ikinci (SON) tiklama — ilk istegi iptal etmeli.
        act(() => { tiklamaGeriCagrisi!({ latlng: { lat: 42.0, lng: 28.0 } }) })
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))

        // Ilk istek GEC gelse bile (yarisi kaybetse bile) sonucu yoksayilmali.
        await act(async () => {
            cozucler[0]({ status: 200, json: async () => ({ status: 'verified', parcel: ILK_PARSEL }) })
            cozucler[1]({ status: 200, json: async () => ({ status: 'verified', parcel: SON_PARSEL }) })
        })

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: SON_PARSEL, status: 'verified' })
        })
        expect(onChange).not.toHaveBeenCalledWith({ parcel: ILK_PARSEL, status: 'verified' })
    })
})
