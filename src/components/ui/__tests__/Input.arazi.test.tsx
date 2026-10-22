/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Input } from '../Input'

describe('Input (Arazi)', () => {
  it('etiket input ile bağlanır (getByLabelText)', () => {
    render(<Input label="E-posta" />)
    expect(screen.getByLabelText('E-posta')).toBeInTheDocument()
  })
  it('kendi id geçilirse etiket o id ile bağlanır', () => {
    render(<Input id="mail" label="E-posta" />)
    expect(screen.getByLabelText('E-posta')).toHaveAttribute('id', 'mail')
  })
  it('hata: aria-invalid + aria-describedby hata metnine bağlanır, role=alert', () => {
    render(<Input label="Şifre" error="En az 8 karakter" />)
    const input = screen.getByLabelText('Şifre')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const err = screen.getByRole('alert')
    expect(err).toHaveTextContent('En az 8 karakter')
    expect(input.getAttribute('aria-describedby')).toContain(err.id)
  })
  it('hata yokken aria-invalid yok', () => {
    render(<Input label="A" />)
    expect(screen.getByLabelText('A')).not.toHaveAttribute('aria-invalid')
  })
  it('icon ve rightElement render edilir', () => {
    render(<Input label="A" icon={<i data-testid="i" />} rightElement={<b data-testid="r" />} />)
    expect(screen.getByTestId('i')).toBeInTheDocument()
    expect(screen.getByTestId('r')).toBeInTheDocument()
  })
  it('input props (placeholder, type) geçer; className kapsayıcıya gider', () => {
    const { container } = render(<Input label="A" placeholder="x" type="email" className="ek" />)
    const input = screen.getByLabelText('A')
    expect(input).toHaveAttribute('placeholder', 'x')
    expect(input).toHaveAttribute('type', 'email')
    expect((container.firstChild as HTMLElement).className).toMatch(/ek/)
  })
})
