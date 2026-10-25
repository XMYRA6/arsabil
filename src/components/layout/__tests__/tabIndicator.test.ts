import { hesaplaGosterge } from '../tabIndicator'

const rects = [
  { left: 8, width: 70 },
  { left: 86, width: 80 },
]

describe('hesaplaGosterge', () => {
  it('returns null when no tab is active (-1)', () => {
    expect(hesaplaGosterge(rects, -1)).toBeNull()
  })
  it('returns null when index is out of range', () => {
    expect(hesaplaGosterge(rects, 5)).toBeNull()
  })
  it('returns x and width of the active tab', () => {
    expect(hesaplaGosterge(rects, 1)).toEqual({ x: 86, width: 80 })
  })
})
