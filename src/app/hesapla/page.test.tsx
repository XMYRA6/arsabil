/** @jest-environment jsdom */
import React from 'react'
import { act, render, screen, within } from '@testing-library/react'
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
// Grafikler bu testin konusu degil.
jest.mock('@/components/charts/PriceEvaluationChart', () => ({ PriceEvaluationChart: () => <div /> }))
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
        expect(await screen.findByText(/Min\. Daire Fiyatı \(FD\)/)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Örnek Proje ile Dene/i })).not.toBeInTheDocument()
    })

    it('Rapor Kaydet boş durumda devre dışıdır', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const buton = await screen.findByRole('button', { name: /Rapor Kaydet/i })
        expect(buton).toBeDisabled()
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
        expect(await screen.findByText('Örnek Veri')).toBeInTheDocument()

        // Kullanici etkilesiminden SONRA gec gelen /api/settings cevabini serbest birak.
        await act(async () => {
            resolveSettings()
            await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(screen.getByText('Örnek Veri')).toBeInTheDocument()
    })
})

describe('/hesapla — masaüstü Gelişmiş Ayarlar paneli (sütun dengesi)', () => {
    it('İksa Masrafı ve Müteahhit Kazancı artık sol "Proje Bilgileri" sidebar\'ında DEĞİL', () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const sidebar = screen.getByText('Proje Bilgileri').closest('aside') as HTMLElement
        expect(within(sidebar).queryByText('İksa Masrafı')).toBeNull()
        expect(within(sidebar).queryByText('Müteahhit Kazancı')).toBeNull()
        expect(within(sidebar).queryByText('Piyasa Analizi')).toBeNull()
    })

    it('Birim İnşaat Maliyeti sol sidebar\'da KALIR', () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const sidebar = screen.getByText('Proje Bilgileri').closest('aside') as HTMLElement
        expect(within(sidebar).getByText('Birim inşaat maliyeti')).toBeInTheDocument()
    })

    it('"Gelişmiş Ayarlar" paneli İksa Masrafı + Müteahhit Kazancı + Piyasa Karşılaştırması içerir', () => {
        viewportKur(true)
        render(<HesaplaPage />)
        // `getByText('Gelişmiş Ayarlar')` başlık div'inin KENDİSİNİ döner
        // (`.advancedPanelTitle` de bir div) — `.closest('div')` bu durumda
        // kendisini döner, kardeş `.advancedPanelCols`'u KAPSAMAZ. CSS
        // module'ler jest'te `identity-obj-proxy` ile literal class adına
        // eşleniyor (`jest.config.js:7`), bu yüzden `.advancedPanel`
        // gerçek bir CSS selector olarak çalışır.
        const panel = screen.getByText('Gelişmiş Ayarlar').closest('.advancedPanel') as HTMLElement
        expect(within(panel).getByText('İksa Masrafı')).toBeInTheDocument()
        expect(within(panel).getByText('Müteahhit Kazancı')).toBeInTheDocument()
        expect(within(panel).getByText('Yaklaşık Piyasa Fiyatı')).toBeInTheDocument()
    })

    it('yeni konumda İksa Masrafı "Yüzde" seçilince yüzde input\'u açılır (kablolama sağlam)', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        const panel = screen.getByText('Gelişmiş Ayarlar').closest('.advancedPanel') as HTMLElement
        await user.click(within(panel).getByText('Yüzde'))
        expect(within(panel).getByRole('spinbutton')).toBeInTheDocument()
    })
})
