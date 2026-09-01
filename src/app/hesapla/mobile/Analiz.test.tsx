/** @jest-environment jsdom */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { AnalizSekmesi } from './AnalizSekmesi'

// Chart.js jsdom'da canvas gerektirir; sekmenin SOZLESMESI test ediliyor,
// grafiklerin kendi cizimi degil (onlarin kendi testleri var).
jest.mock('@/components/charts/SensitivityChart', () => ({
    SensitivityChart: () => <div data-testid="sensitivity" />,
}))
jest.mock('@/components/charts/BreakEvenChart', () => ({
    BreakEvenChart: () => <div data-testid="break-even" />,
}))
jest.mock('@/components/FinancialDashboard', () => ({
    FinancialDashboard: () => <div data-testid="financial" />,
}))

const BASE_INPUT = {
    x: 0.33, L: 1.2, Ad: 140, P: 12000, K: 1.3,
    isRiskEnabled: false, R: 1,
    isExcavationEnabled: false, excavationMode: 'percentage' as const,
    Z: 0, MzOriginal: 0,
}

const RESULT = {
    Mi_base: 1500000, Mz: 0, Mi: 1680000, Ma: 4216000, M: 5896000,
    derivedX: 4216000 / 5896000,
    FD_total: 8964000, FD_per_m2: 64028, Z: 0, Sdx: null, FA: null, FAbirim: null, x_max: null,
}

describe('analiz grafikleri', () => {
    it('sabit P: 10000 kalintisi YOK', () => {
        // 2026-07-24'te duzeltilen gercek bir bug: SensitivityChart ve
        // BreakEvenChart sabit P:10000 kullanip gercek globalUnitPrice ile
        // tutarsiz sonuc gosteriyordu. Bu bir regresyon citidir.
        const dir = join(process.cwd(), 'src/components/charts')
        const files = readdirSync(dir).filter(f => f.endsWith('.tsx'))
        expect(files.length).toBeGreaterThan(0)
        for (const f of files) {
            const src = readFileSync(join(dir, f), 'utf8')
            expect(src).not.toMatch(/P:\s*10000/)
        }
    })
})

describe('AnalizSekmesi', () => {
    it('kendi basligini/Kapat butonunu ve Maliyet Dagilimi panelini render ETMEZ', () => {
        // Maliyet Dagilimi FiyatAciklamasi'nin (Ozet sekmesi) ayni veriyi
        // liste olarak zaten gosterdigi icin kasitli olarak buradan
        // kaldirildi (2026-08-23 IA sadelestirmesi) — kopyalanmadi.
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.queryByRole('button', { name: /Kapat/ })).toBeNull()
        expect(screen.queryByText('Analiz')).toBeNull()
        expect(screen.queryByRole('group', { name: 'Maliyet dağılımı' })).toBeNull()
    })

    it('grafikleri cam kart icinde render eder', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.getByTestId('sensitivity')).toBeInTheDocument()
        expect(screen.getByTestId('break-even')).toBeInTheDocument()
    })

    it('her grafik erisilebilir bir basliga sahip', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.getByRole('group', { name: 'Hassasiyet' })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Kırılma noktası' })).toBeInTheDocument()
    })

    it('sonuc yoksa grafik yerine aciklama gosterir', () => {
        render(<AnalizSekmesi result={null} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.getByText(/Hesap sonucu oluşunca/)).toBeInTheDocument()
    })

    it('finansal ozet de gosterilir', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.getByRole('group', { name: 'Finansal özet' })).toBeInTheDocument()
    })

    describe('maks. surdurulebilir arsa payi (x_max)', () => {
        it('x_max null -> kart hic render edilmez', () => {
            render(<AnalizSekmesi result={{ ...RESULT, x_max: null }} baseInput={BASE_INPUT} marketPrice={0} />)
            expect(
                screen.queryByRole('group', { name: 'Maksimum sürdürülebilir arsa payı' }),
            ).toBeNull()
        })

        it('x_max >= 0 -> yuzde deger + aciklama', () => {
            render(<AnalizSekmesi result={{ ...RESULT, x_max: 0.732 }} baseInput={BASE_INPUT} marketPrice={12000000} />)
            expect(
                screen.getByRole('group', { name: 'Maksimum sürdürülebilir arsa payı' }),
            ).toBeInTheDocument()
            expect(screen.getByText('%73.2')).toBeInTheDocument()
            expect(screen.getByText(/en yüksek pay/)).toBeInTheDocument()
        })

        it('x_max negatif -> proje mumkun degil mesaji, yuzde YOK', () => {
            render(<AnalizSekmesi result={{ ...RESULT, x_max: -0.15 }} baseInput={BASE_INPUT} marketPrice={2000000} />)
            expect(screen.getByText(/proje mümkün değil/)).toBeInTheDocument()
            expect(screen.queryByText(/%-/)).toBeNull()
        })
    })
})

// Sekme secici bileseninin testleri Task 6'da kaldirildi: bilesenin kendisi
// de AnalizSekmesi.tsx'ten kaldirildi (sekme seridi kalkti, spec K4/K5).

