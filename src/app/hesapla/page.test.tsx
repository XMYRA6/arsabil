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
        const kaliteBloku = screen.getByText('Daire Standardı').closest('div') as HTMLElement
        await user.click(within(kaliteBloku).getByText('Orta'))

        // Mi_base = 140 m² × 10.000 TL/m² × 1.25 (admin'in qualityMedium'u, SABIT
        // 1.2 DEGIL) = 1.750.000. Varsayilan risk seviyesi %10 oldugundan
        // (AYAR_VARSAYILANLARI.riskLevel) HesapFisi'nde gorunen "Insaat Maliyeti
        // (Mi)" bunun uzerine R=1.10 ile carpilir: 1.750.000 × 1.10 = 1.925.000.
        expect(await screen.findByText(/1\.925\.000/)).toBeInTheDocument()
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

        const kaliteBloku = screen.getByText('Daire Standardı').closest('div') as HTMLElement
        const ortaKutusu = within(kaliteBloku).getByText('Orta')
        await user.click(ortaKutusu)
        expect(ortaKutusu.closest('div')?.className).toMatch(/luxBoxActive/)

        // Admin degeri (1.2 -> 1.25) kullanicinin secimini yaptiktan SONRA gelsin.
        await act(async () => {
            resolveSettings()
            await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(ortaKutusu.closest('div')?.className).toMatch(/luxBoxActive/)
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

    it('"Gelişmiş Ayarlar" paneli İksa Masrafı + Müteahhit Kazancı içerir (Piyasa Fiyatı artık burada değil)', () => {
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
        // Piyasa fiyatı artık "Piyasa Değerine Göre" kartının kendi
        // bos-durumundan giriliyor (2026-08-14 UX kararı) — Gelişmiş
        // Ayarlar'da SADECE gerçek ince-ayar parametreleri kaldı.
        expect(within(panel).queryByText('Yaklaşık Piyasa Fiyatı')).toBeNull()
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

describe('/hesapla — masaüstü "Arsa Fiyatı" stat kartı "Min." niteleyicisiyle etiketlenir (denetim bulgusu C5)', () => {
    it('FA piyasa degeri degil, hesaplanan minimum fiyata dayali oldugu icin "Min." on eki tasir', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        const toggleRow = screen.getByText('Arsa Payı').closest('div') as HTMLElement
        await user.click(within(toggleRow).getByRole('checkbox'))

        expect(await screen.findByText('Min. Arsa Fiyatı (Arsa Sahibine)')).toBeInTheDocument()
        expect(screen.queryByText('Arsa Fiyatı (Arsa Sahibine)')).not.toBeInTheDocument()
    })
})

describe('/hesapla — masaüstü Maksimum Sürdürülebilir Arsa Payı (denetim bulgusu C6)', () => {
    it('piyasa fiyatı girilmemişse kart hiç görünmez', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        expect(screen.queryByText('Maks. Sürdürülebilir Arsa Payı')).toBeNull()
    })

    it('piyasa fiyatı girilince x_max yüzde olarak gösterilir', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        // Piyasa fiyatı artık "Piyasa Değerine Göre" kartının kendi
        // davetinden giriliyor (2026-08-14 UX kararı): tıkla -> yaz -> Enter.
        await user.click(await screen.findByRole('button', { name: /Piyasa Fiyatını Gir/i }))
        const piyasaInput = screen.getByRole('textbox', { name: 'Yaklaşık Piyasa Fiyatı' })
        await user.type(piyasaInput, '10000000')
        await user.keyboard('{Enter}')

        expect(await screen.findByText('Maks. Sürdürülebilir Arsa Payı')).toBeInTheDocument()
        expect(screen.getByText(/^%/)).toBeInTheDocument()
    })

    it('x_max negatifse ("bu fiyata proje mümkün değil") yüzde yerine anlaşılır bir uyarı gösterir, cam sayı DEĞİL', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        await user.click(await screen.findByRole('button', { name: /Piyasa Fiyatını Gir/i }))
        const piyasaInput = screen.getByRole('textbox', { name: 'Yaklaşık Piyasa Fiyatı' })
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
        const toggleRow = screen.getByText('Arsa Payı').closest('div') as HTMLElement
        await user.click(within(toggleRow).getByRole('checkbox'))

        const slider = screen.getByRole('slider', { name: 'Arsa Sahibine Düşen Daire' })
        // Varsayılan totalApartments (AYAR_VARSAYILANLARI) 24'tür.
        expect(slider).toHaveAttribute('max', '23')
    })
})


describe('/hesapla — masaüstü girdi kartı sırası mobille aynı (denetim sonrası UX düzeltmesi)', () => {
    it('sidebar başlıkları Konum→Arsa Alanı→Daire Standardı→Daire m²→Birim Maliyet→Arsa Payı→Deprem Riski sırasında render edilir', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const sidebar = await screen.findByText('Proje Bilgileri')
        const container = sidebar.closest('.desktopSidebar') as HTMLElement
        const beklenenSira = ['[data-girdi-blok="konum"]', '[data-girdi-blok="arsa-alani"]']
        const html = container.innerHTML
        const indeksler = beklenenSira.map(sel => {
            const el = container.querySelector(sel)
            expect(el).not.toBeNull()
            return Array.from(container.querySelectorAll('*')).indexOf(el as Element)
        })
        for (let i = 1; i < indeksler.length; i++) expect(indeksler[i]).toBeGreaterThan(indeksler[i - 1])
        const baslikMetinleri = ['Daire Standardı', 'Ortalama Daire Metrekaresi', 'Birim inşaat maliyeti', 'Deprem Riski']
        const pozisyonlar = baslikMetinleri.map(metin => html.indexOf(metin))
        pozisyonlar.forEach(p => expect(p).toBeGreaterThan(-1))
        for (let i = 1; i < pozisyonlar.length; i++) expect(pozisyonlar[i]).toBeGreaterThan(pozisyonlar[i - 1])
        expect(html.indexOf('Deprem Riski')).toBeGreaterThan(html.indexOf('Birim inşaat maliyeti'))
    })

    it('SmartContextCard artik render edilmiyor (sidebar dogrudan alt-bilesenleri kullaniyor)', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        await screen.findByText('Proje Bilgileri')
        expect(document.querySelector('.container[class*="SmartContextCard"]')).toBeNull()
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
        const sidebar = screen.getByText('Proje Bilgileri').closest('.desktopSidebar') as HTMLElement
        const slider = within(sidebar).getByLabelText('Arsa payı yüzdesi')
        fireEvent.change(slider, { target: { value: '45' } })
        expect(slider).toHaveValue('45')
    })

    it('daire-sayısı modunda (toggle açık) sidebar\'daki tek blokta türetilmiş yüzde notu görünür', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        const toggleRow = screen.getByText('Arsa Payı').closest('div') as HTMLElement
        await user.click(within(toggleRow).getByRole('checkbox'))
        expect(await screen.findByText(/Arsa payı.*%0.*olarak hesaplanıyor/)).toBeInTheDocument()
    })
})
