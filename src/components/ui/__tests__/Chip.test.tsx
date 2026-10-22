/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { Chip } from '../Chip'

describe('Chip', () => {
  it('düğme olarak render edilir, aria-pressed seçili durumu yansıtır', () => {
    const { rerender } = render(<Chip>Konut</Chip>)
    expect(screen.getByRole('button', { name: 'Konut' })).toHaveAttribute('aria-pressed', 'false')
    rerender(<Chip selected>Konut</Chip>)
    const b = screen.getByRole('button', { name: 'Konut' })
    expect(b).toHaveAttribute('aria-pressed', 'true')
    expect(b.className).toMatch(/selected/)
  })
  it('tıklayınca onClick çağrılır', () => {
    const fn = jest.fn()
    render(<Chip onClick={fn}>A</Chip>)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('disabled iken tıklama çalışmaz', () => {
    const fn = jest.fn()
    render(<Chip disabled onClick={fn}>A</Chip>)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).not.toHaveBeenCalled()
  })
})
