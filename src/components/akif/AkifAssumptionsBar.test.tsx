/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AkifAssumptionsBar } from './AkifAssumptionsBar'

it('ikisi de boş → hiçbir şey render etmez', () => {
  const { container } = render(<AkifAssumptionsBar assumptions={[]} missingFields={[]} />)
  expect(container).toBeEmptyDOMElement()
})

it('varsayımları rozet olarak gösterir', () => {
  render(
    <AkifAssumptionsBar
      assumptions={['Kalite: orta (varsayılan)', 'Birim maliyet: 18.000 TL/m²']}
      missingFields={[]}
    />,
  )
  expect(screen.getByText('Kalite: orta (varsayılan)')).toBeInTheDocument()
  expect(screen.getByText('Birim maliyet: 18.000 TL/m²')).toBeInTheDocument()
})

it('eksik alanları uyarı bölümünde gösterir', () => {
  render(<AkifAssumptionsBar assumptions={[]} missingFields={['müteahhit payı']} />)
  expect(screen.getByText(/Eksik/)).toBeInTheDocument()
  expect(screen.getByText('müteahhit payı')).toBeInTheDocument()
})
