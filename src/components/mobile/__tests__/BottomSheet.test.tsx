/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BottomSheet } from '../BottomSheet'

describe('BottomSheet', () => {
    it('open=false iken dialog render etmez', () => {
        render(<BottomSheet open={false} onClose={() => {}}><p>İçerik</p></BottomSheet>)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('open=true iken dialog, başlık ve içeriği render eder', () => {
        render(<BottomSheet open onClose={() => {}} title="Filtreler"><p>İçerik</p></BottomSheet>)
        expect(screen.getByRole('dialog', { name: 'Filtreler' })).toBeInTheDocument()
        expect(screen.getByText('İçerik')).toBeInTheDocument()
    })

    it('backdrop tıklaması onClose çağırır', () => {
        const onClose = jest.fn()
        render(<BottomSheet open onClose={onClose} title="Filtreler"><p>İçerik</p></BottomSheet>)
        fireEvent.click(screen.getByTestId('bottomsheet-backdrop'))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('Escape tuşu onClose çağırır', () => {
        const onClose = jest.fn()
        render(<BottomSheet open onClose={onClose}><p>İçerik</p></BottomSheet>)
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('açıkken body scroll kilitlenir, kapanınca geri gelir', () => {
        const { rerender } = render(<BottomSheet open onClose={() => {}}><p>İçerik</p></BottomSheet>)
        expect(document.body.style.overflow).toBe('hidden')
        rerender(<BottomSheet open={false} onClose={() => {}}><p>İçerik</p></BottomSheet>)
        expect(document.body.style.overflow).toBe('')
    })
})
