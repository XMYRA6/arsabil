/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from '../Breadcrumb'

describe('Breadcrumb', () => {
  it('ara öğeleri link, son öğeyi düz metin render eder', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa Fiyatları', href: '/arsa-fiyatlari' },
          { label: 'Trabzon', href: '/arsa-fiyatlari/trabzon' },
          { label: 'Akçaabat' },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Anasayfa' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Trabzon' })).toHaveAttribute('href', '/arsa-fiyatlari/trabzon')
    expect(screen.queryByRole('link', { name: 'Akçaabat' })).not.toBeInTheDocument()
    expect(screen.getByText('Akçaabat')).toBeInTheDocument()
  })

  it('nav elementi aria-label taşır', () => {
    render(<Breadcrumb items={[{ label: 'Anasayfa', href: '/' }, { label: 'X' }]} />)
    expect(screen.getByRole('navigation', { name: 'Sayfa yolu' })).toBeInTheDocument()
  })
})
