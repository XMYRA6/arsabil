/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardStep2Detail } from './WizardStep2Detail'
import { emptyFormData } from './types'

describe('WizardStep2Detail — İlan Türü', () => {
    it('varsayılan olarak Kat Karşılığı seçili gelir', () => {
        render(<WizardStep2Detail data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByRole('combobox', { name: 'İlan Türü' })).toHaveValue('KAT_KARSILIGI')
    })

    it('değiştirildiğinde onChange { type: değer } ile çağrılır', () => {
        const onChange = jest.fn()
        render(<WizardStep2Detail data={emptyFormData} onChange={onChange} />)
        fireEvent.change(screen.getByRole('combobox', { name: 'İlan Türü' }), { target: { value: 'SALE' } })
        expect(onChange).toHaveBeenCalledWith({ type: 'SALE' })
    })

    it('üç seçenek de mevcuttur: Kat Karşılığı, Satış, Ortaklık', () => {
        render(<WizardStep2Detail data={emptyFormData} onChange={jest.fn()} />)
        const select = screen.getByRole('combobox', { name: 'İlan Türü' })
        const values = Array.from(select.querySelectorAll('option')).map(o => (o as HTMLOptionElement).value)
        expect(values).toEqual(['KAT_KARSILIGI', 'SALE', 'ORTAKLIK'])
    })
})
