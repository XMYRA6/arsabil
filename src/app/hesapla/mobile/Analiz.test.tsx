/** @jest-environment jsdom */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalizSekmesi } from './AnalizSekmesi'

// Chart.js jsdom'da canvas gerektirir; sekmenin SOZLESMESI test ediliyor,
// grafiklerin kendi cizimi degil (onlarin kendi testleri var).
const costProps: Record<string, unknown>[] = []
jest.mock('@/components/charts/CostBreakdownChart', () => ({
    CostBreakdownChart: (p: Record<string, unknown>) => { costProps.push(p); return <div data-testid="cost-breakdown" /> },
}))
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
    FD_total: 8964000, FD_per_m2: 64028, Z: 0, Sdx: null, FA: null, FAbirim: null,
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
    it('uc grafigi de cam kart icinde render eder', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} onKapat={jest.fn()} />)
        expect(screen.getByTestId('cost-breakdown')).toBeInTheDocument()
        expect(screen.getByTestId('sensitivity')).toBeInTheDocument()
        expect(screen.getByTestId('break-even')).toBeInTheDocument()
    })

    it('her grafik erisilebilir bir basliga sahip', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} onKapat={jest.fn()} />)
        expect(screen.getByRole('group', { name: 'Maliyet dağılımı' })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Hassasiyet' })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Kırılma noktası' })).toBeInTheDocument()
    })

    it('sonuc yoksa grafik yerine aciklama gosterir', () => {
        // Bos grafik cizmek yerine nedenini soyle: sifirlarla dolu bir
        // maliyet dagilimi kullaniciya yanlis bilgi verirdi.
        render(<AnalizSekmesi result={null} baseInput={BASE_INPUT} marketPrice={10000000} onKapat={jest.fn()} />)
        expect(screen.queryByTestId('cost-breakdown')).toBeNull()
        expect(screen.getByText(/Hesap sonucu oluşunca/)).toBeInTheDocument()
    })

    it('finansal ozet de gosterilir', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} onKapat={jest.fn()} />)
        expect(screen.getByRole('group', { name: 'Finansal özet' })).toBeInTheDocument()
    })

    it('kapat butonu onKapat i cagirir', async () => {
        const onKapat = jest.fn()
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} onKapat={onKapat} />)
        await userEvent.click(screen.getByRole('button', { name: /Kapat/ }))
        expect(onKapat).toHaveBeenCalledTimes(1)
    })

    it('maliyet dagilimi proplari motor alanlarindan dogru turetilir', () => {
        costProps.length = 0
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={0} onKapat={jest.fn()} />)
        expect(costProps[0]).toEqual({
            constructionCost: RESULT.Mi_base + RESULT.Mz,
            landValue: RESULT.Ma,
            profit: RESULT.FD_total - RESULT.M,
            risk: RESULT.Mi - RESULT.Mi_base - RESULT.Mz,
        })
    })
})

// Sekme secici bileseninin testleri Task 6'da kaldirildi: bilesenin kendisi
// de AnalizSekmesi.tsx'ten kaldirildi (sekme seridi kalkti, spec K4/K5).
