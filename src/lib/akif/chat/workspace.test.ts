import { deriveWorkspace, diffWorkspace, type WorkspaceState } from './workspace'
import type { AkifTurn, ParcelCard, ScenarioCard } from '@/lib/ai/akif/contract'
import type { DegerCardDTO, DegerCardValue } from '@/lib/deger/card'

function parcel(value: Partial<DegerCardValue>, status: ParcelCard['status'] = 'resolved'): ParcelCard {
  const dto = {
    parcel: {
      il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Yıldızlı', ada: '101', parsel: '5',
      areaSqm: 1250, geometry: { type: 'Polygon', coordinates: [] },
    },
    risk: { faultDistanceM: null, floodQ100: null, status: 'unavailable' },
    value: { tier: 'free', insufficientData: false, ...value },
    neighborhood: { geojson: null },
    comparables: { count: 0 },
    demographicsAvailable: false,
  } as unknown as DegerCardDTO
  return status === 'resolved' ? { kind: 'parcel', status, dto } : { kind: 'parcel', status }
}

function scenario(arsaPayiX: number, extra: Partial<ScenarioCard> = {}): ScenarioCard {
  return {
    kind: 'contractor_offers',
    rows: [{ label: 'x', arsaPayiX, arsaSahibiDaireSayisi: 3, arsaSahibiDegeriTL: 1, daireSatisFiyatiTL: 1 }],
    defaultsUsed: [], assumptions: [], emsalNote: '', ...extra,
  }
}

function turn(extra: Partial<AkifTurn> = {}): AkifTurn {
  return {
    intent: 'smalltalk', speech: 'x', state: 'NEUTRAL', facts_used: [], assumptions: [],
    missing_fields: [], risk_level: 'low', ...extra,
  }
}

describe('deriveWorkspace', () => {
  it('boş girdi -> hepsi null', () => {
    const w = deriveWorkspace([])
    expect(w).toEqual({
      konum: null, alanM2: null, m2Fiyat: null, emsalNotu: null,
      arsaSahibiPct: null, muteahhitPct: null, varsayimlar: [], dolu: false,
    })
  })

  it('çözülmüş parsel kartı', () => {
    const w = deriveWorkspace([{ card: parcel({ pricePerSqm: { mahalle: 2450, ilce: 1000 } }) }])
    expect(w.konum).toBe('Yıldızlı, Akçaabat/Trabzon')
    expect(w.alanM2).toBe(1250)
    expect(w.m2Fiyat).toBe(2450)
    expect(w.dolu).toBe(true)
  })

  it('mahalle yoksa ilce, sonra pricePerSqmCoarse', () => {
    expect(deriveWorkspace([{ card: parcel({ pricePerSqm: { ilce: 900 } }) }]).m2Fiyat).toBe(900)
    expect(deriveWorkspace([{ card: parcel({ pricePerSqmCoarse: 700 }) }]).m2Fiyat).toBe(700)
  })

  it('fiyat yoksa null, çökmez', () => {
    const w = deriveWorkspace([{ card: parcel({}) }])
    expect(w.m2Fiyat).toBeNull()
    expect(w.alanM2).toBe(1250)
  })

  it('resolved olmayan kart yok sayılır', () => {
    const w = deriveWorkspace([{ card: parcel({}, 'ambiguous') }])
    expect(w.dolu).toBe(false)
    expect(w.konum).toBeNull()
  })

  it('son parsel kartı kazanır', () => {
    const second = parcel({ pricePerSqm: { mahalle: 10 } })
    second.dto!.parcel.mahalle = 'Dağbaşı'
    const w = deriveWorkspace([{ card: parcel({ pricePerSqm: { mahalle: 5 } }) }, { card: second }])
    expect(w.konum).toBe('Dağbaşı, Akçaabat/Trabzon')
    expect(w.m2Fiyat).toBe(10)
  })

  it('iki senaryo kartı -> sonuncunun payı', () => {
    const w = deriveWorkspace([
      { card: scenario(0.46) },
      { card: scenario(0.5, { emsalNote: 'emsal 1.5', defaultsUsed: ['a', 'b'], assumptions: ['b', 'c'] }) },
    ])
    expect(w.arsaSahibiPct).toBe(50)
    expect(w.muteahhitPct).toBe(50)
    expect(w.emsalNotu).toBe('emsal 1.5')
    expect(w.varsayimlar).toEqual(['a', 'b', 'c'])
  })

  it('apartment_sizes kartı payı belirlemez', () => {
    const w = deriveWorkspace([{ card: { ...scenario(0.5), kind: 'apartment_sizes' } }])
    expect(w.arsaSahibiPct).toBeNull()
  })

  it('turn.tool_result ve turn.assumptions kabul edilir', () => {
    const w = deriveWorkspace([{ turn: turn({ tool_result: scenario(0.46), assumptions: ['t'] }) }])
    expect(w.arsaSahibiPct).toBe(46)
    expect(w.muteahhitPct).toBe(54)
    expect(w.varsayimlar).toEqual(['t'])
    expect(w.dolu).toBe(true)
  })

  it('boş satırlı senaryo çökmez', () => {
    const w = deriveWorkspace([{ card: scenario(0.5, { rows: [] }) }, { turn: null, card: null }])
    expect(w.arsaSahibiPct).toBeNull()
  })
})

describe('diffWorkspace', () => {
  const base: WorkspaceState = {
    konum: null, alanM2: null, m2Fiyat: null, emsalNotu: null,
    arsaSahibiPct: null, muteahhitPct: null, varsayimlar: [], dolu: false,
  }
  it('pay 46 -> 50', () => {
    expect(diffWorkspace({ ...base, arsaSahibiPct: 46, muteahhitPct: 54 }, { ...base, arsaSahibiPct: 50, muteahhitPct: 50 }))
      .toEqual({ arsaSahibiPct: { from: 46, to: 50 }, muteahhitPct: { from: 54, to: 50 } })
  })
  it('ilk doluş değişim değil', () => {
    expect(diffWorkspace(base, { ...base, arsaSahibiPct: 46, muteahhitPct: 54 })).toEqual({})
  })
  it('değişmeyen alan raporlanmaz', () => {
    const s = { ...base, alanM2: 100 }
    expect(diffWorkspace(s, { ...s })).toEqual({})
  })
})
