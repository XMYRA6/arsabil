import {
  validateInputs,
  validateFact,
  validateParcelRef,
  validateCreateArgs,
  diffInputs,
  applyChanges,
} from '../validation'

describe('validateInputs', () => {
  it('boş/undefined → ok, boş nesne', () => {
    expect(validateInputs(undefined)).toEqual({ ok: true, inputs: {} })
    expect(validateInputs({})).toEqual({ ok: true, inputs: {} })
  })

  it('geçerli girdiler kabul edilir', () => {
    const r = validateInputs({ arsaAlani: 850, emsal: 1.5, arsaSahibiPayiYuzde: 40, katAdedi: 4, kaliteSinifi: 'orta' })
    expect(r).toEqual({
      ok: true,
      inputs: { arsaAlani: 850, emsal: 1.5, arsaSahibiPayiYuzde: 40, katAdedi: 4, kaliteSinifi: 'orta' },
    })
  })

  it('bilinmeyen alan reddedilir', () => {
    expect(validateInputs({ foo: 1 })).toEqual({ ok: false, field: 'foo', reason: 'bilinmeyen alan' })
  })

  it('aralık dışı ve sayı olmayan değerler reddedilir', () => {
    expect(validateInputs({ arsaAlani: 5 }).ok).toBe(false) // area min 100
    expect(validateInputs({ arsaSahibiPayiYuzde: 100 }).ok).toBe(false) // percent 1-99
    expect(validateInputs({ emsal: '1.5' }).ok).toBe(false)
    expect(validateInputs({ katAdedi: 2.5 }).ok).toBe(false) // tam sayı
    expect(validateInputs({ katAdedi: 51 }).ok).toBe(false)
    expect(validateInputs({ kaliteSinifi: 'süper' }).ok).toBe(false)
    expect(validateInputs({ emsal: null }).ok).toBe(false)
  })

  it('nesne olmayan reddedilir', () => {
    expect(validateInputs([1]).ok).toBe(false)
    expect(validateInputs('x').ok).toBe(false)
  })
})

describe('validateFact', () => {
  it('geçerli olgular', () => {
    expect(validateFact({ key: 'areaSqm', value: 850, source: 'tkgm' })).toEqual({
      ok: true,
      fact: { key: 'areaSqm', value: 850, source: 'tkgm' },
    })
    expect(validateFact({ key: 'imarDurumu', value: '  Konut Alanı ', source: 'kullanici' })).toEqual({
      ok: true,
      fact: { key: 'imarDurumu', value: 'Konut Alanı', source: 'kullanici' },
    })
    expect(validateFact({ key: 'emsal', value: 1.5, source: 'kullanici' }).ok).toBe(true)
    expect(validateFact({ key: 'katAdedi', value: 4, source: 'kullanici' }).ok).toBe(true)
    expect(validateFact({ key: 'daireFiyati', value: { m2: 150, tl: 7_000_000 }, source: 'ilan' })).toEqual({
      ok: true,
      fact: { key: 'daireFiyati', value: { m2: 150, tl: 7_000_000 }, source: 'ilan' },
    })
  })

  it('geçersiz anahtar/kaynak/değer reddedilir', () => {
    expect(validateFact({ key: 'x', value: 1, source: 'tkgm' }).ok).toBe(false)
    expect(validateFact({ key: 'areaSqm', value: 1, source: 'rüya' }).ok).toBe(false)
    expect(validateFact({ key: 'areaSqm', value: -5, source: 'tkgm' }).ok).toBe(false)
    expect(validateFact({ key: 'emsal', value: 99, source: 'kullanici' }).ok).toBe(false)
    expect(validateFact({ key: 'imarDurumu', value: '   ', source: 'kullanici' }).ok).toBe(false)
    expect(validateFact({ key: 'daireFiyati', value: { m2: 150 }, source: 'ilan' }).ok).toBe(false)
    expect(validateFact(null).ok).toBe(false)
  })
})

describe('validateParcelRef', () => {
  it('il/ilçe/mahalle normalize edilir, ada/parsel kırpılır, sayı string olur', () => {
    const r = validateParcelRef({ il: 'Trabzon', ilce: ' Ortahisar ', mahalle: 'Uğurlu', ada: ' 123 ', parsel: 45 })
    expect(r).toEqual({
      ok: true,
      parcel: { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' },
    })
  })

  it('aynı parselin farklı yazımları aynı sonucu verir (Review Focus 4)', () => {
    const a = validateParcelRef({ il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45' })
    const b = validateParcelRef({ il: 'TRABZON', ilce: 'ortahisar'.toUpperCase(), mahalle: 'Uğurlu ', ada: ' 123', parsel: '45 ' })
    expect(a).toEqual(b)
  })

  it('eksik/boş alan reddedilir', () => {
    expect(validateParcelRef({ il: 'Trabzon', ilce: '', mahalle: 'x', ada: '1', parsel: '2' }).ok).toBe(false)
    expect(validateParcelRef({ il: 'T', ilce: 'O', mahalle: 'U', ada: '1' }).ok).toBe(false)
    expect(validateParcelRef(null).ok).toBe(false)
  })
})

describe('validateCreateArgs', () => {
  const parcel = { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '1', parsel: '2' }

  it('minimum geçerli: tek parsel', () => {
    const r = validateCreateArgs({ parcels: [parcel] })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.parcels).toHaveLength(1)
      expect(r.value.inputs).toEqual({})
      expect(r.value.name).toBeNull()
    }
  })

  it('isim kırpılır, boş isim null olur; facts doğrulanır', () => {
    const r = validateCreateArgs({
      name: '  Maçka arsası ',
      parcels: [{ ...parcel, facts: [{ key: 'emsal', value: 1.5, source: 'kullanici' }] }],
      inputs: { arsaAlani: 850 },
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe('Maçka arsası')
      expect(r.value.parcels[0].facts).toEqual([{ key: 'emsal', value: 1.5, source: 'kullanici' }])
    }
    const blank = validateCreateArgs({ name: '   ', parcels: [parcel] })
    expect(blank.ok && blank.value.name).toBeNull()
  })

  it('parsel sayısı 1..5, geçersiz fact/girdi reddedilir', () => {
    expect(validateCreateArgs({ parcels: [] }).ok).toBe(false)
    expect(validateCreateArgs({ parcels: Array(6).fill(parcel) }).ok).toBe(false)
    expect(validateCreateArgs({ parcels: [{ ...parcel, facts: [{ key: 'x', value: 1, source: 'tkgm' }] }] }).ok).toBe(false)
    expect(validateCreateArgs({ parcels: [parcel], inputs: { arsaAlani: 1 } }).ok).toBe(false)
    expect(validateCreateArgs({ name: 'x'.repeat(81), parcels: [parcel] }).ok).toBe(false)
  })
})

describe('diffInputs / applyChanges', () => {
  it('yalnız değişen alanlar, INPUT_KEYS sırasıyla; yeni alan eski null', () => {
    const d = diffInputs({ arsaAlani: 850, arsaSahibiPayiYuzde: 40 }, { arsaSahibiPayiYuzde: 50, emsal: 1.5 })
    expect(d).toEqual([
      { field: 'emsal', oldValue: null, newValue: 1.5 },
      { field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50 },
    ])
  })

  it('aynı değeri tekrar söylemek fark üretmez (Review Focus 5)', () => {
    expect(diffInputs({ arsaAlani: 850 }, { arsaAlani: 850 })).toEqual([])
    expect(diffInputs({}, {})).toEqual([])
  })

  it('applyChanges eski nesneyi mutasyona uğratmadan uygular', () => {
    const old = { arsaAlani: 850 }
    const next = applyChanges(old, [{ field: 'arsaAlani', oldValue: 850, newValue: 900 }])
    expect(next).toEqual({ arsaAlani: 900 })
    expect(old).toEqual({ arsaAlani: 850 })
  })
})
