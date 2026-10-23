/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterSidebar } from '@/components/marketplace/FilterSidebar'

const FILTERS = {
    type: ['KAT_KARSILIGI', 'ORTAKLIK'],
    minSize: 200, maxSize: 10000,
    imar: [] as string[],
    fizibiliteOnly: false, minScore: 10,
}

describe('FilterSidebar', () => {
    it('ilan sayısını gösterir', () => {
        render(<FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={42} />)
        expect(screen.getByText('42 ilan bulundu')).toBeInTheDocument()
    })

    it('imar onay kutusu tıklaması onChange ile filtreyi ekler', () => {
        const onChange = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={onChange} totalCount={0} />)
        fireEvent.click(screen.getByRole('checkbox', { name: 'Konut' }))
        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, imar: ['KONUT'] })
    })

    it('inSheet verilince kök eleman inSheet sınıfını alır', () => {
        const { container } = render(
            <FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={0} inSheet />
        )
        expect((container.firstChild as HTMLElement).className).toContain('inSheet')
    })

    it('Filtreleri uygula onApply çağırır', () => {
        const onApply = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={0} onApply={onApply} />)
        fireEvent.click(screen.getByRole('button', { name: 'Filtreleri uygula' }))
        expect(onApply).toHaveBeenCalledTimes(1)
    })

    it('EMSAL bölümü artık render edilmiyor (backing alan yok)', () => {
        render(<FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={0} />)
        expect(screen.queryByText('EMSAL')).not.toBeInTheDocument()
    })

    it('Ticari imar onay kutusu tıklaması TICARI değerini gönderir (yeni enum, eski TICARET DEĞİL)', () => {
        const onChange = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={onChange} totalCount={0} />)
        fireEvent.click(screen.getByRole('checkbox', { name: 'Ticari' }))
        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, imar: ['TICARI'] })
    })

    it('Kat Karşılığı / Ortaklık checkbox tıklaması KAT_KARSILIGI ve ORTAKLIK ikisini birden kaldırır', () => {
        const onChange = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={onChange} totalCount={0} />)
        const row = screen.getByText('Kat Karşılığı / Ortaklık').closest('label')
        const checkbox = row?.querySelector('input[type="checkbox"]')
        fireEvent.click(checkbox as HTMLElement)
        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, type: [] })
    })

    it('inSheet varyantında imar seçenekleri çip (buton) olarak çıkar ve değeri gönderir (Figma 07 filtre sayfası)', () => {
        const onChange = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={onChange} totalCount={7} inSheet />)
        fireEvent.click(screen.getByRole('button', { name: 'Karma' }))
        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, imar: ['KARMA'] })
        expect(screen.getByRole('button', { name: '7 ilanı göster' })).toBeInTheDocument()
    })
})
