/** @jest-environment jsdom */
import React from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HesaplaPage from './page'

// `page.tsx`i render eden ILK davranis testi. Onceki whole-branch review'in
// I5 bulgusu tam da buydu: iki gercek kusur (I1/I2) yalnizca bu seviyede
// gorulebilecekken, birim testler onlari gormeden yesil kaliyordu.
//
// Bu dosyanin ozel gorevi PLATFORM DALLARI: `page.tsx` mobilde erken donup
// masaustu agacini tamamen atliyor. Bir overlay yalnizca masaustu dalina
// konursa mobilde SESSIZCE olur — buton state'i set eder, hicbir sey render
// edilmez. `AuthModal` bu tuzagi bir kez yasadi ve kod icinde uyari yorumu
// birakildi; `ParcelModal` ayni tuzaga yeniden dustu.

jest.mock('next-auth/react', () => ({
    useSession: () => ({ data: null, status: 'unauthenticated' }),
}))

// `AuthModal` app router'i istiyor; jsdom'da mount edilmis bir router yok.
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}))

// `ScenarioCompare` modul seviyesinde `jspdf` cekiyor, o da jsdom'da olmayan
// `TextEncoder`i istiyor. Bu testin konusu degil; masaustu dalinda yer tutuyor.
jest.mock('@/components/ScenarioCompare', () => ({
    ScenarioCompare: () => <div data-testid="scenario-compare" />,
}))

// chart.js jsdom'da canvas bulamayip `getContext` uzerinden cokuyor.
// Grafikler bu testin konusu degil. `PriceEvaluationChart` chart.js
// KULLANMIYOR (duz div/buton) — MOCK'LANMIYOR, ciddi C6/piyasa fiyati
// testleri gercek bilesenle etkilesiyor.
jest.mock('@/components/charts/CostBreakdownChart', () => ({ CostBreakdownChart: () => <div /> }))
jest.mock('@/components/charts/SensitivityChart', () => ({ SensitivityChart: () => <div /> }))
jest.mock('@/components/charts/BreakEvenChart', () => ({ BreakEvenChart: () => <div /> }))
jest.mock('@/components/FinancialDashboard', () => ({ FinancialDashboard: () => <div /> }))

jest.mock('@/components/listing-wizard/ParcelPicker', () => {
    const MockParcelPicker = React.forwardRef((_props: unknown, _ref: unknown) => <div data-testid="parcel-picker" />)
    MockParcelPicker.displayName = 'MockParcelPicker'
    return {
        // Leaflet jsdom'da mount edilemez; burada haritanin kendisi degil
        // ParcelVerificationSheet'in VARLIGI test ediliyor. forwardRef ile
        // sarmalanmis: ParcelVerificationSheet artik ParcelPicker'a ref geciyor.
        ParcelPicker: MockParcelPicker,
    }
})

/** `matchMedia`yi verilen platforma gore sabitler. */
function viewportKur(masaustu: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            // Sayfa `not all and (max-width: 768px)` sorguluyor: masaustunde true.
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
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    ) as unknown as typeof fetch
})

afterEach(() => {
    jest.clearAllMocks()
})

describe('/hesapla — parsel modali her iki platformda da mount edilir', () => {
    it('MOBILDE "Haritadan parsel sec" modali acar', async () => {
        viewportKur(false)
        const user = userEvent.setup()
        render(<HesaplaPage />)

        // Kapali halde modal DOM'da olmamali (regresyon testinin kirilabilir
        // olmasi icin sart: modal hep acik olsaydi test hicbir sey kanitlamaz).
        expect(screen.queryByText('Haritadan Parsel Doğrula')).toBeNull()

        await user.click(await screen.findByRole('button', { name: /Haritadan parsel seç/i }))

        expect(screen.getByText('Haritadan Parsel Doğrula')).toBeInTheDocument()
        expect(screen.getByTestId('parcel-picker')).toBeInTheDocument()
    })

    it('MASAUSTUNDE "Haritadan parsel sec" modali acar', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)

        expect(screen.queryByText('Haritadan Parsel Doğrula')).toBeNull()

        await user.click(await screen.findByRole('button', { name: /Haritadan parsel seç/i }))

        expect(screen.getByText('Haritadan Parsel Doğrula')).toBeInTheDocument()
        expect(screen.getByTestId('parcel-picker')).toBeInTheDocument()
    })
})

describe('/hesapla — boş durum + Örnek Proje ile Dene (masaüstü)', () => {
    it('sayfa ilk açıldığında hiçbir TL değeri göstermez, boş durum metni görünür', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        expect(await screen.findByText(/Sonuçları görmek için/)).toBeInTheDocument()
        expect(screen.queryByText(/Min\. Daire Fiyatı \(FD\)/)).not.toBeInTheDocument()
    })

    it('Örnek Proje ile Dene tıklanınca sonuç belirir ve buton kaybolur', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        expect(await screen.findByText(/Min\. daire fiyatı \(FD\)/i)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Örnek Proje ile Dene/i })).not.toBeInTheDocument()
    })

    it('Özet rapor oluştur boş durumda devre dışıdır', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        // Eylem satırındaki düğme + sabit CTA aynı metni taşır; hepsi devre dışı olmalı.
        const butonlar = await screen.findAllByRole('button', { name: /Özet rapor oluştur/i })
        expect(butonlar.length).toBeGreaterThan(0)
        butonlar.forEach(b => expect(b).toBeDisabled())
    })

    it('geç gelen /api/settings defaultUnitPrice, Örnek Proje ile Dene ile girilmiş değeri ezmez', async () => {
        // Regresyon: `globalUnitPrice`e tek raw yazim yolu bu mount efekti idi
        // (bkz. handleGlobalUnitPriceChange disinda). Admin varsayilani mount'tan
        // SONRA gelirse eskiden number->number yazip demo/kullanici degerini
        // sessizce eziyordu. Fix: `setGlobalUnitPrice(prev => prev ?? veri)`.
        viewportKur(true)
        let resolveSettings: () => void = () => {}
        const settingsGecikmesi = new Promise<void>(resolve => { resolveSettings = resolve })
        global.fetch = jest.fn((url: string) => {
            if (url === '/api/settings') {
                return settingsGecikmesi.then(() => ({
                    ok: true,
                    json: () => Promise.resolve({ defaultUnitPrice: 99999 }),
                }))
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        }) as unknown as typeof fetch

        const user = userEvent.setup()
        render(<HesaplaPage />)

        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        expect((await screen.findAllByText(/Örnek veri/i)).length).toBeGreaterThan(0)

        // Kullanici etkilesiminden SONRA gec gelen /api/settings cevabini serbest birak.
        await act(async () => {
            resolveSettings()
            await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(screen.getAllByText(/Örnek veri/i).length).toBeGreaterThan(0)
    })
})

describe('/hesapla — masaüstü Yapı Standardı admin katsayılarına bağlı (denetim bulgusu C3)', () => {
    it('admin panelinin qualityMedium değeri gerçekten hesaba yansır (artık sabit 1.2 DEĞİL)', async () => {
        global.fetch = jest.fn((url: string) => {
            if (url === '/api/settings') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ qualityStandard: 1.0, qualityMedium: 1.25, qualityLux: 1.4, defaultUnitPrice: 10000 }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        }) as unknown as typeof fetch

        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)

        // Admin degerinin (defaultUnitPrice=10000) fetch'ten UYGULANMASINI bekle
        // — yoksa "Örnek Proje ile Dene" globalUnitPrice hala null saniyor ve
        // kendi varsayilanini (12000) kullaniyor, test yanlis degerle karsilastirirdi.
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0))
        })

        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        await user.click(screen.getByRole('tab', { name: 'Orta' }))

        // Mi_base = 140 m² × 10.000 TL/m² × 1.25 (admin'in qualityMedium'u, SABIT
        // 1.2 DEGIL) = 1.750.000. Varsayilan risk seviyesi %10 oldugundan
        // (AYAR_VARSAYILANLARI.riskLevel) risk payi ayri satir: Hesap fisinde
        // "Insaat maliyeti" risksiz 1.750.000, "Risk payi (%10)" 175.000 (Figma).
        expect((await screen.findAllByText(/1\.750\.000/)).length).toBeGreaterThan(0)
    })

    it('admin qualityMedium\'u degistirdikten SONRA bile "Orta" secimi kaybolmaz (tier bazli secim — denetim bulgusu C3)', async () => {
        let resolveSettings: () => void = () => {}
        const settingsGecikmesi = new Promise<void>(resolve => { resolveSettings = resolve })
        global.fetch = jest.fn((url: string) => {
            if (url === '/api/settings') {
                return settingsGecikmesi.then(() => ({
                    ok: true,
                    json: () => Promise.resolve({ qualityMedium: 1.25 }),
                }))
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        }) as unknown as typeof fetch

        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)

        const ortaSekmesi = screen.getByRole('tab', { name: 'Orta' })
        await user.click(ortaSekmesi)
        expect(ortaSekmesi).toHaveAttribute('aria-selected', 'true')

        // Admin degeri (1.2 -> 1.25) kullanicinin secimini yaptiktan SONRA gelsin.
        await act(async () => {
            resolveSettings()
            await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(screen.getByRole('tab', { name: 'Orta' })).toHaveAttribute('aria-selected', 'true')
    })
})

describe('/hesapla — masaüstü Gelişmiş ayarlar (sol kartta açılır bölüm)', () => {
    const solKart = () => screen.getByRole('region', { name: 'Proje girdileri' })

    it('İksa maliyeti ve Müteahhit kâr hedefi başlangıçta kapalı (Gelişmiş ayarlar açılana kadar görünmez)', () => {
        viewportKur(true)
        render(<HesaplaPage />)
        expect(within(solKart()).queryByText('İksa maliyeti')).toBeNull()
        expect(within(solKart()).queryByText('Müteahhit kâr hedefi')).toBeNull()
    })

    it('Birim maliyet sol kartta durur', () => {
        viewportKur(true)
        render(<HesaplaPage />)
        expect(within(solKart()).getByText('Birim maliyet')).toBeInTheDocument()
    })

    it('"Gelişmiş ayarlar" satırı açılır; İksa maliyeti, Müteahhit kâr hedefi ve piyasa fiyatı gelir', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        const satir = within(solKart()).getByRole('button', { name: 'Gelişmiş ayarlar' })
        expect(satir).toHaveAttribute('aria-expanded', 'false')
        await user.click(satir)
        expect(satir).toHaveAttribute('aria-expanded', 'true')
        expect(within(solKart()).getByText('İksa maliyeti')).toBeInTheDocument()
        expect(within(solKart()).getByText('Müteahhit kâr hedefi')).toBeInTheDocument()
        expect(within(solKart()).getByText('Piyasa daire fiyatı (isteğe bağlı)')).toBeInTheDocument()
    })

    it('açılan bölümde iksa "Elle (₺)" seçilince tutar alanı, "Yüzde" seçilince oran alanı gelir (kablolama sağlam)', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(within(solKart()).getByRole('button', { name: 'Gelişmiş ayarlar' }))
        await user.click(within(solKart()).getByRole('button', { name: 'Elle (₺)' }))
        expect(within(solKart()).getByRole('textbox', { name: 'İksa tutarı' })).toBeInTheDocument()
        await user.click(within(solKart()).getByRole('button', { name: 'Yüzde' }))
        expect(within(solKart()).getByRole('spinbutton', { name: 'İksa oranı' })).toBeInTheDocument()
    })
})

describe('/hesapla — masaüstü "Arsa Fiyatı" stat kartı "Min." niteleyicisiyle etiketlenir (denetim bulgusu C5)', () => {
    it('FA piyasa degeri degil, hesaplanan minimum fiyata dayali oldugu icin "Min." on eki tasir', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        await user.click(screen.getByRole('switch', { name: /Toplam daire sayısı üzerinden hesapla/ }))

        expect(await screen.findByText(/Min\. arsa fiyatı \(FA\)/i)).toBeInTheDocument()
        expect(screen.queryByText(/^Arsa fiyatı \(FA\)/i)).not.toBeInTheDocument()
    })
})

describe('/hesapla — masaüstü Maksimum Sürdürülebilir Arsa Payı (denetim bulgusu C6)', () => {
    it('piyasa fiyatı girilmemişse kart hiç görünmez', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        expect(screen.queryByText(/Maks\. sürdürülebilir arsa payı/i)).toBeNull()
    })

    it('piyasa fiyatı girilince x_max yüzde olarak gösterilir', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        // Piyasa fiyatı "Piyasa değerine göre" kartının kendi girdisinden giriliyor
        // (2026-08-14 UX kararı): yaz -> Enter.
        const piyasaInput = await screen.findByRole('textbox', { name: 'Yaklaşık Piyasa Fiyatı' })
        await user.type(piyasaInput, '10000000')
        await user.keyboard('{Enter}')

        expect(await screen.findByText(/Maks\. sürdürülebilir arsa payı/i)).toBeInTheDocument()
        expect(screen.getAllByText(/^%/).length).toBeGreaterThan(0)
    })

    it('x_max negatifse ("bu fiyata proje mümkün değil") yüzde yerine anlaşılır bir uyarı gösterir, cam sayı DEĞİL', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        const piyasaInput = await screen.findByRole('textbox', { name: 'Yaklaşık Piyasa Fiyatı' })
        // Cok dusuk bir piyasa fiyati -> maliyet fiyati asiyor -> x_max negatif.
        await user.type(piyasaInput, '1')
        await user.keyboard('{Enter}')

        expect(await screen.findByText(/mümkün değil/)).toBeInTheDocument()
        expect(screen.queryByText(/^%-/)).toBeNull()
    })
})

describe('/hesapla — masaüstü "Arsa Sahibine Düşen Daire" slider üst sınırı (denetim bulgusu C1)', () => {
    it('slider max totalApartments-1 olmalı, müteahhide en az 1 daire kalmalı', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(screen.getByRole('switch', { name: /Toplam daire sayısı üzerinden hesapla/ }))

        const slider = screen.getByRole('slider', { name: 'Arsa sahibinin daire sayısı' })
        // Varsayılan totalApartments (AYAR_VARSAYILANLARI) 24'tür.
        expect(slider).toHaveAttribute('max', '23')
    })
})


describe('/hesapla — masaüstü girdi kartı sırası mobille aynı (denetim sonrası UX düzeltmesi)', () => {
    it('kart blokları Konum→Arsa Alanı→Ort. daire→Birim maliyet→Daire standardı→Arsa payı→Risk sırasında render edilir', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const kart = await screen.findByRole('region', { name: 'Proje girdileri' })
        const bloklar = Array.from(kart.querySelectorAll('[data-girdi-blok]')).map(el => el.getAttribute('data-girdi-blok'))
        expect(bloklar).toEqual(['konum', 'arsa-alani', 'daire-buyuklugu', 'birim-maliyet', 'yapi-standardi', 'arsa-payi', 'deprem-riski'])
    })

    it('SmartContextCard artik render edilmiyor (sol kolon mobille ortak GirdiKarti kullaniyor)', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        await screen.findByText('Proje bilgileri')
        expect(document.querySelector('.container[class*="SmartContextCard"]')).toBeNull()
    })
})
describe('/hesapla — masaüstü Emsal arsa maliyeti modeli', () => {
    it('ilçe arsa m² fiyatı ve arsa alanı yokken Emsal seçeneği devre dışıdır', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const modelBloku = await screen.findByRole('group', { name: 'Arsa maliyeti modeli' })

        expect(within(modelBloku).getByRole('button', { name: 'Oransal' })).toBeEnabled()
        expect(within(modelBloku).getByRole('button', { name: 'Emsal' })).toBeDisabled()
        expect(screen.getByText(/Emsal model için doğrulanmış arsa alanı/)).toBeInTheDocument()
    })
})


describe('/hesapla — masaüstü Arsa Payı TEK blokta (denetim sonrası UX düzeltmesi)', () => {
    it('main icinde eski ayrı "Arsa Payı" yüzde slider\'ı artık YOK', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        const main = document.getElementById('resultsPanel') as HTMLElement
        expect(within(main).queryByLabelText('Arsa payı yüzdesi')).toBeNull()
    })

    it('yüzde modunda (toggle kapalı) sidebar\'daki tek blokta yüzde slider\'ı çalışır', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        const sidebar = screen.getByRole('region', { name: 'Proje girdileri' })
        const slider = within(sidebar).getByLabelText('Arsa payı yüzdesi')
        fireEvent.change(slider, { target: { value: '45' } })
        expect(slider).toHaveValue('45')
    })

    it('yüzde slider\'ı hâlâ %100\'e kadar çıkabilir — müşteri talebiyle üst sınır kaldırılmadı, KELEPÇELENMEDİ', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        const sidebar = screen.getByRole('region', { name: 'Proje girdileri' })
        const slider = within(sidebar).getByLabelText('Arsa payı yüzdesi') as HTMLInputElement
        expect(slider.max).toBe('100')
    })

    it('yüzde %90 ve üzerine çıkınca motorun matematiksel olarak şiştiğini açıklayan bir uyarı belirir (denetim-2 bulgusu, kelepçe yerine şeffaflık)', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        const sidebar = screen.getByRole('region', { name: 'Proje girdileri' })
        const slider = within(sidebar).getByLabelText('Arsa payı yüzdesi')

        fireEvent.change(slider, { target: { value: '50' } })
        expect(screen.queryByText(/matematiksel olarak çok yükselir/)).toBeNull()

        fireEvent.change(slider, { target: { value: '95' } })
        expect(await screen.findByText(/matematiksel olarak çok yükselir/)).toBeInTheDocument()
    })

    it('daire-sayısı modunda (toggle açık) sidebar\'daki tek blokta türetilmiş yüzde notu görünür', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        await user.click(screen.getByRole('switch', { name: /Toplam daire sayısı üzerinden hesapla/ }))
        expect(await screen.findByText((_, el) => el?.tagName === 'P' && /Arsa payı.*%0.*olarak hesaplanıyor/.test(el.textContent ?? ''))).toBeInTheDocument()
    })
})
