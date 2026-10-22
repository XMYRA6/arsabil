/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { SegmentedControl } from '../SegmentedControl'

const items = [{ value: 'g', label: 'Gündüz' }, { value: 'n', label: 'Gece' }]

describe('SegmentedControl', () => {
  it('radiogroup + radio rolleri, seçili olan aria-checked', () => {
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="g" onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'Zaman' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Gündüz' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Gece' })).toHaveAttribute('aria-checked', 'false')
  })
  it('tıklayınca onChange(value)', () => {
    const fn = jest.fn()
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="g" onChange={fn} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Gece' }))
    expect(fn).toHaveBeenCalledWith('n')
  })
  it('seçili olanı yeniden tıklamak onChange çağırmaz', () => {
    const fn = jest.fn()
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="g" onChange={fn} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Gündüz' }))
    expect(fn).not.toHaveBeenCalled()
  })
  it('ok tuşları seçimi değiştirir (sağ/sol, sarmal)', () => {
    const fn = jest.fn()
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="n" onChange={fn} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Gece' }), { key: 'ArrowRight' })
    expect(fn).toHaveBeenCalledWith('g')
  })
  it('yalnız seçili radio tab sırasındadır (roving tabindex)', () => {
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="g" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Gündüz' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'Gece' })).toHaveAttribute('tabindex', '-1')
  })
})
