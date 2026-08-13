/** @jest-environment jsdom */
import type { ReactElement } from 'react'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { HesaplaMobile, type HesaplaMobileProps } from './HesaplaMobile'
import type { AnalizSekmesiProps } from './AnalizSekmesi'
import type { Scenario } from '@/components/ScenarioCompare'

// AnalizSekmesi grafik bilesenlerini (canvas gerektirir) tasir; bu dosyanin
// SOZLESMESI "tek kapi" (spec K4/K5), grafiklerin kendi cizimi degil —
// AnalizSekmesi'nin kendi testleri Analiz.test.tsx'te. Mock bir jest.fn'e
// sarilir ki tek bir testte (asagida) gercek bilesene gecici olarak
// gecilebilsin — Task 6'nin HesaplaMobile'da biraktigi yinelenen "Kapat"
// satirinin geri donmedigini stub'un kendisi YUTMADAN dogrulamak icin.
const mockAnalizSekmesi = jest.fn<ReactElement, [AnalizSekmesiProps]>(() => <div data-testid="analiz-sekmesi" />)
jest.mock('./AnalizSekmesi', () => ({
    AnalizSekmesi: (props: AnalizSekmesiProps) => mockAnalizSekmesi(props),
}))

jest.mock('jspdf', () => {
    return jest.fn().mockImplementation(() => ({
        setFontSize: jest.fn(),
        text: jest.fn(),
        save: jest.fn(),
    }))
})
jest.mock('jspdf-autotable', () => jest.fn())

const BASE_INPUT = {
    x: 0.33, L: 1.2, Ad: 140, P: 12000, K: 1.3,
    isRiskEnabled: false, R: 1,
    isExcavationEnabled: false, excavationMode: 'percentage' as const,
    Z: 0, MzOriginal: 0,
}

const SCENARIO_1: Scenario = { id: 'sc1', name: 'Senaryo 1', luxLevel: 1.2, apartmentSize: 140, landShareRatio: 0.33, totalApartments: 20, riskLevel: 1.1, builderProfit: 1.3, fdTotal: 8964000, fdPerM2: 64028, mi: 3000000, ma: 2000000, totalCost: 5000000 }
const SCENARIO_2: Scenario = { ...SCENARIO_1, id: 'sc2', name: 'Senaryo 2', fdTotal: 9500000 }
const SCENARIO_3: Scenario = { ...SCENARIO_1, id: 'sc3', name: 'Senaryo 3', fdTotal: 8000000 }

function props(patch: Partial<HesaplaMobileProps> = {}): HesaplaMobileProps {
    return {
        sonuc: {
            minDaireFiyati: 8964000,
            arsaPayiYuzde: 33,
            birimFiyat: 64028,
            karsilastirma: { piyasaFiyati: '10.000.000', onPiyasaFiyati: jest.fn(), farkYuzde: -14 },
            hasEnoughDataForResult: true,
            isDemoData: false,
            onOrnekProjeIleDene: jest.fn(),
            onFisAc: jest.fn(),
            onAnalizAc: jest.fn(),
        },
        girdi: {
            parcelContext: null,
            arsaAlani: 500, onArsaAlani: jest.fn(),
            riskLevel: 10,
            riskLevels: [
                { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
                { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
                { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
                { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
            ],
            onRiskLevel: jest.fn(),
            riskKaynagi: { tur: 'varsayilan' as const },
            isAaEnabled: false,
            onIsAaEnabled: jest.fn(),
            onParselDogrulaAc: jest.fn(),
            luxTier: 'orta' as const, onLuxTier: jest.fn(),
            apartmentSize: 140, onApartmentSize: jest.fn(),
            globalUnitPrice: 12000, birimMaliyetKaynagi: { tur: 'varsayilan' as const }, onBirimMaliyet: jest.fn(),
            landShareRatio: 33, onLandShareRatio: jest.fn(),
            isApartmentCountEnabled: false, onApartmentCountEnabled: jest.fn(),
            totalApartments: 20, onTotalApartments: jest.fn(),
            ownerApartmentShare: 6, onOwnerApartmentShare: jest.fn(),
        },
        onParselDogrulaAc: jest.fn(),
        fisAcik: false,
        fiyatAciklamasi: {
            result: null,
            apartmentSize: 140,
            unitPrice: 12000,
            landSharePercent: 33,
            profitLabel: 'Orta',
            profitMultiplier: 1.3,
            onKapat: jest.fn(),
            onKarDegistir: jest.fn(),
        },
        onAyarlarAc: jest.fn(),
        analizAcik: false,
        analiz: { result: null, baseInput: BASE_INPUT, marketPrice: 0, onKapat: jest.fn() },
        ctaMetni: 'Özet Rapor Oluştur',
        ctaDevreDisi: false,
        onCta: jest.fn(),
        savedScenarios: [],
        onAddScenario: jest.fn(),
        onRemoveScenario: jest.fn(),
        hasResult: false,
        karsilastirmaAcik: false,
        onKarsilastirmaAc: jest.fn(),
        onKarsilastirmaKapat: jest.fn(),
        onShareRequest: jest.fn(),
        ...patch,
    }
}

describe('HesaplaMobile — tek kapi', () => {
    it('gelismis ayarlara giden TEK bir etiketli buton var', () => {
        render(<HesaplaMobile {...props()} />)
        expect(screen.getAllByRole('button', { name: /Gelişmiş ayarlar/ })).toHaveLength(1)
    })

    it('baslikta sekme seridi kalinti YOK (role=tab yok)', () => {
        render(<HesaplaMobile {...props()} />)
        const baslik = screen.getByRole('banner')
        expect(within(baslik).queryAllByRole('tab')).toHaveLength(0)
    })

    it('analizAcik ile sonuc karti yerine analiz gorunumu gelir', () => {
        const { rerender } = render(<HesaplaMobile {...props({ analizAcik: false })} />)
        expect(screen.getByText(/Min\. daire fiyatı/)).toBeInTheDocument()
        expect(screen.queryByTestId('analiz-sekmesi')).toBeNull()

        rerender(<HesaplaMobile {...props({ analizAcik: true })} />)
        expect(screen.getByTestId('analiz-sekmesi')).toBeInTheDocument()
        expect(screen.queryByText(/Min\. daire fiyatı/)).toBeNull()
    })

    it('analiz yapraginda TEK "Analiz" basligi ve TEK "Kapat" butonu doner (yinelenen satir donmez)', () => {
        // Bu test SADECE burada gercek `AnalizSekmesi`yi render eder: dosyanin
        // geri kalani onu stub'lar (canvas gerektiren grafikler yuzunden).
        // Stub kullanilsaydi Task 6'nin `HesaplaMobile`de biraktigi yinelenen
        // "Analiz"/"Kapat" satiri geri donse bile testler yesil kalirdi —
        // tam da bu kor noktayi kapatmak icin gercek bilesen kullanilir.
        const { AnalizSekmesi: GercekAnalizSekmesi } = jest.requireActual('./AnalizSekmesi') as typeof import('./AnalizSekmesi')
        mockAnalizSekmesi.mockImplementation(GercekAnalizSekmesi)

        try {
            render(<HesaplaMobile {...props({ analizAcik: true })} />)
            expect(screen.getAllByRole('heading', { name: 'Analiz' })).toHaveLength(1)
            expect(screen.getAllByRole('button', { name: 'Kapat' })).toHaveLength(1)
        } finally {
            mockAnalizSekmesi.mockImplementation(() => <div data-testid="analiz-sekmesi" />)
        }
    })

    it('savedScenarios bosken pill satiri ve Karsilastir cipi gorunmez', () => {
        render(<HesaplaMobile {...props({ savedScenarios: [] })} />)
        expect(screen.queryByText(/Karşılaştır \(/)).toBeNull()
    })

    it('1 senaryo kaydedilince pill gorunur ama Karsilastir cipi henuz gorunmez (2 esigi)', () => {
        render(<HesaplaMobile {...props({ savedScenarios: [SCENARIO_1] })} />)
        expect(screen.getByText('Senaryo 1')).toBeInTheDocument()
        expect(screen.queryByText(/Karşılaştır \(/)).toBeNull()
    })

    it('2+ senaryo kaydedilince Karsilastir cipi gorunur, tiklaninca onKarsilastirmaAc cagirir', () => {
        const onKarsilastirmaAc = jest.fn()
        render(<HesaplaMobile {...props({ savedScenarios: [SCENARIO_1, SCENARIO_2], onKarsilastirmaAc })} />)
        fireEvent.click(screen.getByText(/Karşılaştır \(2\)/))
        expect(onKarsilastirmaAc).toHaveBeenCalled()
    })

    it('bir pill kaldirilinca onRemoveScenario dogru id ile cagirilir', () => {
        const onRemoveScenario = jest.fn()
        render(<HesaplaMobile {...props({ savedScenarios: [SCENARIO_1], onRemoveScenario })} />)
        fireEvent.click(screen.getByLabelText("Senaryo 1'i kaldır"))
        expect(onRemoveScenario).toHaveBeenCalledWith('sc1')
    })

    it('sabit CTA cubugunda "+ Karsilastir" butonu var, hasResult false veya 3 senaryo doluyken devre disi', () => {
        const { rerender } = render(<HesaplaMobile {...props({ hasResult: false, savedScenarios: [] })} />)
        expect(screen.getByRole('button', { name: '+ Karşılaştır' })).toBeDisabled()

        rerender(<HesaplaMobile {...props({ hasResult: true, savedScenarios: [SCENARIO_1, SCENARIO_2, SCENARIO_3] })} />)
        expect(screen.getByRole('button', { name: '+ Karşılaştır' })).toBeDisabled()

        rerender(<HesaplaMobile {...props({ hasResult: true, savedScenarios: [] })} />)
        expect(screen.getByRole('button', { name: '+ Karşılaştır' })).not.toBeDisabled()
    })

    it('"+ Karsilastir" tiklaninca onAddScenario cagirir', () => {
        const onAddScenario = jest.fn()
        render(<HesaplaMobile {...props({ hasResult: true, onAddScenario })} />)
        fireEvent.click(screen.getByRole('button', { name: '+ Karşılaştır' }))
        expect(onAddScenario).toHaveBeenCalled()
    })

    it('karsilastirmaAcik ile SenaryoKarsilastirmaSekmesi render edilir (sonuc karti yerine)', () => {
        render(<HesaplaMobile {...props({ karsilastirmaAcik: true, savedScenarios: [SCENARIO_1, SCENARIO_2] })} />)
        expect(screen.getByRole('heading', { name: 'Senaryo Karşılaştırması' })).toBeInTheDocument()
        expect(screen.queryByText(/Min\. daire fiyatı/)).toBeNull()
    })
})
