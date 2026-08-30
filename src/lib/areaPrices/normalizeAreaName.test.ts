import { normalizeAreaName } from './normalizeAreaName'

describe('normalizeAreaName', () => {
  it('ASCII-katlanmış TKGM adı ile portal yazımını aynı forma indirger', () => {
    expect(normalizeAreaName('Muratlı')).toBe(normalizeAreaName('Muratli'))
    expect(normalizeAreaName('Muratlı')).toBe('MURATLI')
  })

  it('tr-upper i/İ ıraksamasını giderir', () => {
    expect(normalizeAreaName('Ortahisar')).toBe(normalizeAreaName('ORTAHİSAR'))
    expect(normalizeAreaName('Ortahisar')).toBe('ORTAHISAR')
  })

  it('ş/ğ/ü/ö/ç korunur', () => {
    expect(normalizeAreaName('Uğurlu')).toBe('UĞURLU')
    expect(normalizeAreaName('şğüöç')).toBe('ŞĞÜÖÇ')
  })

  it('baştaki/sondaki boşlukları kırpar', () => {
    expect(normalizeAreaName('  Merkez  ')).toBe('MERKEZ')
  })
})
