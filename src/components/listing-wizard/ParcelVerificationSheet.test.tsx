/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ParcelVerificationSheet } from './ParcelVerificationSheet'
import { __resetIlListCacheForTests } from './ManualParcelEntryForm'

const VERIFIED_PARCEL = {
    il: 'Tekirdağ', ilce: 'Muratlı', mahalle: 'Kırkkepenekli',
    adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
    geometry: { type: 'Polygon' as const, coordinates: [] },
}

jest.mock('./ParcelPicker', () => ({
    // Leaflet jsdom'da mount edilemez — burada haritanin kendisi degil sheet'in
    // ParcelPicker'i DOGRU MODDA render ettigi ve onChange'i dogru isledigi
    // test ediliyor. "simulate-verify" butonu, gercek ParcelPicker'in
    // "Parseli Dogrula" basarili donusunu taklit eder — boylece risk-fetch
    // effect'ini (parcelValue.lat/lng + parcelValue.parcel'a bagli) testler
    // GERCEKTEN tetikleyebilir; onChange hic cagrilmazsa risk state'i asla
    // null'dan cikmaz ve hideApply testleri sessizce yanlis-pozitif verir.
    ParcelPicker: ({ value, onChange }: { value: { lat: number | null; lng: number | null }; onChange: (patch: Record<string, unknown>) => void }) => (
        <div data-testid="parcel-picker">
            <span data-testid="parcel-lat">{value.lat ?? ''}</span>
            <span data-testid="parcel-lng">{value.lng ?? ''}</span>
            <button onClick={() => onChange({ lat: 41.16, lng: 27.58, parcel: VERIFIED_PARCEL, status: 'verified' })}>
                simulate-verify
            </button>
        </div>
    ),
}))

function viewportKur(masaustu: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: query.includes('max-width: 768px') ? masaustu : false,
            media: query,
            onchange: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }),
    })
}

beforeEach(() => {
    viewportKur(true) // varsayilan: masaustu
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok', risk: null }) }) as unknown as typeof fetch
    // ManualParcelEntryForm modul-seviyesinde il listesini onbellekliyor
    // (cachedIlListPromise) ve jest ayni dosya icindeki testler arasinda
    // modulleri sifirlamiyor — bir onceki testin basarili il-listesi cevabi
    // sonraki testin kendi mock fetch dizisini atlayarak yanlis/kaydirilmis
    // veriler okumasina yol acar. TUM testler (yalnizca "Elle gir" alt-grubu
    // degil) bu riske aciktir, bu yuzden dosya-seviyesi beforeEach'te sifirlanir.
    __resetIlListCacheForTests()
})
afterEach(() => { jest.restoreAllMocks() })

describe('ParcelVerificationSheet', () => {
    it('isOpen false iken hicbir sey render etmez', () => {
        render(<ParcelVerificationSheet isOpen={false} onClose={jest.fn()} onConfirm={jest.fn()} />)
        expect(screen.queryByText('Haritadan Parsel Doğrula')).not.toBeInTheDocument()
    })

    it('varsayilan mod Haritadan — ParcelPicker render edilir, form edilmez', async () => {
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        expect(screen.queryByLabelText('İl *')).not.toBeInTheDocument()
    })

    it('Elle gir tiklaninca form gorunur, ParcelPicker kalkar', async () => {
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        fireEvent.click(screen.getByRole('button', { name: 'Elle gir' }))

        expect(screen.getByLabelText('İl *')).toBeInTheDocument()
        expect(screen.queryByTestId('parcel-picker')).not.toBeInTheDocument()
    })

    it('Vazgec/kapat onClose cagirir', async () => {
        const onClose = jest.fn()
        render(<ParcelVerificationSheet isOpen onClose={onClose} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))
        expect(onClose).toHaveBeenCalled()
    })

    it('parcel status verified degilken Aktar butonu devre disi', async () => {
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        expect(screen.getByRole('button', { name: /Hesaplamaya Aktar/i })).toBeDisabled()
    })

    it('parcel dogrulanip risk verisi gelince hideApply=false (varsayilan) Uygula gosterir', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'ok', risk: { faultDistanceM: 500, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 } }),
        }) as unknown as typeof fetch
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        fireEvent.click(screen.getByText('simulate-verify'))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /uygula/i })).toBeInTheDocument()
        })
    })

    it('hideApply true iken ayni senaryoda Uygula gostermez', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'ok', risk: { faultDistanceM: 500, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 } }),
        }) as unknown as typeof fetch
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} hideApply />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        fireEvent.click(screen.getByText('simulate-verify'))

        // Risk kartinin KENDISI (fay mesafesi gibi bilgi metni) hala gorunur olmali —
        // yalnizca Uygula butonu gizlenir, kart tamamen kaybolmaz.
        await waitFor(() => {
            expect(screen.getByText(/500 m/)).toBeInTheDocument()
        })
        expect(screen.queryByRole('button', { name: /uygula/i })).not.toBeInTheDocument()
    })

    it('Aktar tiklaninca onConfirm dogrulanan parcelValue ile cagirilir ve sheet kapanir', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true, json: async () => ({ status: 'ok', risk: null }),
        }) as unknown as typeof fetch
        const onConfirm = jest.fn()
        const onClose = jest.fn()
        render(<ParcelVerificationSheet isOpen onClose={onClose} onConfirm={onConfirm} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        fireEvent.click(screen.getByText('simulate-verify'))
        await waitFor(() => expect(screen.getByRole('button', { name: /Hesaplamaya Aktar/i })).toBeEnabled())

        fireEvent.click(screen.getByRole('button', { name: /Hesaplamaya Aktar/i }))

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                parcelValue: expect.objectContaining({ lat: 41.16, lng: 27.58, status: 'verified' }),
            }),
        )
        expect(onClose).toHaveBeenCalled()
    })

    it('masaustunde ortalanmis modal kabugu render edilir (BottomSheet degil)', async () => {
        viewportKur(true)
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument() // BottomSheet role="dialog" kullanir
    })

    it('mobilde BottomSheet (role=dialog) render edilir', async () => {
        viewportKur(false)
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('Elle gir ile konum bulununca harita moduna doner ve parcelValue pin konumunu tasir', async () => {
        // ManualParcelEntryForm artik TKGM otomatik-tamamlama kullaniyor: il/ilce
        // serbest metinle degil, /api/tkgm/il -> /api/tkgm/ilce sirasiyla cekilen
        // listeden SECILEREK doldurulur. Bu yuzden fetch mock'u sirali yaniti
        // taklit etmeli: il listesi, ilce listesi, ardindan Nominatim.
        let call = 0
        const responses: unknown[] = [
            { iller: [{ id: 34, text: 'İstanbul' }] },
            { ilceler: [{ id: 539, text: 'Kadıköy' }] },
            [{ lat: '41.0', lon: '29.0' }],
        ]
        global.fetch = jest.fn().mockImplementation(() => {
            const body = responses[Math.min(call, responses.length - 1)]
            call++
            return Promise.resolve({ ok: true, json: async () => body })
        }) as unknown as typeof fetch

        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        fireEvent.click(screen.getByRole('button', { name: 'Elle gir' }))
        expect(screen.getByLabelText('İl *')).toBeInTheDocument()

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'İstanbul' } })
        fireEvent.click(await screen.findByText('İstanbul'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Kadıköy' } })
        fireEvent.click(await screen.findByText('Kadıköy'))

        fireEvent.click(screen.getByRole('button', { name: 'Sorgula' }))

        // Manuel form kaybolup ParcelPicker geri gelmeli — "map" moduna donus.
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        expect(screen.queryByLabelText('İl *')).not.toBeInTheDocument()

        // parcelValue.lat/lng, ParcelPicker'in ref'i uzerinden DEGIL, ust bilesenin
        // state'i uzerinden akmis olmali — bu yuzden ParcelPicker'a prop olarak
        // gecen `value.lat`/`value.lng` (mock'ta gorunur kilinan) bulunan konumu
        // yansitmali.
        await waitFor(() => {
            expect(screen.getByTestId('parcel-lat')).toHaveTextContent('41')
            expect(screen.getByTestId('parcel-lng')).toHaveTextContent('29')
        })
    })

    it('initialValue verildiginde ParcelPicker acilista o degerle dolu render edilir (masaustu)', async () => {
        viewportKur(true) // masaustu — dogrulanmis olsa da harita HER ZAMAN gorunur
        render(
            <ParcelVerificationSheet
                isOpen
                onClose={jest.fn()}
                onConfirm={jest.fn()}
                initialValue={{ lat: 41.0, lng: 29.0, parcel: VERIFIED_PARCEL, status: 'verified' }}
            />,
        )
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        // simulate-verify'a hic tiklamadan, ParcelPicker'a gecen ilk deger
        // dogrudan initialValue'dan gelmis olmali.
        expect(screen.getByTestId('parcel-lat')).toHaveTextContent('41')
        expect(screen.getByTestId('parcel-lng')).toHaveTextContent('29')
    })

    describe('mobil — dogrulandiktan sonra harita gizlenir (iOS safe-area tasma duzeltmesi)', () => {
        it('mobilde parsel dogrulaninca harita/toggle kalkar, kompakt ozet gorunur', async () => {
            viewportKur(false) // mobil
            render(
                <ParcelVerificationSheet
                    isOpen
                    onClose={jest.fn()}
                    onConfirm={jest.fn()}
                    initialValue={{ lat: 41.0, lng: 29.0, parcel: VERIFIED_PARCEL, status: 'verified' }}
                />,
            )

            await waitFor(() => {
                expect(screen.queryByTestId('parcel-picker')).not.toBeInTheDocument()
                expect(screen.queryByRole('button', { name: 'Haritadan' })).not.toBeInTheDocument()
                expect(screen.queryByRole('button', { name: 'Elle gir' })).not.toBeInTheDocument()
            })
            expect(screen.getByText(/Kırkkepenekli/)).toBeInTheDocument()
            expect(screen.getByText(/830 m²/)).toBeInTheDocument()
        })

        it('masaustunde parsel dogrulanmis olsa da harita/toggle gizlenmez (masaustu davranisi degismedi)', async () => {
            viewportKur(true) // masaustu
            render(
                <ParcelVerificationSheet
                    isOpen
                    onClose={jest.fn()}
                    onConfirm={jest.fn()}
                    initialValue={{ lat: 41.0, lng: 29.0, parcel: VERIFIED_PARCEL, status: 'verified' }}
                />,
            )
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
            expect(screen.getByRole('button', { name: 'Haritadan' })).toBeInTheDocument()
        })

        it('mobil kompakt ozette Degistir tiklaninca harita/toggle geri doner', async () => {
            viewportKur(false)
            render(
                <ParcelVerificationSheet
                    isOpen
                    onClose={jest.fn()}
                    onConfirm={jest.fn()}
                    initialValue={{ lat: 41.0, lng: 29.0, parcel: VERIFIED_PARCEL, status: 'verified' }}
                />,
            )
            await waitFor(() => expect(screen.queryByTestId('parcel-picker')).not.toBeInTheDocument())

            fireEvent.click(screen.getByRole('button', { name: 'Değiştir' }))

            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
            expect(screen.queryByText(/Kırkkepenekli/)).not.toBeInTheDocument()
        })

        it('mobilde ipucu metni mockup ile ayni kisa cumle olmali, masaustunde eski uzun metin kalir', async () => {
            viewportKur(false)
            render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
            expect(screen.getByText('Arsanızın bulunduğu noktaya haritadan tıklayın.')).toBeInTheDocument()
            expect(screen.queryByText(/Tapu ve Kadastro Genel Müdürlüğü/)).not.toBeInTheDocument()
        })

        it('masaustunde eski uzun ipucu metni korunur', async () => {
            viewportKur(true)
            render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
            expect(screen.getByText(/Tapu ve Kadastro Genel Müdürlüğü/)).toBeInTheDocument()
        })
    })

    describe('Elle gir — ada/parsel exact match direkt verified state üretir', () => {
        it('mobilde: mahalle+ada+parsel TKGM ile eslesirse harita/Dogrula adimi atlanir, kompakt ozet direkt gorunur', async () => {
            viewportKur(false) // mobil
            // NOT: paylasilan VERIFIED_PARCEL'in geometry.coordinates BOS —
            // ManualParcelEntryForm'un yeni exact-lookup dali polygonCentroid'in
            // GERCEK bir nokta donmesine bagli (bos poligon -> null -> sessiz
            // fallback'e duser, bu testin amacini bosa cikarir). Bu yuzden burada
            // gercek koseleri olan yerel bir varyant kullaniliyor.
            const parcelWithGeometry = {
                ...VERIFIED_PARCEL,
                geometry: { type: 'Polygon' as const, coordinates: [[[35.0, 37.0], [35.2, 37.0], [35.2, 37.2], [35.0, 37.2]]] },
            }
            let call = 0
            const responses: unknown[] = [
                { iller: [{ id: 34, text: 'İstanbul' }] },
                { ilceler: [{ id: 539, text: 'Kadıköy' }] },
                { mahalleler: [{ id: 147964, text: 'Göztepe', centroid: { lat: 99, lng: 99 } }] },
                { status: 'verified', parcel: parcelWithGeometry },
            ]
            global.fetch = jest.fn().mockImplementation(() => {
                const body = responses[Math.min(call, responses.length - 1)]
                call++
                return Promise.resolve({ ok: true, json: async () => body })
            }) as unknown as typeof fetch

            render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

            fireEvent.click(screen.getByRole('button', { name: 'Elle gir' }))
            fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'İstanbul' } })
            fireEvent.click(await screen.findByText('İstanbul'))

            await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Kadıköy' } })
            fireEvent.click(await screen.findByText('Kadıköy'))

            await waitFor(() => expect(screen.getByLabelText('Mahalle')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Göztepe' } })
            fireEvent.click(await screen.findByText('Göztepe'))

            fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '0' } })
            fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1871' } })

            fireEvent.click(screen.getByRole('button', { name: 'Sorgula' }))

            // ParcelPicker'in "Parseli Dogrula"suna (simulate-verify) HIC
            // basilmadan, dogrudan mobil kompakt "dogrulandi" ozeti gorunmeli.
            await waitFor(() => {
                expect(screen.queryByTestId('parcel-picker')).not.toBeInTheDocument()
                expect(screen.getByText(/Kırkkepenekli/)).toBeInTheDocument()
                expect(screen.getByText(/830 m²/)).toBeInTheDocument()
            })
        })

        it('masaustunde: mahalle+ada+parsel TKGM ile TAM eslesirse "Kullanıcı beyanı...TKGM sonucuyla karşılaştırın" notu gosterilmez (kendiyle celisir — TKGM sonucu zaten kullanicinin beyani)', async () => {
            viewportKur(true) // masaustu — harita her zaman gorunur, kompakt ozete gecilmez
            const parcelWithGeometry = {
                ...VERIFIED_PARCEL,
                geometry: { type: 'Polygon' as const, coordinates: [[[35.0, 37.0], [35.2, 37.0], [35.2, 37.2], [35.0, 37.2]]] },
            }
            let call = 0
            const responses: unknown[] = [
                { iller: [{ id: 34, text: 'İstanbul' }] },
                { ilceler: [{ id: 539, text: 'Kadıköy' }] },
                { mahalleler: [{ id: 147964, text: 'Göztepe', centroid: { lat: 99, lng: 99 } }] },
                { status: 'verified', parcel: parcelWithGeometry },
            ]
            global.fetch = jest.fn().mockImplementation(() => {
                const body = responses[Math.min(call, responses.length - 1)]
                call++
                return Promise.resolve({ ok: true, json: async () => body })
            }) as unknown as typeof fetch

            render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

            fireEvent.click(screen.getByRole('button', { name: 'Elle gir' }))
            fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'İstanbul' } })
            fireEvent.click(await screen.findByText('İstanbul'))

            await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Kadıköy' } })
            fireEvent.click(await screen.findByText('Kadıköy'))

            await waitFor(() => expect(screen.getByLabelText('Mahalle')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Göztepe' } })
            fireEvent.click(await screen.findByText('Göztepe'))

            // VERIFIED_PARCEL.adaNo === '0', parselNo === '1871' — beyanla TAM eslesir.
            fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '0' } })
            fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1871' } })

            fireEvent.click(screen.getByRole('button', { name: 'Sorgula' }))

            // Masaustunde harita her zaman gorunur (kompakt ozete GECILMEZ), ama
            // exact match sonrasi "beyaninizi TKGM ile karsilastirin" notu artik
            // anlamsiz oldugu icin gosterilmemeli.
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
            expect(screen.queryByText(/Kullanıcı beyanı/i)).not.toBeInTheDocument()
        })

        it('mahalle+ada+parsel eslesmezse (not_found) harita moduna doner, status idle kalir (bugunku davranis)', async () => {
            viewportKur(true) // masaustu — ParcelPicker mock'u dogrudan gozlenebilsin
            let call = 0
            const responses: unknown[] = [
                { iller: [{ id: 34, text: 'İstanbul' }] },
                { ilceler: [{ id: 539, text: 'Kadıköy' }] },
                { mahalleler: [{ id: 147964, text: 'Göztepe', centroid: { lat: 41.0, lng: 29.0 } }] },
                { status: 'not_found' },
            ]
            global.fetch = jest.fn().mockImplementation(() => {
                const body = responses[Math.min(call, responses.length - 1)]
                call++
                return Promise.resolve({ ok: true, json: async () => body })
            }) as unknown as typeof fetch

            render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

            fireEvent.click(screen.getByRole('button', { name: 'Elle gir' }))
            fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'İstanbul' } })
            fireEvent.click(await screen.findByText('İstanbul'))

            await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Kadıköy' } })
            fireEvent.click(await screen.findByText('Kadıköy'))

            await waitFor(() => expect(screen.getByLabelText('Mahalle')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Göztepe' } })
            fireEvent.click(await screen.findByText('Göztepe'))

            fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '1' } })
            fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1' } })

            fireEvent.click(screen.getByRole('button', { name: 'Sorgula' }))

            // Harita moduna doner (mahalle centroidiyle), ama status HALA idle —
            // Aktar butonu devre disi kalir, kullanici elle "Parseli Dogrula"
            // basmali (bugunku davranis, degismedi).
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
            expect(screen.getByTestId('parcel-lat')).toHaveTextContent('41')
            expect(screen.getByTestId('parcel-lng')).toHaveTextContent('29')
            expect(screen.getByRole('button', { name: /Hesaplamaya Aktar/i })).toBeDisabled()
        })
    })
})
