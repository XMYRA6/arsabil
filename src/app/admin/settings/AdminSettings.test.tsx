/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminSettings from './page'

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    ) as unknown as jest.Mock
})

describe('AdminSettings — pirinç birincil butonlar (Faz 4 task 8)', () => {
    it('"Genel Ayarları Kaydet" butonu adminPrimaryBtn class\'ını taşır', async () => {
        render(<AdminSettings />)
        await waitFor(() => screen.getByText('💾 Genel Ayarları Kaydet'))
        expect(screen.getByText('💾 Genel Ayarları Kaydet').className).toMatch(/adminPrimaryBtn/)
    })
})

describe('AdminSettings — İksa Maliyeti Katsayıları kaldırıldı (denetim bulgusu C4)', () => {
    // Bu alanlar (excavationLowPercent/excavationMediumPercent) hesap
    // motoruna hiç ulaşmıyordu — page.tsx'te çekilip bir state'e yazılıyor,
    // o state hiçbir yerde okunmuyordu. Karşılık gelen bir "Düşük/Orta İksa"
    // secici arayüz de hiç yok — admin burada değiştirdiği bir değerin
    // hiçbir hesaba yansımadığını göremezdi. Yanıltıcı alan kaldırıldı.
    it('"İksa Maliyeti Katsayıları" kartı artık render edilmiyor', async () => {
        render(<AdminSettings />)
        await waitFor(() => screen.getByText('💾 Genel Ayarları Kaydet'))
        expect(screen.queryByText(/İksa Maliyeti Katsayıları/)).toBeNull()
        expect(screen.queryByText('Düşük İksa Oranı (Z)')).toBeNull()
        expect(screen.queryByText('Orta İksa Oranı (Z)')).toBeNull()
    })

    it('Kalite Sınıfı Katsayıları kartı KALIR (C3 kapsamında hesap motoruna bağlanıyor, kaldırılmıyor)', async () => {
        render(<AdminSettings />)
        await waitFor(() => screen.getByText('💾 Genel Ayarları Kaydet'))
        expect(screen.getByText(/Kalite Sınıfı Katsayıları/)).toBeInTheDocument()
    })
})
