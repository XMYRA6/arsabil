import { resolveArea } from '../../tuik/areaCodes'

describe('resolveArea', () => {
  it('bilinmeyen kod → null', () => {
    expect(resolveArea('TR_ILCE_ZZZZ')).toBeNull()
  })

  it('boş / whitespace kod → null', () => {
    expect(resolveArea('')).toBeNull()
    expect(resolveArea('  ')).toBeNull()
  })
})
