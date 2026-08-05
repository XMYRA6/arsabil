/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RiskSuggestionCard } from './RiskSuggestionCard'

const RISK = { faultDistanceM: 1200, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 }

describe('RiskSuggestionCard', () => {
    it('mesafeyi ve gammaF yi gosterir', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
        expect(screen.getByText(/1,2 km/)).toBeInTheDocument()
        expect(screen.getByText(/1,20/)).toBeInTheDocument()
    })

    it('onerilen R yi TAHMINI olarak etiketler', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
        // Buyuk/kucuk harfe duyarli: alt yazidaki "...tahminidir." metniyle
        // karismasin diye ozellikle "Tahmini" etiketini hedefler.
        expect(screen.getByText(/Tahmini/)).toBeInTheDocument()
    })

    it('yonetmeligin maliyet degil tasarim talebi olcekledigini yazar', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
        expect(screen.getByText(/mühendislik raporu yerine geçmez/i)).toBeInTheDocument()
    })

    it('Uygula tiklaninca yuzde cinsinden risk seviyesi bildirir', async () => {
        const onApply = jest.fn()
        render(<RiskSuggestionCard risk={RISK} onApply={onApply} />)
        await userEvent.click(screen.getByRole('button', { name: /uygula/i }))
        expect(onApply).toHaveBeenCalledWith(10)   // (1.10 - 1) * 100
    })

    it('taskin bolgesindeyse bunu belirtir ve yuzdeyi yuvarlar', async () => {
        const onApply = jest.fn()
        render(
            <RiskSuggestionCard
                risk={{ ...RISK, floodQ100: true, suggestedR: 1.13 }}
                onApply={onApply}
            />,
        )
        expect(screen.getByText(/taşkın/i)).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: /uygula/i }))
        expect(onApply).toHaveBeenCalledWith(13)
    })

    it('fay bulunamadiysa mesafe yerine 25 km disi der', () => {
        render(
            <RiskSuggestionCard
                risk={{ faultDistanceM: null, gammaF: 1, floodQ100: false, suggestedR: 1 }}
                onApply={jest.fn()}
            />,
        )
        expect(screen.getByText(/25 km/)).toBeInTheDocument()
    })

    it('onerinin sadece bu olcumun payini kapsadigini, toplam risk olmadigini belirtir', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
        expect(screen.getByText(/toplam riskini temsil etmez/i)).toBeInTheDocument()
    })

    it('yuzde sifirsa Uygula butonu gosterilmez (kullaniciyi risk payini sifirlamaya yonlendirmez)', () => {
        render(
            <RiskSuggestionCard
                risk={{ faultDistanceM: null, gammaF: 1, floodQ100: false, suggestedR: 1 }}
                onApply={jest.fn()}
            />,
        )
        expect(screen.queryByRole('button', { name: /uygula/i })).not.toBeInTheDocument()
    })

    it('yuzde sifirdan buyukse Uygula butonu gosterilir', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
        expect(screen.getByRole('button', { name: /uygula/i })).toBeInTheDocument()
    })

    it('hideApply true iken Uygula butonu hic render edilmez (wizard baglaminda uygulanacak yer yok)', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} hideApply />)
        expect(screen.queryByRole('button', { name: /uygula/i })).not.toBeInTheDocument()
    })

    it('hideApply verilmezse (varsayilan false) mevcut davranis korunur', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
        expect(screen.getByRole('button', { name: /uygula/i })).toBeInTheDocument()
    })
})
