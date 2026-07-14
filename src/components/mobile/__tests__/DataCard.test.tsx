/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DataCard, CardList } from '../DataCard'

describe('DataCard', () => {
    it('başlık ve etiket-değer çiftlerini render eder', () => {
        render(
            <CardList>
                <DataCard
                    title="Kadıköy 450m²"
                    subtitle="2 gün önce"
                    fields={[
                        { label: 'Fiyat', value: '2.400.000 ₺' },
                        { label: 'Durum', value: 'Onaylı' },
                    ]}
                />
            </CardList>
        )
        expect(screen.getByText('Kadıköy 450m²')).toBeInTheDocument()
        expect(screen.getByText('2 gün önce')).toBeInTheDocument()
        expect(screen.getByText('Fiyat')).toBeInTheDocument()
        expect(screen.getByText('2.400.000 ₺')).toBeInTheDocument()
        expect(screen.getByText('Durum')).toBeInTheDocument()
        expect(screen.getByText('Onaylı')).toBeInTheDocument()
    })

    it('href verilirse kart içeriği linke sarılır', () => {
        render(
            <CardList>
                <DataCard title="İlan A" href="/listing/abc" />
            </CardList>
        )
        expect(screen.getByRole('link')).toHaveAttribute('href', '/listing/abc')
    })

    it('href verilmezse link render etmez', () => {
        render(
            <CardList>
                <DataCard title="İlan B" />
            </CardList>
        )
        expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('actions bölümünü render eder', () => {
        render(
            <CardList>
                <DataCard title="İlan C" actions={<button>Sil</button>} />
            </CardList>
        )
        expect(screen.getByRole('button', { name: 'Sil' })).toBeInTheDocument()
    })

    it('CardList bir liste, DataCard bir liste öğesidir', () => {
        render(
            <CardList>
                <DataCard title="A" />
                <DataCard title="B" />
            </CardList>
        )
        expect(screen.getByRole('list')).toBeInTheDocument()
        expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    it('className prop\'u verilirse kök <li>\'ye eklenir (varsayılan .card sınıfının yanına)', () => {
        const { container } = render(
            <CardList>
                <DataCard title="İlan D" className="customGlass" />
            </CardList>
        )
        const li = container.querySelector('li')
        expect(li?.className).toContain('customGlass')
    })
})
