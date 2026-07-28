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
})
