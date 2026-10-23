/** @jest-environment jsdom */
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardStep2Detail } from './WizardStep2Detail'
import { emptyFormData } from './types'

describe('WizardStep2Detail — İlan Türü (segment)', () => {
    const grup = () => screen.getByRole('group', { name: 'İlan Türü' })

    it('varsayılan olarak Kat karşılığı seçili gelir', () => {
        render(<WizardStep2Detail data={emptyFormData} onChange={jest.fn()} />)
        expect(within(grup()).getByRole('button', { name: 'Kat karşılığı' })).toHaveAttribute('aria-pressed', 'true')
        expect(within(grup()).getByRole('button', { name: 'Satış' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('tıklanınca onChange { type: değer } ile çağrılır', () => {
        const onChange = jest.fn()
        render(<WizardStep2Detail data={emptyFormData} onChange={onChange} />)
        fireEvent.click(within(grup()).getByRole('button', { name: 'Satış' }))
        expect(onChange).toHaveBeenCalledWith({ type: 'SALE' })
    })

    it('üç seçenek de mevcuttur: Satış, Kat karşılığı, Ortaklık (değerler API enumlarıyla aynı)', () => {
        const onChange = jest.fn()
        render(<WizardStep2Detail data={emptyFormData} onChange={onChange} />)
        fireEvent.click(within(grup()).getByRole('button', { name: 'Ortaklık' }))
        fireEvent.click(within(grup()).getByRole('button', { name: 'Kat karşılığı' }))
        expect(onChange).toHaveBeenNthCalledWith(1, { type: 'ORTAKLIK' })
        expect(onChange).toHaveBeenNthCalledWith(2, { type: 'KAT_KARSILIGI' })
    })
})

describe('WizardStep2Detail — İmar Durumu (çipler)', () => {
    const grup = () => screen.getByRole('group', { name: 'İmar Durumu' })

    it('çip tıklanınca imar değeri gönderilir', () => {
        const onChange = jest.fn()
        render(<WizardStep2Detail data={emptyFormData} onChange={onChange} />)
        fireEvent.click(within(grup()).getByRole('button', { name: 'Ticari' }))
        expect(onChange).toHaveBeenCalledWith({ zoning: 'TICARI' })
    })

    it('seçili çipe tekrar tıklanınca seçim temizlenir', () => {
        const onChange = jest.fn()
        render(<WizardStep2Detail data={{ ...emptyFormData, zoning: 'KONUT' }} onChange={onChange} />)
        fireEvent.click(within(grup()).getByRole('button', { name: 'Konut' }))
        expect(onChange).toHaveBeenCalledWith({ zoning: '' })
    })
})
