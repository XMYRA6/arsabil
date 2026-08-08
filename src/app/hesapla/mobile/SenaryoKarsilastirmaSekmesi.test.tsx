/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SenaryoKarsilastirmaSekmesi } from './SenaryoKarsilastirmaSekmesi'

// ScenarioCompare (bu bilesenin icinde render edilir) jsPDF kullanir —
// jsPDF jsdom'da canvas/DOM islemleri yuzunden gercek haliyle calismaz.
// Bkz. ayni mock ScenarioCompare.test.tsx'te.
jest.mock('jspdf', () => {
    return jest.fn().mockImplementation(() => ({
        setFontSize: jest.fn(),
        text: jest.fn(),
        save: jest.fn(),
    }))
})
jest.mock('jspdf-autotable', () => jest.fn())

const SCENARIOS = [
    { id: 's1', name: 'Ekonomik', luxLevel: 1.0, apartmentSize: 100, landShareRatio: 0.3, totalApartments: 10, riskLevel: 1, builderProfit: 1.2, fdTotal: 4000000, fdPerM2: 40000, mi: 1500000, ma: 1000000, totalCost: 2500000 },
    { id: 's2', name: 'Lüks', luxLevel: 1.4, apartmentSize: 140, landShareRatio: 0.35, totalApartments: 8, riskLevel: 2, builderProfit: 1.3, fdTotal: 6000000, fdPerM2: 42857, mi: 2200000, ma: 1500000, totalCost: 3700000 },
]

describe('SenaryoKarsilastirmaSekmesi', () => {
    it('baslik + Kapat satirini gosterir, Kapat tiklaninca onKapat cagirir', () => {
        const onKapat = jest.fn()
        render(<SenaryoKarsilastirmaSekmesi scenarios={SCENARIOS} onKapat={onKapat} onShareRequest={jest.fn()} />)
        expect(screen.getByRole('heading', { name: 'Senaryo Karşılaştırması' })).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(onKapat).toHaveBeenCalled()
    })

    it('2 senaryoyla ScenarioCompare icerigini render eder', () => {
        render(<SenaryoKarsilastirmaSekmesi scenarios={SCENARIOS} onKapat={jest.fn()} onShareRequest={jest.fn()} />)
        expect(screen.getAllByText('Ekonomik').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Lüks').length).toBeGreaterThan(0)
    })

    it('1 senaryoyla ScenarioComparein kendi bos-durum mesajini gosterir (yaprak ayrica bir mesaj yazmaz)', () => {
        render(<SenaryoKarsilastirmaSekmesi scenarios={[SCENARIOS[0]]} onKapat={jest.fn()} onShareRequest={jest.fn()} />)
        expect(screen.getByText(/en az 2 senaryo gereklidir/i)).toBeInTheDocument()
    })
})
