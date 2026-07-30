/** @jest-environment jsdom */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HesaplaMobile, type HesaplaMobileProps } from './HesaplaMobile'

// AnalizSekmesi grafik bilesenlerini (canvas gerektirir) tasir; bu dosyanin
// SOZLESMESI "tek kapi" (spec K4/K5), grafiklerin kendi cizimi degil —
// AnalizSekmesi'nin kendi testleri Analiz.test.tsx'te.
jest.mock('./AnalizSekmesi', () => ({
    AnalizSekmesi: () => <div data-testid="analiz-sekmesi" />,
}))

const BASE_INPUT = {
    x: 0.33, L: 1.2, Ad: 140, P: 12000, K: 1.3,
    isRiskEnabled: false, R: 1,
    isExcavationEnabled: false, excavationMode: 'percentage' as const,
    Z: 0, MzOriginal: 0,
}

function props(patch: Partial<HesaplaMobileProps> = {}): HesaplaMobileProps {
    return {
        sonuc: {
            minDaireFiyati: 8964000,
            arsaPayiYuzde: 33,
            birimFiyat: 64028,
            karsilastirma: { piyasaFiyati: '10.000.000', onPiyasaFiyati: jest.fn(), farkYuzde: -14 },
            onFisAc: jest.fn(),
            onAnalizAc: jest.fn(),
        },
        girdi: {
            konum: {
                districtPrices: [],
                selectedIl: '', selectedIlce: '',
                onIlChange: jest.fn(), onIlceChange: jest.fn(), onClear: jest.fn(),
                birimMaliyet: 12000,
                birimMaliyetKaynagi: { tur: 'varsayilan' },
                onBirimMaliyet: jest.fn(),
                parselIsaretli: false, onParselAc: jest.fn(),
            },
            luxLevel: 1.2, onLuxLevel: jest.fn(),
            apartmentSize: 140, onApartmentSize: jest.fn(),
            landShareRatio: 33, onLandShareRatio: jest.fn(),
            isApartmentCountEnabled: false, onApartmentCountEnabled: jest.fn(),
            totalApartments: 20, onTotalApartments: jest.fn(),
            ownerApartmentShare: 6, onOwnerApartmentShare: jest.fn(),
        },
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
        onAnalizKapat: jest.fn(),
        analiz: { result: null, baseInput: BASE_INPUT, marketPrice: 0, onKapat: jest.fn() },
        ctaMetni: 'Özet Rapor Oluştur',
        ctaDevreDisi: false,
        onCta: jest.fn(),
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

    it('analiz Kapat butonu onAnalizKapat i cagirir', async () => {
        const onAnalizKapat = jest.fn()
        render(<HesaplaMobile {...props({ analizAcik: true, onAnalizKapat })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(onAnalizKapat).toHaveBeenCalledTimes(1)
    })
})
