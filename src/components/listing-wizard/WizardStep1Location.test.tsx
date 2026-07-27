/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardStep1Location } from './WizardStep1Location'
import { emptyFormData } from './types'

jest.mock('./ParcelPicker', () => ({
    ParcelPicker: ({ value }: { value: { lat: number | null } }) => (
        <div data-testid="parcel-picker">{value.lat == null ? 'pin-yok' : 'pin-var'}</div>
    ),
}))

describe('WizardStep1Location', () => {
    it('ParcelPicker render edilir', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByTestId('parcel-picker')).toBeInTheDocument()
    })

    it('mevcut il/ilçe/adres alanları korunur', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByText('İl *')).toBeInTheDocument()
        expect(screen.getByText('İlçe')).toBeInTheDocument()
        expect(screen.getByText('Tam Adres')).toBeInTheDocument()
    })

    it('koordinat yoksa ParcelPicker pin-yok durumunu alır', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByTestId('parcel-picker')).toHaveTextContent('pin-yok')
    })

    it('koordinat varsa ParcelPicker pin-var durumunu alır', () => {
        render(<WizardStep1Location data={{ ...emptyFormData, lat: 41.16, lng: 27.58 }} onChange={jest.fn()} />)
        expect(screen.getByTestId('parcel-picker')).toHaveTextContent('pin-var')
    })
})
