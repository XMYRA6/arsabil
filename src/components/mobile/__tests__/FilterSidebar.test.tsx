/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterSidebar } from '@/components/marketplace/FilterSidebar'

const FILTERS = {
    type: ['KAT_KARSILIGI'],
    minSize: 200, maxSize: 10000,
    imar: [] as string[], minEmsal: 0.8, maxEmsal: 3.0,
    fizibiliteOnly: false, minScore: 10,
}

describe('FilterSidebar', () => {
    it('ilan sayısını gösterir', () => {
        render(<FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={42} />)
        expect(screen.getByText('42 ilan bulundu')).toBeInTheDocument()
    })

    it('imar chip tıklaması onChange ile filtreyi ekler', () => {
        const onChange = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={onChange} totalCount={0} />)
        fireEvent.click(screen.getByRole('button', { name: 'Konut' }))
        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, imar: ['KONUT'] })
    })

    it('inSheet verilince kök eleman inSheet sınıfını alır', () => {
        const { container } = render(
            <FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={0} inSheet />
        )
        expect((container.firstChild as HTMLElement).className).toContain('inSheet')
    })

    it('Filtreleri Uygula onApply çağırır', () => {
        const onApply = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={0} onApply={onApply} />)
        fireEvent.click(screen.getByRole('button', { name: 'Filtreleri Uygula' }))
        expect(onApply).toHaveBeenCalledTimes(1)
    })
})
