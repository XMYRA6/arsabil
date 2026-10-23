/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HesapOzetiKarti } from './HesapOzetiKarti'
import type { CalculationOutput } from '@/lib/calculator/engine_v2'

// Satis geliri 1000: insaat 580, arsa 240, kar 110, risk 70 => M = 890, FD = 1000.
const RESULT: CalculationOutput = {
    Mi_base: 580, Mz: 0, Z: 0,
    Mi: 650,           // 580 + 70 risk
    Ma: 240,
    M: 890,
    derivedX: 0.33,
    FD_total: 1000,
    FD_per_m2: 7,
    Sdx: null, FA: null, FAbirim: null,
    x_max: null,
}

describe('HesapOzetiKarti', () => {
    it('sonuc yokken hicbir sey render etmez', () => {
        const { container } = render(<HesapOzetiKarti result={null} onSonucDetayiAc={jest.fn()} />)
        expect(container).toBeEmptyDOMElement()
    })

    it('Dagilim sekmesi satis gelirini dort kalemde boler', () => {
        render(<HesapOzetiKarti result={RESULT} onSonucDetayiAc={jest.fn()} />)
        expect(screen.getByRole('tab', { name: 'Dağılım' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByText('İnşaat %58')).toBeInTheDocument()
        expect(screen.getByText('Arsa %24')).toBeInTheDocument()
        expect(screen.getByText('Kâr %11')).toBeInTheDocument()
        expect(screen.getByText('Risk %7')).toBeInTheDocument()
    })

    it('Analiz sekmesi kar katsayisini gosterir ve detay yapragini acar', async () => {
        const onSonucDetayiAc = jest.fn()
        render(<HesapOzetiKarti result={RESULT} onSonucDetayiAc={onSonucDetayiAc} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Analiz' }))
        expect(screen.getByText('× 1,12')).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: /Hesap fişi ve grafikler/ }))
        expect(onSonucDetayiAc).toHaveBeenCalledTimes(1)
    })

    it('Finans sekmesi yatirim, gelir ve kari gosterir', async () => {
        render(<HesapOzetiKarti result={RESULT} onSonucDetayiAc={jest.fn()} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Finans' }))
        expect(screen.getByText('Toplam yatırım')).toBeInTheDocument()
        expect(screen.getByText('890 ₺')).toBeInTheDocument()
        expect(screen.getByText('110 ₺')).toBeInTheDocument()
    })
})
