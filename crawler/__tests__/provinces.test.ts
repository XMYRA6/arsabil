import { PROVINCES, foldTrToAscii } from '../data/provinces'

describe('provinces', () => {
  it('81 il içerir', () => {
    expect(PROVINCES).toHaveLength(81)
  })

  it('tkgmName benzersizdir', () => {
    const names = PROVINCES.map((p) => p.tkgmName)
    expect(new Set(names).size).toBe(81)
  })

  it('emlakjetSlug benzersizdir', () => {
    const slugs = PROVINCES.map((p) => p.emlakjetSlug)
    expect(new Set(slugs).size).toBe(81)
  })

  it('emlakjetSlug yalnızca küçük harf ve tire içerir', () => {
    for (const p of PROVINCES) {
      expect(p.emlakjetSlug).toMatch(/^[a-z-]+$/)
    }
  })

  it('bilinen edge-case slugları doğru üretir', () => {
    const bySlug = (name: string) => PROVINCES.find((p) => p.tkgmName === name)!.emlakjetSlug
    expect(bySlug('İstanbul')).toBe('istanbul')
    expect(bySlug('Şanlıurfa')).toBe('sanliurfa')
    expect(bySlug('Afyonkarahisar')).toBe('afyonkarahisar')
    expect(bySlug('Kahramanmaraş')).toBe('kahramanmaras')
  })

  it('foldTrToAscii Türkçe karakterleri katlar', () => {
    expect(foldTrToAscii('Muğla')).toBe('mugla')
    expect(foldTrToAscii('Iğdır')).toBe('igdir')
    expect(foldTrToAscii('Çanakkale')).toBe('canakkale')
    expect(foldTrToAscii('Isparta')).toBe('isparta')
  })
})
