/** @jest-environment jsdom */
import { useState } from 'react'
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

    it('document.body altına portallanır (ataların transform/backdrop-filter\'ından etkilenmez)', () => {
        render(
            <div id="ancestor-with-transform" style={{ transform: 'scale(1)' }}>
                <BottomSheet open onClose={() => {}} title="Filtreler"><p>İçerik</p></BottomSheet>
            </div>
        )
        const dialog = screen.getByRole('dialog')
        const ancestor = document.getElementById('ancestor-with-transform')
        expect(ancestor?.contains(dialog)).toBe(false)
        expect(document.body.contains(dialog)).toBe(true)
        expect(dialog.parentElement).toBe(document.body)
    })

    it('title verilmezse varsayılan erişilebilir isim "Alt panel" kullanılır', () => {
        render(<BottomSheet open onClose={() => {}}><p>İçerik</p></BottomSheet>)
        expect(screen.getByRole('dialog', { name: 'Alt panel' })).toBeInTheDocument()
    })

    it('açılınca odak sheet konteynerine taşınır, kapanınca tetikleyici elemana geri döner', () => {
        function Wrapper() {
            const [open, setOpen] = useState(false)
            return (
                <div>
                    <button type="button" onClick={() => setOpen(true)}>Aç</button>
                    <BottomSheet open={open} onClose={() => setOpen(false)} title="Filtreler">
                        <p>İçerik</p>
                    </BottomSheet>
                </div>
            )
        }
        render(<Wrapper />)
        const trigger = screen.getByRole('button', { name: 'Aç' })
        trigger.focus()
        fireEvent.click(trigger)

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveFocus()

        fireEvent.keyDown(document, { key: 'Escape' })
        expect(trigger).toHaveFocus()
    })
})
