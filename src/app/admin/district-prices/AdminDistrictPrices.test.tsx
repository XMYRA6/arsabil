/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminDistrictPrices from './page'

const mockPrice = {
    id: 'dp-1', il: 'İstanbul', ilce: 'Kadıköy',
    avgSalesPricePerM2: 95000, avgUnitConstructionPrice: 14500,
}

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([mockPrice]) })
    ) as unknown as jest.Mock
})

describe('AdminDistrictPrices — mobil DataCard görünümü', () => {
    it('mobil kart listesinde il/ilçe görünür (tablo + kart = 2 kopya)', async () => {
        render(<AdminDistrictPrices />)
        await waitFor(() => {
            const matches = screen.getAllByText((content) => content.includes('Kadıköy'))
            expect(matches).toHaveLength(2)
        })
    })

    it('"+ Yeni Ekle" butonu adminPrimaryBtn class\'ını taşır', async () => {
        render(<AdminDistrictPrices />)
        await waitFor(() => screen.getByText('+ Yeni Ekle'))
        expect(screen.getByText('+ Yeni Ekle').className).toMatch(/adminPrimaryBtn/)
    })

    it('boş sonuç durumunda mobilde "Kayıt bulunamadı." gösterir', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
        ) as unknown as jest.Mock

        render(<AdminDistrictPrices />)
        await waitFor(() => {
            const emptyMessages = screen.getAllByText('Kayıt bulunamadı.')
            expect(emptyMessages.length).toBeGreaterThanOrEqual(2)
        })
    })
})
