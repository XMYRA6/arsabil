/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SegmentedTabs } from '../SegmentedTabs'

const OPTIONS = [
    { value: 'liste', label: 'Liste' },
    { value: 'harita', label: 'Harita' },
]

describe('SegmentedTabs', () => {
    it('tüm seçenekleri tab olarak render eder', () => {
        render(<SegmentedTabs options={OPTIONS} value="liste" onChange={() => {}} ariaLabel="Görünüm" />)
        expect(screen.getAllByRole('tab')).toHaveLength(2)
        expect(screen.getByRole('tablist', { name: 'Görünüm' })).toBeInTheDocument()
    })

    it('seçili tab aria-selected=true taşır', () => {
        render(<SegmentedTabs options={OPTIONS} value="harita" onChange={() => {}} ariaLabel="Görünüm" />)
        expect(screen.getByRole('tab', { name: 'Harita' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('tab', { name: 'Liste' })).toHaveAttribute('aria-selected', 'false')
    })

    it('tıklanınca onChange değeri iletir', () => {
        const onChange = jest.fn()
        render(<SegmentedTabs options={OPTIONS} value="liste" onChange={onChange} ariaLabel="Görünüm" />)
        fireEvent.click(screen.getByRole('tab', { name: 'Harita' }))
        expect(onChange).toHaveBeenCalledWith('harita')
    })

    it('gezinen tabindex: sadece seçili tab tabIndex=0, diğerleri -1 taşır', () => {
        render(<SegmentedTabs options={OPTIONS} value="liste" onChange={() => {}} ariaLabel="Görünüm" />)
        expect(screen.getByRole('tab', { name: 'Liste' })).toHaveAttribute('tabIndex', '0')
        expect(screen.getByRole('tab', { name: 'Harita' })).toHaveAttribute('tabIndex', '-1')
    })

    it('ArrowRight sonraki taba onChange + odak taşır (kapsayarak)', () => {
        const onChange = jest.fn()
        render(<SegmentedTabs options={OPTIONS} value="liste" onChange={onChange} ariaLabel="Görünüm" />)
        const liste = screen.getByRole('tab', { name: 'Liste' })
        liste.focus()
        fireEvent.keyDown(liste, { key: 'ArrowRight' })
        expect(onChange).toHaveBeenCalledWith('harita')
    })

    it('ArrowLeft ilk tabdan son taba sarar (wrap-around)', () => {
        const onChange = jest.fn()
        render(<SegmentedTabs options={OPTIONS} value="liste" onChange={onChange} ariaLabel="Görünüm" />)
        const liste = screen.getByRole('tab', { name: 'Liste' })
        liste.focus()
        fireEvent.keyDown(liste, { key: 'ArrowLeft' })
        expect(onChange).toHaveBeenCalledWith('harita')
    })

    it('ArrowRight son tabdan ilk taba sarar (wrap-around)', () => {
        const onChange = jest.fn()
        render(<SegmentedTabs options={OPTIONS} value="harita" onChange={onChange} ariaLabel="Görünüm" />)
        const harita = screen.getByRole('tab', { name: 'Harita' })
        harita.focus()
        fireEvent.keyDown(harita, { key: 'ArrowRight' })
        expect(onChange).toHaveBeenCalledWith('liste')
    })

    it('Home ilk taba, End son taba geçer', () => {
        const THREE = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
        ]
        const onChange = jest.fn()
        render(<SegmentedTabs options={THREE} value="b" onChange={onChange} ariaLabel="Görünüm" />)
        const b = screen.getByRole('tab', { name: 'B' })
        b.focus()
        fireEvent.keyDown(b, { key: 'Home' })
        expect(onChange).toHaveBeenCalledWith('a')
        fireEvent.keyDown(b, { key: 'End' })
        expect(onChange).toHaveBeenCalledWith('c')
    })
})
