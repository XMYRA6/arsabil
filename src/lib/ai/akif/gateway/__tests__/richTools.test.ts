import { validateRichArgs, dispatchRichTool, isRichToolName, RICH_EXTRA_TOOL_DEFS } from '../richTools'
import { AKIF_TOOL_DEFS } from '../toolRegistry'
import type { LookupParcelDeps } from '../lookupParcel'

const p = (m: string, ada = '1', parsel = '2') => ({ ilText: 'T', ilceText: 'O', mahalleText: m, ada, parsel })

describe('validateRichArgs', () => {
  it('validateRichArgs rejects 1 and 5 parcels', () => {
    expect(validateRichArgs('compareParcels', { parcels: [p('A')] }).ok).toBe(false)
    expect(validateRichArgs('compareParcels', { parcels: ['A', 'B', 'C', 'D', 'E'].map((m) => p(m)) }).ok).toBe(false)
    expect(validateRichArgs('compareParcels', { parcels: [p('A'), p('B')] }).ok).toBe(true)
  })
  it('rejects duplicate parcel', () => {
    expect(validateRichArgs('compareParcels', { parcels: [p('Uğurlu'), p(' uğurlu ')] }).ok).toBe(false)
  })
  it('rejects non-numeric ada', () => {
    expect(validateRichArgs('compareParcels', { parcels: [p('A', 'x1'), p('B')] }).ok).toBe(false)
  })
  it('delegates other tools to validateArgs', () => {
    expect(validateRichArgs('explainTerm', { term: 'nope' }).ok).toBe(false)
  })
})

describe('dispatchRichTool', () => {
  const db = {
    globalSettings: { findUnique: async () => null },
    profitLevel: { findFirst: async () => null },
  } as never
  const parcelDeps = {} as LookupParcelDeps
  it('dispatchRichTool adds recommendation to contractor_offers', async () => {
    const card = await dispatchRichTool(
      'compareContractorOffers',
      { arsaAlani: 500, emsal: 1.5, muteahhitPaylari: [40, 50] },
      { db, parcelDeps, memberView: true },
    )
    expect(card.kind).toBe('contractor_offers')
    expect('recommendation' in card).toBe(true)
  })
  it('dispatchRichTool leaves explainTerm card unchanged', async () => {
    const card = await dispatchRichTool('explainTerm', { term: 'emsal' }, { db, parcelDeps, memberView: true })
    expect(card.kind).toBe('term')
    expect('recommendation' in card).toBe(false)
  })
})

describe('tool defs', () => {
  it('RICH_EXTRA_TOOL_DEFS does not include existing tools and AKIF_TOOL_DEFS is unchanged', () => {
    expect(RICH_EXTRA_TOOL_DEFS.map((t) => t.function.name)).toEqual(['compareParcels'])
    expect(AKIF_TOOL_DEFS.map((t) => t.function.name)).toEqual(['explainTerm', 'compareContractorOffers', 'compareApartmentSizes'])
    expect(isRichToolName('compareParcels')).toBe(true)
    expect(isRichToolName('explainTerm')).toBe(true)
    expect(isRichToolName('foo')).toBe(false)
  })
})
