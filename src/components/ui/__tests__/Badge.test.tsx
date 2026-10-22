/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Badge } from '../Badge'

describe('Badge', () => {
  it('metni gösterir, varsayılan nötr', () => {
    render(<Badge>Taslak</Badge>)
    const el = screen.getByText('Taslak')
    expect(el.className).toMatch(/neutral/)
  })
  it.each(['neutral', 'ok', 'bad', 'amber', 'blue'] as const)('%s tonu', (tone) => {
    render(<Badge tone={tone}>X</Badge>)
    expect(screen.getByText('X').className).toMatch(new RegExp(tone))
  })
  it('bir span render eder ve ek className alır', () => {
    render(<Badge className="ek">X</Badge>)
    const el = screen.getByText('X')
    expect(el.tagName).toBe('SPAN')
    expect(el.className).toMatch(/ek/)
  })
})
