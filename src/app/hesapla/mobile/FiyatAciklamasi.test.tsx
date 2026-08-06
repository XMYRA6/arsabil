/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FiyatAciklamasi } from './FiyatAciklamasi'
import type { CalculationOutput } from '@/lib/calculator/engine_v2'

const RESULT = {
    Mi: 1680000, Ma: 4216000, M: 5896000, FD_total: 8964000,
} as unknown as CalculationOutput

function props(patch = {}) {
    return {
        result: RESULT, apartmentSize: 140, unitPrice: 12000,
        landSharePercent: 33, profitLabel: 'Orta', profitMultiplier: 1.3,
        onKapat: jest.fn(), onKarDegistir: jest.fn(), ...patch,
    }
}

beforeEach(() => {
    localStorage.clear()
})

describe('FiyatAciklamasi', () => {
    it('uc satiri motor alanlarindan turetir', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByText('1.680.000')).toBeInTheDocument()   // Mi
        expect(screen.getByText('4.216.000')).toBeInTheDocument()   // Ma
        expect(screen.getByText('3.068.000')).toBeInTheDocument()   // FD_total - M
        expect(screen.getByText('8.964.000')).toBeInTheDocument()   // FD_total
    })

    it('insaat satirinda metrekare ve birim fiyati aciklar', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByText(/140 m² × 12\.000 TL\/m²/)).toBeInTheDocument()
    })

    it('arsa payi satirinda anlasilan yuzdeyi soyler', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByText(/%33/)).toBeInTheDocument()
    })

    it('kar satirinda seviye ve carpan yazili', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByText(/‘Orta’ kazanç seviyesi · maliyetin 1,30 katı/)).toBeInTheDocument()
    })

    it('muhendis gorunumu VARSAYILAN KAPALI', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByRole('switch', { name: /Mühendis görünümü/ }))
            .toHaveAttribute('aria-checked', 'false')
    })

    it('muhendis gorunumu acilinca sembolik gosterim gelir ve tercih saklanir', async () => {
        render(<FiyatAciklamasi {...props()} />)
        await userEvent.click(screen.getByRole('switch', { name: /Mühendis görünümü/ }))
        expect(screen.getByRole('switch', { name: /Mühendis görünümü/ }))
            .toHaveAttribute('aria-checked', 'true')
        expect(localStorage.getItem('arsabil-engineer-view')).toBe('true')
        // Sembolik gosterim = mevcut HesapFisi bileseni (kopyalanmaz).
        expect(screen.getByText(/İnşaat Maliyeti \(Mi\)/)).toBeInTheDocument()
    })

    it('saklanan tercih acikken ilk render da sembolik gosterim gelir', () => {
        localStorage.setItem('arsabil-engineer-view', 'true')
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByRole('switch', { name: /Mühendis görünümü/ }))
            .toHaveAttribute('aria-checked', 'true')
    })

    it('kar satirindaki degistir baglantisi onKarDegistir i cagirir', async () => {
        const onKarDegistir = jest.fn()
        render(<FiyatAciklamasi {...props({ onKarDegistir })} />)
        await userEvent.click(screen.getByRole('button', { name: /değiştir/ }))
        expect(onKarDegistir).toHaveBeenCalledTimes(1)
    })

    it('kapat butonu onKapat i cagirir', async () => {
        const onKapat = jest.fn()
        render(<FiyatAciklamasi {...props({ onKapat })} />)
        await userEvent.click(screen.getByRole('button', { name: /Kapat/ }))
        expect(onKapat).toHaveBeenCalledTimes(1)
    })

    it('sonuc yoksa rakam yerine tire basar', () => {
        render(<FiyatAciklamasi {...props({ result: null })} />)
        expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    })

    it('apartmentSize/unitPrice null iken insaat satirinda tire gosterir, "null" yazmaz', () => {
        render(<FiyatAciklamasi {...props({ apartmentSize: null, unitPrice: null, result: null })} />)
        expect(screen.getByText(/— m² × — TL\/m²/)).toBeInTheDocument()
    })
})
