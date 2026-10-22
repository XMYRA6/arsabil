import { autoSelectScene } from './autoSelect'

const base = { slopePercent: 3, treeCoverPercent: 0, hasBuilding: false, theme: 'light' as const }

describe('autoSelectScene · tür (nitelik)', () => {
  it.each([
    ['TARLA', 'tarla'],
    ['Tarla', 'tarla'],
    ['ARSA', 'arsa'],
    ['ARSA VASFINDA', 'arsa'],
    ['MESKEN', 'villa'],
    ['Konut', 'villa'],
    ['TİCARİ ALAN', 'ticari'],
    ['İŞYERİ', 'ticari'],
    ['APARTMAN', 'kat'],
    ['BAĞ', 'bag'],
    ['BAHÇE', 'bag'],
    ['ZEYTİNLİK', 'bag'],
    ['FINDIKLIK', 'bag'],
  ])('%s → %s', (nitelik, tur) => {
    expect(autoSelectScene({ ...base, nitelik }).tur).toBe(tur)
  })
  it('bilinmeyen veya boş nitelik → arsa', () => {
    expect(autoSelectScene({ ...base, nitelik: 'XYZ' }).tur).toBe('arsa')
    expect(autoSelectScene({ ...base, nitelik: '' }).tur).toBe('arsa')
    expect(autoSelectScene({ ...base, nitelik: null }).tur).toBe('arsa')
  })
})

describe('autoSelectScene · varyant', () => {
  it('arsa: ağaç örtüsü >= %15 → ağaçlı, altı → ağaçsız', () => {
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', treeCoverPercent: 15 }).varyant).toBe('agacli')
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', treeCoverPercent: 14.9 }).varyant).toBe('agacsiz')
  })
  it('arsa üzerinde bina varsa villa sahnesi', () => {
    const s = autoSelectScene({ ...base, nitelik: 'ARSA', hasBuilding: true })
    expect(s.tur).toBe('villa')
    expect(s.varyant).toBe('modern')
  })
  it('bağ: zeytin/fındık kelimesi varyantı belirler, yoksa asma', () => {
    expect(autoSelectScene({ ...base, nitelik: 'ZEYTİNLİK' }).varyant).toBe('zeytin')
    expect(autoSelectScene({ ...base, nitelik: 'FINDIKLIK' }).varyant).toBe('findik')
    expect(autoSelectScene({ ...base, nitelik: 'BAĞ' }).varyant).toBe('asma')
  })
  it('tarla → buğday, villa → modern, ticari → ofis, kat → bitmiş', () => {
    expect(autoSelectScene({ ...base, nitelik: 'TARLA' }).varyant).toBe('bugday')
    expect(autoSelectScene({ ...base, nitelik: 'MESKEN' }).varyant).toBe('modern')
    expect(autoSelectScene({ ...base, nitelik: 'TİCARİ' }).varyant).toBe('ofis')
    expect(autoSelectScene({ ...base, nitelik: 'APARTMAN' }).varyant).toBe('bitmis')
  })
})

describe('autoSelectScene · eğim', () => {
  it('< %10 düz, >= %10 yamaç', () => {
    expect(autoSelectScene({ ...base, nitelik: 'TARLA', slopePercent: 9.9 }).egim).toBe('duz')
    expect(autoSelectScene({ ...base, nitelik: 'TARLA', slopePercent: 10 }).egim).toBe('yamac')
  })
  it('ticari ve kat her zaman düz', () => {
    expect(autoSelectScene({ ...base, nitelik: 'TİCARİ', slopePercent: 30 }).egim).toBe('duz')
    expect(autoSelectScene({ ...base, nitelik: 'APARTMAN', slopePercent: 30 }).egim).toBe('duz')
  })
  it('eğim bilinmiyorsa (null) düz', () => {
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', slopePercent: null }).egim).toBe('duz')
  })
})

describe('autoSelectScene · zaman', () => {
  it('tema belirler: dark → gece, light → gündüz', () => {
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', theme: 'dark' }).zaman).toBe('gece')
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', theme: 'light' }).zaman).toBe('gunduz')
  })
  it('tema yoksa saat belirler: 19:00–05:59 gece', () => {
    const t = (hour: number) => autoSelectScene({ nitelik: 'ARSA', slopePercent: 0, treeCoverPercent: 0, hasBuilding: false, hour }).zaman
    expect(t(6)).toBe('gunduz')
    expect(t(18)).toBe('gunduz')
    expect(t(19)).toBe('gece')
    expect(t(23)).toBe('gece')
    expect(t(2)).toBe('gece')
    expect(t(5)).toBe('gece')
  })
})
