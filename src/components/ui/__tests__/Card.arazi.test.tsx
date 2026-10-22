/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Card } from '../Card'

describe('Card (Arazi)', () => {
  it('başlık h3 ve içerik render edilir', () => {
    render(<Card title="Özet">içerik</Card>)
    expect(screen.getByRole('heading', { level: 3, name: 'Özet' })).toBeInTheDocument()
    expect(screen.getByText('içerik')).toBeInTheDocument()
  })
  it('varsayılan varyant glass (geriye uyum) ve yeni varyantlar sınıf alır', () => {
    const { container, rerender } = render(<Card>a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/glass/)
    rerender(<Card variant="accent">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/accent/)
    rerender(<Card variant="flat">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/flat/)
  })
  it('padding prop: none|m|l sınıfları (varsayılan m)', () => {
    const { container, rerender } = render(<Card>a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/padM/)
    rerender(<Card padding="l">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/padL/)
    rerender(<Card padding="none">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/padNone/)
  })
  it('className eklenir', () => {
    const { container } = render(<Card className="ek">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/ek/)
  })
})
