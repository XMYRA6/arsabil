/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
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
        expect(screen.getByRole('group', { name: 'Piyasa karşılaştırması' })).toBeInTheDocument()
        expect(screen.queryByRole('group', { name: 'Arsa alanı' })).toBeNull()
    })

    it('bolum sirasi Figma ile ayni: iksa, kar hedefi, piyasa', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        const iksa = screen.getByText('İksa maliyeti')
        const kar = screen.getByText('Müteahhit kâr hedefi')
        const piyasa = screen.getByText('Piyasa daire fiyatı (isteğe bağlı)')
        expect(iksa.compareDocumentPosition(kar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(kar.compareDocumentPosition(piyasa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('iksa segmenti yalnizca Yuzde ve Elle (₺) sunar; Yok secenegi yok', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByRole('button', { name: 'Yüzde' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Elle (₺)' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Yok' })).toBeNull()
    })

    it('iksa yuzdesi 0 dan buyuk yazilinca yuzde modu ve oran ayarlanir', () => {
        const setIksaMode = jest.fn(); const setIksaPercentage = jest.fn()
        render(<GelismisAyarlarSheet {...props({ setIksaMode, setIksaPercentage })} />)
        fireEvent.change(screen.getByLabelText('İksa oranı'), { target: { value: '4' } })
        expect(setIksaPercentage).toHaveBeenCalledWith(4)
        expect(setIksaMode).toHaveBeenCalledWith('percentage')
    })

    it('iksa yuzdesi 0 yazilinca mod off a doner (motor girdisi korunur)', () => {
        const setIksaMode = jest.fn()
        render(<GelismisAyarlarSheet {...props({ iksaMode: 'percentage', setIksaMode })} />)
        fireEvent.change(screen.getByLabelText('İksa oranı'), { target: { value: '0' } })
        expect(setIksaMode).toHaveBeenCalledWith('off')
    })

    it('Elle (₺) secilince tutar alani gorunur', async () => {
        const setIksaMode = jest.fn()
        render(<GelismisAyarlarSheet {...props({ setIksaMode })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Elle (₺)' }))
        expect(setIksaMode).toHaveBeenCalledWith('manual')
    })

    it('kar chip leri yuzdeli etiket tasir ve secimi bildirir', async () => {
        const setBuilderProfit = jest.fn()
        render(<GelismisAyarlarSheet {...props({ setBuilderProfit })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Yüksek %50' }))
        expect(setBuilderProfit).toHaveBeenCalledWith(1.5)
        expect(screen.getByRole('button', { name: 'Orta %30' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('piyasa fiyati binlik ayiracla bildirilir', () => {
        const setManualMarketPrice = jest.fn()
        render(<GelismisAyarlarSheet {...props({ setManualMarketPrice })} />)
        fireEvent.change(screen.getByLabelText('Piyasa daire fiyatı (isteğe bağlı)'), { target: { value: '7900000' } })
        expect(setManualMarketPrice).toHaveBeenCalledWith('7.900.000')
    })

    it('sag ustte Kapat dugmesi ve surukleme tutamagi birlikte bulunur', async () => {
        const onClose = jest.fn()
        render(<GelismisAyarlarSheet {...props({ onClose })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('acilisBolumu kar ise maliyet bolumu isaretlenir', () => {
        render(<GelismisAyarlarSheet {...props({ acilisBolumu: 'kar' })} />)
        expect(screen.getByRole('group', { name: 'Maliyet ve riskler' }))
            .toHaveAttribute('data-acilis', 'true')
        expect(screen.getByRole('group', { name: 'Piyasa karşılaştırması' }))
            .toHaveAttribute('data-acilis', 'false')
    })

    it('acilisBolumu piyasa ise piyasa bolumu isaretlenir', () => {
        render(<GelismisAyarlarSheet {...props({ acilisBolumu: 'piyasa' })} />)
        expect(screen.getByRole('group', { name: 'Piyasa karşılaştırması' }))
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

    it('Birim insaat maliyeti yapraktan KALKTI (ana karta tasindi)', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.queryByText('Birim inşaat maliyeti')).toBeNull()
    })
})
