/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GelismisAyarlarSheet } from './GelismisAyarlarSheet'

function props(patch = {}) {
    return {
        open: true,
        onClose: jest.fn(),
        onUygula: jest.fn(),
        onSifirla: jest.fn(),

        builderProfit: 1.3, setBuilderProfit: jest.fn(),
        profitLevels: [
            { id: '1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
            { id: '2', label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
            { id: '3', label: 'Yüksek', value: 1.50, sortOrder: 2, isDefault: false },
        ],
        iksaMode: 'off' as const, setIksaMode: jest.fn(),
        iksaPercentage: 5, setIksaPercentage: jest.fn(),
        iksaManualTL: 0, setIksaManualTL: jest.fn(),

        manualMarketPrice: '', setManualMarketPrice: jest.fn(),

        globalUnitPrice: 12000, birimMaliyetKaynagi: { tur: 'varsayilan' as const }, onBirimMaliyet: jest.fn(),

        ...patch,
    }
}

describe('GelismisAyarlarSheet', () => {
    it('kapaliyken hicbir sey render etmez', () => {
        render(<GelismisAyarlarSheet {...props({ open: false })} />)
        expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('acikken modal diyalog ve iki bolum gosterir', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
        expect(screen.getByRole('group', { name: 'Maliyet ve riskler' })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Piyasa fiyatı' })).toBeInTheDocument()
        expect(screen.queryByRole('group', { name: 'Arsa alanı' })).toBeNull()
    })

    it('mevcut alan bilesenleri yeniden kullaniliyor (kopyalanmiyor)', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        // RiskCostFields / MarketField'in kendi etiketleri.
        expect(screen.getByText('İksa Masrafı')).toBeInTheDocument()
        expect(screen.getByText('Yaklaşık Piyasa Fiyatı')).toBeInTheDocument()
    })

    it('acilisBolumu kar ise maliyet bolumu isaretlenir', () => {
        render(<GelismisAyarlarSheet {...props({ acilisBolumu: 'kar' })} />)
        expect(screen.getByRole('group', { name: 'Maliyet ve riskler' }))
            .toHaveAttribute('data-acilis', 'true')
        expect(screen.getByRole('group', { name: 'Piyasa fiyatı' }))
            .toHaveAttribute('data-acilis', 'false')
    })

    it('acilisBolumu piyasa ise piyasa bolumu isaretlenir', () => {
        render(<GelismisAyarlarSheet {...props({ acilisBolumu: 'piyasa' })} />)
        expect(screen.getByRole('group', { name: 'Piyasa fiyatı' }))
            .toHaveAttribute('data-acilis', 'true')
    })

    it('acilisBolumu verilmezse hicbir bolum isaretlenmez', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByRole('group', { name: 'Maliyet ve riskler' }))
            .toHaveAttribute('data-acilis', 'false')
    })

    it('Uygula ve Sifirla butonlari calisir', async () => {
        const onUygula = jest.fn(); const onSifirla = jest.fn()
        render(<GelismisAyarlarSheet {...props({ onUygula, onSifirla })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Ayarları sıfırla' }))
        expect(onSifirla).toHaveBeenCalledTimes(1)
        await userEvent.click(screen.getByRole('button', { name: 'Ayarları uygula ve kapat' }))
        expect(onUygula).toHaveBeenCalledTimes(1)
    })

    it('daire sayisi kontrolleri yaprakta ARTIK YOK (girdi kartina ait)', () => {
        // A1 I4: ayni uc kontrol girdi kartinda ve yaprakta iki kez, farkli
        // etiketlerle duruyordu. Kullanici birini degistirince digeri sessizce
        // yeniden yaziliyordu.
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.queryByText('Toplam Daire Sayısı')).toBeNull()
    })

    it('arsa alani yapraktan KALKTI (SmartContextCard tek kaynak)', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.queryByText(/Arsa Alanı/)).toBeNull()
    })

    it('risk secimi yapraktan KALKTI (SmartContextCard tek kaynak)', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.queryByText('Risk Payı')).toBeNull()
    })
})
