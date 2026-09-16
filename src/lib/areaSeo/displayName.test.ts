import { toTitleCase, areaLookupKey, resolveDisplayNames } from './displayName'

describe('toTitleCase', () => {
  it('ALL-CAPS Türkçe girdiyi başlık-case yapar, İ/I ayrımını korur', () => {
    expect(toTitleCase('DURUBİNAR')).toBe('Durubinar')
    expect(toTitleCase('AKÇAABAT')).toBe('Akçaabat')
    expect(toTitleCase('IĞDIR')).toBe('Iğdır')
  })

  it('çok kelimeli adları kelime başına büyütür', () => {
    expect(toTitleCase('YENİ MAHALLE')).toBe('Yeni Mahalle')
  })
})

describe('areaLookupKey', () => {
  it('il/ilçe/mahalle bileşenlerini | ile birleştirir, null bileşeni boş bırakır', () => {
    expect(areaLookupKey('TRABZON', null, null)).toBe('TRABZON||')
    expect(areaLookupKey('TRABZON', 'AKCAABAT', null)).toBe('TRABZON|AKCAABAT|')
    expect(areaLookupKey('TRABZON', 'AKCAABAT', 'DURUBINAR')).toBe('TRABZON|AKCAABAT|DURUBINAR')
  })
})

describe('resolveDisplayNames', () => {
  const rawRows = [
    { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' },
    { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Yıldızlı' },
    { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Bulut' },
  ]
  const deps = { listDistinctMarketAreas: async () => rawRows }

  it('mahalle seviyesi: tam üçlü eşleşmeden doğru casing döner', async () => {
    // Not: normalizeAreaName YALNIZ İ/ı'yı katlar, ç/ğ/ö/ş/ü'yü DEĞİL —
    // normalizeAreaName('Akçaabat') === 'AKÇAABAT' (Ç kalır). Sorgu anahtarı
    // bu yüzden 'AKÇAABAT' (düz 'AKCAABAT' değil).
    const out = await resolveDisplayNames(
      [{ il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: 'DURUBINAR' }],
      deps,
    )
    const v = out.get(areaLookupKey('TRABZON', 'AKÇAABAT', 'DURUBINAR'))
    expect(v).toEqual({ il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' })
  })

  it('ilçe seviyesi: mahalle bilgisi olmadan da il+ilçe casing\'i bulunur', async () => {
    const out = await resolveDisplayNames(
      [{ il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: null }],
      deps,
    )
    const v = out.get(areaLookupKey('TRABZON', 'AKÇAABAT', null))
    expect(v).toEqual({ il: 'Trabzon', ilce: 'Akçaabat', mahalle: null })
  })

  it('il seviyesi: yalnız il casing\'i bulunur', async () => {
    const out = await resolveDisplayNames([{ il: 'TRABZON', ilce: null, mahalle: null }], deps)
    const v = out.get(areaLookupKey('TRABZON', null, null))
    expect(v).toEqual({ il: 'Trabzon', ilce: null, mahalle: null })
  })

  it('eşleşen ham satır yoksa normalize anahtardan title-case üretir (fallback)', async () => {
    // 'KADIKOY' (ham kaynaksız, düz ASCII normalize anahtar) tr-TR ile
    // küçültülünce ASCII 'I' dotless 'ı'ya döner ('kadıkoy') — bu, eşleşen ham
    // satır yokken kaçınılmaz bir tahmin (İ/I/ı/i ayrımı normalize anahtarda
    // zaten kaybolmuş durumda; spec bunu kabul edilen kozmetik risk olarak
    // not düşmüştü). 'ISTANBUL'/'MODA' bu belirsizliğe girmiyor (normalizeAreaName
    // için gerçekçi çıktılar), o yüzden değişmedi.
    const out = await resolveDisplayNames(
      [{ il: 'ISTANBUL', ilce: 'KADIKOY', mahalle: 'MODA' }],
      deps,
    )
    const v = out.get(areaLookupKey('ISTANBUL', 'KADIKOY', 'MODA'))
    expect(v).toEqual({ il: 'Istanbul', ilce: 'Kadıkoy', mahalle: 'Moda' })
  })

  it('aynı normalize anahtara birden fazla ham satır düşerse İLK görüleni kullanır', async () => {
    const dupDeps = {
      listDistinctMarketAreas: async () => [
        { il: 'Trabzon', ilce: 'İyidere', mahalle: null },
        { il: 'Trabzon', ilce: 'Iyidere', mahalle: null },
      ],
    }
    const out = await resolveDisplayNames([{ il: 'TRABZON', ilce: 'IYIDERE', mahalle: null }], dupDeps)
    const v = out.get(areaLookupKey('TRABZON', 'IYIDERE', null))
    expect(v?.ilce).toBe('İyidere')
  })
})
