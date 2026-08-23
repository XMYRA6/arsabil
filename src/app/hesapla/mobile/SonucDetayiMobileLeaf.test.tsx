/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SonucDetayiMobileLeaf } from './SonucDetayiMobileLeaf'
import type { CalculationOutput } from '@/lib/calculator/engine_v2'

const RESULT = {
    Mi_base: 1500000, Mz: 0, Mi: 1680000, Ma: 4216000, M: 5896000,
    derivedX: 4216000 / 5896000,
    FD_total: 8964000, FD_per_m2: 64028, Z: 0, Sdx: null, FA: null, FAbirim: null, x_max: null,
} as unknown as CalculationOutput

const BASE_INPUT = {
    x: 0.33, L: 1.2, Ad: 140, P: 12000, K: 1.3,
    isRiskEnabled: false, R: 1,
    isExcavationEnabled: false, excavationMode: 'percentage' as const,
    Z: 0, MzOriginal: 0,
}

jest.mock('@/components/charts/SensitivityChart', () => ({
    SensitivityChart: () => <div data-testid="sensitivity" />,
}))
jest.mock('@/components/charts/BreakEvenChart', () => ({
    BreakEvenChart: () => <div data-testid="break-even" />,
}))
jest.mock('@/components/FinancialDashboard', () => ({
    FinancialDashboard: () => <div data-testid="financial" />,
}))

function props(patch = {}) {
    return {
        fiyatAciklamasi: {
            result: RESULT, apartmentSize: 140, unitPrice: 12000,
            landSharePercent: 33, profitLabel: 'Orta', profitMultiplier: 1.3,
            onKarDegistir: jest.fn(),
        },
        analiz: { result: RESULT, baseInput: BASE_INPUT, marketPrice: 10000000 },
        onKapat: jest.fn(),
        ...patch,
    }
}

beforeEach(() => {
    localStorage.clear()
})

describe('SonucDetayiMobileLeaf', () => {
    it('basligi ve Kapat butonunu render eder, Kapat tiklaninca onKapat cagirir', async () => {
        const onKapat = jest.fn()
        render(<SonucDetayiMobileLeaf {...props({ onKapat })} />)
        expect(screen.getByRole('heading', { name: 'Sonuç Detayı' })).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(onKapat).toHaveBeenCalledTimes(1)
    })

    it('varsayilan olarak Ozet sekmesi acik gelir (FiyatAciklamasi icerigi gorunur)', () => {
        render(<SonucDetayiMobileLeaf {...props()} />)
        expect(screen.getByText(/Daireyi inşa etmek/)).toBeInTheDocument()
        expect(screen.queryByTestId('sensitivity')).toBeNull()
    })

    it('Grafikler sekmesine gecince AnalizSekmesi icerigi gorunur, Ozet gizlenir', async () => {
        render(<SonucDetayiMobileLeaf {...props()} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Grafikler' }))
        expect(screen.getByTestId('sensitivity')).toBeInTheDocument()
        expect(screen.getByTestId('break-even')).toBeInTheDocument()
        expect(screen.getByTestId('financial')).toBeInTheDocument()
        expect(screen.queryByText(/Daireyi inşa etmek/)).toBeNull()
    })

    it('Grafikler sekmesinde Maliyet Dagilimi TEKRARLANMAZ (Ozet ile ayni veri)', async () => {
        render(<SonucDetayiMobileLeaf {...props()} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Grafikler' }))
        expect(screen.queryByRole('group', { name: 'Maliyet dağılımı' })).toBeNull()
    })

    it('Ozet -> Grafikler -> Ozet gecisinde fiyat dokumu geri gelir', async () => {
        render(<SonucDetayiMobileLeaf {...props()} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Grafikler' }))
        await userEvent.click(screen.getByRole('tab', { name: 'Özet' }))
        expect(screen.getByText(/Daireyi inşa etmek/)).toBeInTheDocument()
    })
})
