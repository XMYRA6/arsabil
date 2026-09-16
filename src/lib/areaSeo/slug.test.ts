import { slugify } from './slug'

describe('slugify', () => {
  it('Türkçe karakterleri ASCII\'ye katlar', () => {
    expect(slugify('Akçaabat')).toBe('akcaabat')
    expect(slugify('İyidere')).toBe('iyidere')
    expect(slugify('Iğdır')).toBe('igdir')
    expect(slugify('Şişli')).toBe('sisli')
    expect(slugify('Üsküdar')).toBe('uskudar')
    expect(slugify('Ördekli')).toBe('ordekli')
  })

  it('boşlukları tire yapar, birden fazla boşluğu tek tireye indirger', () => {
    expect(slugify('Durubinar Mahallesi')).toBe('durubinar-mahallesi')
    expect(slugify('Çok   Boşluklu   Ad')).toBe('cok-bosluklu-ad')
  })

  it('başta/sonda tire bırakmaz', () => {
    expect(slugify('  Trabzon  ')).toBe('trabzon')
  })

  it('zaten ASCII/küçük harf girdiyi bozmaz', () => {
    expect(slugify('ortahisar')).toBe('ortahisar')
  })

  it('ALL-CAPS girdiyi de doğru küçültür (normalizeAreaName çıktısı gibi)', () => {
    expect(slugify('AKÇAABAT')).toBe('akcaabat')
  })
})
