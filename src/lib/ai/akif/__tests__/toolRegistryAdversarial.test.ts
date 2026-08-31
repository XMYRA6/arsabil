import { validateArgs } from '../gateway/toolRegistry'

/**
 * LLM hallüsinasyon sınırı — gpt-4o-mini geçersiz bir tool argümanı üretirse
 * `validateArgs` bunu motora ULAŞMADAN reddetmeli. Final review C1/C2/I7.
 */

const baseContractor = {
  arsaAlani: 900,
  emsal: 1.5,
  muteahhitPaylari: [45, 50, 55],
}

describe('validateArgs — adversarial compareContractorOffers', () => {
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ['müteahhit %0 (x=1 → sıfıra bölme)', { ...baseContractor, muteahhitPaylari: [0, 50] }, 'muteahhitPaylari'],
    ['müteahhit %100', { ...baseContractor, muteahhitPaylari: [50, 100] }, 'muteahhitPaylari'],
    ['kaliteSinifi premium', { ...baseContractor, kaliteSinifi: 'premium' }, 'kaliteSinifi'],
    ['kaliteSinifi lüks (Türkçe varyant)', { ...baseContractor, kaliteSinifi: 'lüks' }, 'kaliteSinifi'],
    ['birimMaliyet negatif', { ...baseContractor, birimMaliyet: -5 }, 'birimMaliyet'],
    ['birimMaliyet 9 milyar', { ...baseContractor, birimMaliyet: 9_000_000_000 }, 'birimMaliyet'],
    ['emsal 0.05 (aralık altı)', { ...baseContractor, emsal: 0.05 }, 'emsal'],
    ['emsal 15 (aralık üstü)', { ...baseContractor, emsal: 15 }, 'emsal'],
    ['arsaAlani 1 milyar', { ...baseContractor, arsaAlani: 1_000_000_000 }, 'arsaAlani'],
    ['arsaAlani 50 (aralık altı)', { ...baseContractor, arsaAlani: 50 }, 'arsaAlani'],
  ]

  it.each(cases)('%s → reddedilir (field: %s)', (_label, args, field) => {
    const r = validateArgs('compareContractorOffers', args)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe(field)
  })

  it('geçerli argümanlar → kabul', () => {
    expect(validateArgs('compareContractorOffers', baseContractor)).toEqual({ ok: true })
    expect(
      validateArgs('compareContractorOffers', {
        ...baseContractor,
        birimMaliyet: 15000,
        kaliteSinifi: 'luks',
      }),
    ).toEqual({ ok: true })
  })
})

describe('validateArgs — adversarial compareApartmentSizes', () => {
  const base = { arsaAlani: 900, emsal: 1.5, muteahhitPayi: 50, daireBuyuklukleri: [80, 100, 120] }

  it('daireBuyuklukleri çok küçük → reddedilir', () => {
    const r = validateArgs('compareApartmentSizes', { ...base, daireBuyuklukleri: [10, 20] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('daireBuyuklukleri')
  })

  it('muteahhitPayi 0 → reddedilir', () => {
    const r = validateArgs('compareApartmentSizes', { ...base, muteahhitPayi: 0 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('muteahhitPayi')
  })

  it('kaliteSinifi geçersiz → reddedilir', () => {
    const r = validateArgs('compareApartmentSizes', { ...base, kaliteSinifi: 'ekonomik' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('kaliteSinifi')
  })

  it('geçerli → kabul', () => {
    expect(validateArgs('compareApartmentSizes', base)).toEqual({ ok: true })
  })
})
