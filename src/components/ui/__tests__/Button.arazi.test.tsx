/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Button } from '../Button'

describe('Button (Arazi)', () => {
  it('varsayılan birincil: button.primary, boyut m', () => {
    render(<Button>Kaydet</Button>)
    const b = screen.getByRole('button', { name: 'Kaydet' })
    expect(b.className).toMatch(/primary/)
    expect(b.className).toMatch(/size-m|sizeM/)
  })
  it.each(['primary', 'secondary', 'tertiary', 'amber'] as const)('%s varyantı sınıf alır', (v) => {
    render(<Button variant={v}>X</Button>)
    expect(screen.getByRole('button').className).toMatch(new RegExp(v))
  })
  it('eski outline → secondary, ghost → tertiary (geriye uyum)', () => {
    const { rerender } = render(<Button variant="outline">A</Button>)
    expect(screen.getByRole('button').className).toMatch(/secondary/)
    rerender(<Button variant="ghost">A</Button>)
    expect(screen.getByRole('button').className).toMatch(/tertiary/)
  })
  it('boyutlar s/m/l', () => {
    const { rerender } = render(<Button size="s">A</Button>)
    expect(screen.getByRole('button').className).toMatch(/size-s|sizeS/)
    rerender(<Button size="l">A</Button>)
    expect(screen.getByRole('button').className).toMatch(/size-l|sizeL/)
  })
  it('iconLeft ve iconRight metnin yanında, aria-hidden sarmalayıcıda', () => {
    render(<Button iconLeft={<i data-testid="l" />} iconRight={<i data-testid="r" />}>Git</Button>)
    expect(screen.getByTestId('l').parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('r').parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: 'Git' })).toBeInTheDocument()
  })
  it('fullWidth ve disabled çalışır, type varsayılanı button', () => {
    render(<Button fullWidth disabled>A</Button>)
    const b = screen.getByRole('button')
    expect(b).toBeDisabled()
    expect(b.className).toMatch(/fullWidth/)
    expect(b).toHaveAttribute('type', 'button')
  })
  it('type="submit" geçilirse korunur', () => {
    render(<Button type="submit">A</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})
