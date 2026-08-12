/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useState } from 'react'
import { CitySearch } from './CitySearch'

type SelectedCity = { name: string; lat: number; lng: number; zoom: number; province?: string }

function Harness({ onSelect }: { onSelect?: (c: SelectedCity) => void }) {
    const [selectedCity, setSelectedCity] = useState('')
    return (
        <CitySearch
            selectedCity={selectedCity}
            onCitySelect={(city) => { setSelectedCity(city.name); onSelect?.(city) }}
        />
    )
}

describe('CitySearch — il/ilçe state', () => {
    it('ilçe seçildikten sonra "İlçe" butonu kaybolmaz, province bilgisi callback ile geçer', () => {
        const onSelect = jest.fn()
        render(<Harness onSelect={onSelect} />)

        fireEvent.change(screen.getByPlaceholderText('İl ara…'), { target: { value: 'İstanbul' } })
        fireEvent.click(screen.getByText('İstanbul'))

        fireEvent.click(screen.getByRole('button', { name: /İlçe/i }))
        fireEvent.click(screen.getByText('Kadıköy'))

        expect(onSelect).toHaveBeenLastCalledWith({ name: 'Kadıköy', lat: 40.9927, lng: 29.0277, zoom: 14, province: 'İstanbul' })
        expect(screen.getByRole('button', { name: /İlçe/i })).toBeInTheDocument()
    })

    it('il seçiminde province alanı gönderilmez', () => {
        const onSelect = jest.fn()
        render(<Harness onSelect={onSelect} />)

        fireEvent.change(screen.getByPlaceholderText('İl ara…'), { target: { value: 'İstanbul' } })
        fireEvent.click(screen.getByText('İstanbul'))

        expect(onSelect).toHaveBeenLastCalledWith({ name: 'İstanbul', lat: 41.015, lng: 28.979, zoom: 12 })
    })

    it('ilçe seçildikten sonra köşe rozeti ilçe adını değil, ili göstermeye devam eder', () => {
        render(<Harness />)

        fireEvent.change(screen.getByPlaceholderText('İl ara…'), { target: { value: 'İstanbul' } })
        fireEvent.click(screen.getByText('İstanbul'))
        expect(screen.getByTestId('cityBadge')).toHaveTextContent('İstanbul')

        fireEvent.click(screen.getByRole('button', { name: /İlçe/i }))
        fireEvent.click(screen.getByText('Kadıköy'))

        expect(screen.getByTestId('cityBadge')).toHaveTextContent('İstanbul')
    })
})
