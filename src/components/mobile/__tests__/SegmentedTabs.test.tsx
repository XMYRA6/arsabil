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
})
