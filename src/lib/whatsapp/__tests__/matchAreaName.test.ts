import { matchAreaName } from '../matchAreaName'

const ILCE = [
  { id: 1, text: 'Ortahisar' },
  { id: 2, text: 'Akçaabat' },
  { id: 3, text: 'Of' },
]
const MAH = [
  { id: 10, text: 'UĞURLU' },
  { id: 11, text: 'UĞURLUOĞLU' },
  { id: 12, text: 'YENİ MAHALLE' },
]

describe('matchAreaName', () => {
  it('tam eşitlik (normalize sonrası) tek aday', () => {
    expect(matchAreaName('ortahisar', ILCE)).toEqual([{ id: 1, text: 'Ortahisar' }])
  })
  it('Türkçe İ/ı farkını katlar', () => {
    expect(matchAreaName('uğurlu', MAH)).toEqual([{ id: 10, text: 'UĞURLU' }])
  })
  it('prefix çoklu aday döner', () => {
    const r = matchAreaName('uğurl', MAH)
    expect(r.map(x => x.id).sort()).toEqual([10, 11])
  })
  it('"mah." son ekini temizler', () => {
    expect(matchAreaName('yeni mah.', MAH)).toEqual([{ id: 12, text: 'YENİ MAHALLE' }])
  })
  it('eşleşme yoksa boş dizi', () => {
    expect(matchAreaName('bambaşka', ILCE)).toEqual([])
  })
  it('tam eşitlik varsa prefix adayları elenir, sadece tam eşleşen döner', () => {
    const r = matchAreaName('of', [{ id: 1, text: 'Of' }, { id: 2, text: 'Ofça' }])
    expect(r).toEqual([{ id: 1, text: 'Of' }])
  })
})
