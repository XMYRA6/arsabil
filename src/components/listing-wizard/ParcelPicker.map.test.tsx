/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

beforeEach(() => {
    jest.clearAllMocks()
    olcuGeriCagrisi = null
    class SahteResizeObserver {
        constructor(cb: () => void) { olcuGeriCagrisi = cb }
        observe = jest.fn()
        unobserve = jest.fn()
        disconnect = jest.fn()
    }
    ; (global as unknown as { ResizeObserver: unknown }).ResizeObserver = SahteResizeObserver
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

        expect(screen.getByText(/Tarayıcınız konum tespitini desteklemiyor/i)).toBeInTheDocument()
    })
})

// "Elle Gir" akisi (manuel TKGM referansi) artik ParcelPicker'in sorumlulugunda
// degil — Task 3 ile bu bilesenden sokuldu, form artik disaridan (sheet
// seviyesinde, Task 5) suruluyor. Eski test burada silindi; ManualParcelEntryForm
// kendi test dosyasinda (Task 2) ayrica kapsanmis durumda.
