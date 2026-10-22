/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Stat } from '../Stat'

describe('Stat', () => {
  it('etiket, değer, birim ve alt metin', () => {
    render(<Stat label="Min. daire fiyatı" value="7.530.000" unit="₺" hint="Kâr hedefi korunarak" />)
    expect(screen.getByText('Min. daire fiyatı')).toBeInTheDocument()
    expect(screen.getByText('7.530.000')).toBeInTheDocument()
    expect(screen.getByText('₺')).toBeInTheDocument()
    expect(screen.getByText('Kâr hedefi korunarak')).toBeInTheDocument()
  })
  it('birim ve alt metin isteğe bağlı', () => {
    render(<Stat label="A" value="1" />)
    expect(screen.queryByTestId('stat-unit')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stat-hint')).not.toBeInTheDocument()
  })
  it('tone: ok/bad değeri renklendirir (sınıf), varsayılan nötr', () => {
    const { rerender } = render(<Stat label="A" value="1" />)
    expect(screen.getByText('1').className).toMatch(/neutral/)
    rerender(<Stat label="A" value="1" tone="ok" />)
    expect(screen.getByText('1').className).toMatch(/ok/)
    rerender(<Stat label="A" value="1" tone="bad" />)
    expect(screen.getByText('1').className).toMatch(/bad/)
  })
  it('dl/dt/dd semantiği', () => {
    const { container } = render(<Stat label="A" value="1" />)
    expect(container.querySelector('dl')).not.toBeNull()
    expect(container.querySelector('dt')?.textContent).toBe('A')
    expect(container.querySelector('dd')?.textContent).toContain('1')
  })
})
