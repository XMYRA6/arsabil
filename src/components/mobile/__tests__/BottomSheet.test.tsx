/** @jest-environment jsdom */
import { useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BottomSheet, sheetTransition } from '../BottomSheet'

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
    it('yaprak govdesi dikey kaydirilabilir kalir (touch-action pan-x DEGIL)', () => {
        // A1 review bulgusu C1: framer-motion `drag="y"` varsayilan halinde
        // yaprak kokune `touch-action: pan-x` koyuyordu. Bu, `.content`
        // `overflow-y: auto` olsa bile ALTINDAKI HER SEYIN dikey kaydirmasini
        // olduruyor. Uzun icerikli 4f yapraginda (1129px icerik / 652px
        // gorunur) alt 477px'e — haritaya, risk kartina ve Uygula/Sifirla
        // butonlarina — parmakla ulasilamiyordu.
        // Cozum: dragListener={false} + dragControls; surukleme yalnizca
        // tutamaktan baslar. Bu test o cozumun geri alinmasini engeller.
        render(
            <BottomSheet open onClose={jest.fn()} title="Uzun">
                <p>İçerik</p>
            </BottomSheet>,
        )
        const dialog = screen.getByRole('dialog')
        expect(dialog.style.touchAction).not.toBe('pan-x')
    })

    describe('sheetTransition', () => {
        // Canli dogrulamada bulundu (Task 10, 390x844 + emulateMedia
        // reducedMotion:'reduce'): `initial`/`animate` reduced motion'da
        // yalnizca opacity'e dusuyordu ama `transition` HER ZAMAN spring
        // kaliyordu — getAnimations() acilistan 100ms sonra bile
        // playState:'running', duration:400 donduruyordu. "Tum hareket
        // kapali" kisitini yalnizca eksen/kaydirma degil, SURE de kapsar.
        it('reduced motion acikken sifir sureli gecis doner', () => {
            expect(sheetTransition(true)).toEqual({ duration: 0 })
        })

        it('reduced motion kapaliyken spring gecisi doner', () => {
            expect(sheetTransition(false)).toEqual({ type: 'spring', damping: 32, stiffness: 320 })
        })
    })

    it('className verilirse .sheet elemanina eklenir, verilmezse davranis degismez', () => {
        const { rerender, getByRole } = render(
            <BottomSheet open onClose={jest.fn()} title="Test">
                <p>icerik</p>
            </BottomSheet>,
        )
        expect(getByRole('dialog').className).not.toMatch(/custom-glass/)

        rerender(
            <BottomSheet open onClose={jest.fn()} title="Test" className="custom-glass">
                <p>icerik</p>
            </BottomSheet>,
        )
        expect(getByRole('dialog').className).toMatch(/custom-glass/)
    })

    // Kullanici bulgusu: klavye acilinca sheet klavyenin altinda kalip
    // tasarim bozuluyordu. `useKeyboardInset` `window.visualViewport`
    // kucculunce sheet'i klavyenin USTUNE kaydirir (bkz. useKeyboardInset.ts,
    // BottomSheet.module.css'teki `.sheet { bottom: var(--keyboard-inset) }`).
    it('klavye acilinca (visualViewport kucculunce) sheet --keyboard-inset ile yukari kayar', () => {
        class FakeVisualViewport extends EventTarget {
            height = 844
            offsetTop = 0
            resizeTo(height: number) {
                this.height = height
                this.dispatchEvent(new Event('resize'))
            }
        }
        const fakeVv = new FakeVisualViewport()
        Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })
        Object.defineProperty(window, 'visualViewport', { value: fakeVv, configurable: true })

        render(<BottomSheet open onClose={jest.fn()} title="Test"><p>icerik</p></BottomSheet>)
        const sheet = screen.getByRole('dialog')
        expect(sheet.style.getPropertyValue('--keyboard-inset')).toBe('0px')

        act(() => fakeVv.resizeTo(844 - 320))
        expect(sheet.style.getPropertyValue('--keyboard-inset')).toBe('320px')
    })

    describe('showCloseButton', () => {
        // Mockup bazi sheet'lerde (ornegin ParcelVerificationSheet) sadece
        // ustte bir X kapatma butonu gosteriyor, surukleme tutamaci (grabber)
        // yok. Varsayilan (showCloseButton verilmezse) mevcut grabber +
        // surukle-kapat davranisi AYNEN korunur — bu yalnizca opt-in bir
        // varyant.
        it('verilmezse grabber gorunur, kapatma butonu yoktur', () => {
            render(
                <BottomSheet open onClose={jest.fn()} title="Filtreler"><p>İçerik</p></BottomSheet>,
            )
            expect(document.querySelector('[class*="grabber"]')).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Kapat' })).not.toBeInTheDocument()
        })

        it('true iken grabber gizlenir, X butonu gorunur ve tiklaninca onClose cagirir', () => {
            const onClose = jest.fn()
            render(
                <BottomSheet open onClose={onClose} title="Haritadan Parsel Doğrula" showCloseButton>
                    <p>İçerik</p>
                </BottomSheet>,
            )
            expect(document.querySelector('[class*="grabber"]')).not.toBeInTheDocument()
            const closeBtn = screen.getByRole('button', { name: 'Kapat' })
            expect(closeBtn).toBeInTheDocument()
            fireEvent.click(closeBtn)
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('true iken baslik metni yine gorunur kalir', () => {
            render(
                <BottomSheet open onClose={jest.fn()} title="Haritadan Parsel Doğrula" showCloseButton>
                    <p>İçerik</p>
                </BottomSheet>,
            )
            expect(screen.getByText('Haritadan Parsel Doğrula')).toBeInTheDocument()
        })
    })
})
