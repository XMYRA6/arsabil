import { extractParcelQuery } from '../extractParcelQuery'

describe('extractParcelQuery', () => {
  it('"İl İlçe Mahalle ada/parsel"', () => {
    expect(extractParcelQuery('Trabzon Ortahisar Uğurlu 123/45')).toEqual({
      ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Uğurlu',
      ada: '123', parsel: '45',
    })
  })
  it('"123 ada 45 parsel" + konum', () => {
    const r = extractParcelQuery('Trabzon Of 123 ada 45 parsel')
    expect(r.ada).toBe('123')
    expect(r.parsel).toBe('45')
    expect(r.ilText).toBe('Trabzon')
    expect(r.ilceText).toBe('Of')
  })
  it('"ada: 5 parsel: 10" (iki nokta)', () => {
    const r = extractParcelQuery('ada: 5 parsel: 10')
    expect(r.ada).toBe('5')
    expect(r.parsel).toBe('10')
    expect(r.ilText).toBeUndefined()
  })
  it('tek kelime → sadece ilText', () => {
    expect(extractParcelQuery('Ortahisar')).toEqual({ ilText: 'Ortahisar' })
  })
  it('iki kelime → il + ilçe', () => {
    expect(extractParcelQuery('Trabzon Akçaabat')).toEqual({
      ilText: 'Trabzon', ilceText: 'Akçaabat',
    })
  })
  it('mahalle "mah" son eki metinde kalır (resolve temizler)', () => {
    const r = extractParcelQuery('Trabzon Ortahisar Yeni Mah 1/2')
    expect(r.mahalleText).toBe('Yeni Mah')
  })
  it('çöp/boş → boş nesne', () => {
    expect(extractParcelQuery('merhaba nasılsın')).toEqual({
      ilText: 'merhaba', ilceText: 'nasılsın',
    })
    expect(extractParcelQuery('')).toEqual({})
    expect(extractParcelQuery('   ')).toEqual({})
  })
})
