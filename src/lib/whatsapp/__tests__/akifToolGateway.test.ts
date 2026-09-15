jest.mock('@/lib/whatsapp/resolveLocation', () => ({
  resolveLocation: jest.fn().mockResolvedValue({ kind: 'notfound', level: 'il', term: 'x' }),
}))

import { WA_AKIF_TOOL_DEFS, validateArgsWa, dispatchToolWa } from '../akifToolGateway'
import { AKIF_TOOL_DEFS } from '@/lib/ai/akif/gateway/toolRegistry'

describe('WA_AKIF_TOOL_DEFS', () => {
  it('3 mevcut aracı + lookupParcel içerir', () => {
    expect(WA_AKIF_TOOL_DEFS.length).toBe(AKIF_TOOL_DEFS.length + 1)
    expect(WA_AKIF_TOOL_DEFS.map((d) => d.function.name)).toEqual(
      expect.arrayContaining([...AKIF_TOOL_DEFS.map((d) => d.function.name), 'lookupParcel']),
    )
  })

  it('paylaşılan AKIF_TOOL_DEFS mutasyona uğramaz', () => {
    expect(AKIF_TOOL_DEFS.some((d) => d.function.name === 'lookupParcel')).toBe(false)
  })
})

describe('validateArgsWa', () => {
  it('lookupParcel: 5 alanın hepsi dolu string ise ok', () => {
    expect(
      validateArgsWa('lookupParcel', { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Uğurlu', ada: '1', parsel: '2' }),
    ).toEqual({ ok: true })
  })

  it('lookupParcel: bir alan eksikse fail', () => {
    const r = validateArgsWa('lookupParcel', { ilText: 'Trabzon', ilceText: '', mahalleText: 'Uğurlu', ada: '1', parsel: '2' })
    expect(r.ok).toBe(false)
  })

  it('mevcut araç adları paylaşılan validateArgs\'a delege eder', () => {
    expect(validateArgsWa('explainTerm', { term: 'emsal' })).toEqual({ ok: true })
    expect(validateArgsWa('explainTerm', { term: 'bilinmeyen' }).ok).toBe(false)
  })
})

describe('dispatchToolWa', () => {
  it('lookupParcel: lookupParcelDeps ile lookupParcel çağırır', async () => {
    const lookupParcelDeps = {
      resolveDeps: {} as never,
      buildCard: jest.fn().mockResolvedValue({ ok: false, reason: 'parcel_not_found' }),
      siteUrlFor: () => 'x',
    }
    const card = await dispatchToolWa(
      'lookupParcel',
      { ilText: 'x', ilceText: 'x', mahalleText: 'x', ada: '1', parsel: '2' },
      { db: {} as never, lookupParcelDeps },
    )
    expect(card.kind).toBe('parcel')
  })

  it('mevcut araç adları paylaşılan dispatchTool\'a delege eder', async () => {
    const card = await dispatchToolWa('explainTerm', { term: 'emsal' }, { db: {} as never, lookupParcelDeps: {} as never })
    expect(card.kind).toBe('term')
  })
})
