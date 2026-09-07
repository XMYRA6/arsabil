import { resolveArea } from '../../tuik/areaCodes'

describe('resolveArea', () => {
  it('bilinen ilçe kodu → il + ilçe (IKAMET_YERI 4 haneli sayısal)', () => {
    expect(resolveArea('1421')).toEqual({ il: 'İstanbul', ilce: 'Kadıköy' })
  })

  it('bilinen il kodu → il, ilce null (IKAMET_YERI "TRxxx")', () => {
    expect(resolveArea('TR100')).toEqual({ il: 'İstanbul', ilce: null })
  })

  it('baştaki/sondaki boşluk kırpılır', () => {
    expect(resolveArea('  TR100  ')).toEqual({ il: 'İstanbul', ilce: null })
  })

  it('bilinmeyen kod → null', () => {
    expect(resolveArea('TR_ILCE_ZZZZ')).toBeNull()
    expect(resolveArea('_T')).toBeNull()
  })

  it('boş / whitespace kod → null', () => {
    expect(resolveArea('')).toBeNull()
    expect(resolveArea('  ')).toBeNull()
  })
})
