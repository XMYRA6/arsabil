/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { UpdateBanner } from '../UpdateBanner'
import { usePwaUpdate } from '@/lib/pwa/usePwaUpdate'

jest.mock('@/lib/pwa/usePwaUpdate')
const mockedUsePwaUpdate = usePwaUpdate as jest.Mock

describe('UpdateBanner', () => {
    afterEach(() => jest.resetAllMocks())

    it('updateAvailable false iken hicbir sey render etmez', () => {
        mockedUsePwaUpdate.mockReturnValue({ updateAvailable: false, applyUpdate: jest.fn() })
        const { container } = render(<UpdateBanner />)
        expect(container).toBeEmptyDOMElement()
    })

    it('updateAvailable true iken banner ve Guncelle butonu gorunur', () => {
        mockedUsePwaUpdate.mockReturnValue({ updateAvailable: true, applyUpdate: jest.fn() })
        render(<UpdateBanner />)
        expect(screen.getByText(/Yeni bir sürüm mevcut/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Güncelle' })).toBeInTheDocument()
    })

    it('Guncelle butonuna tiklaninca applyUpdate cagrilir', () => {
        const applyUpdate = jest.fn()
        mockedUsePwaUpdate.mockReturnValue({ updateAvailable: true, applyUpdate })
        render(<UpdateBanner />)
        fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }))
        expect(applyUpdate).toHaveBeenCalledTimes(1)
    })

    it('kapat butonuna tiklaninca banner kaybolur', () => {
        mockedUsePwaUpdate.mockReturnValue({ updateAvailable: true, applyUpdate: jest.fn() })
        render(<UpdateBanner />)
        fireEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(screen.queryByText(/Yeni bir sürüm mevcut/)).not.toBeInTheDocument()
    })
})
