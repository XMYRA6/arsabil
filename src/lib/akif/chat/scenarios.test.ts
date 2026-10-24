import { mergeScenarios } from './scenarios'

describe('mergeScenarios', () => {
  it('iki kaynağı updatedAt azalan birleştirir ve source etiketler', () => {
    const site = [
      { id: 's1', name: 'Site A', updatedAt: '2026-10-01T10:00:00Z', scenarios: [{ landShareRatio: 0.4, arsaAlani: 500 }] },
    ]
    const kart = [
      { id: 'k1', name: 'Kart A', updatedAt: '2026-10-03T10:00:00Z', parcels: ['Trabzon/Akçaabat/X ada 1 parsel 2'], inputs: { arsaAlani: 800, arsaSahibiPayiYuzde: 45 } },
      { id: 'k2', name: 'Kart B', updatedAt: '2026-10-02T10:00:00Z', parcels: [], inputs: {} },
    ]
    const r = mergeScenarios({ site, kart })
    expect(r.map((x) => x.id)).toEqual(['k1', 'k2', 's1'])
    expect(r.map((x) => x.source)).toEqual(['kart', 'kart', 'site'])
    expect(r[0].summary).toBe('Trabzon/Akçaabat/X ada 1 parsel 2 · 800 m² · %45')
    expect(r[0].workspace.alanM2).toBe(800)
    expect(r[0].workspace.arsaSahibiPct).toBe(45)
    expect(r[0].workspace.muteahhitPct).toBe(55)
    expect(r[2].summary).toBe('500 m² · %40')
    expect(r[2].workspace.arsaSahibiPct).toBe(40)
    expect(r[2].workspace.muteahhitPct).toBe(60)
    expect(r[0].key).toBe('kart:k1')
  })

  it('boş inputs ve scenarios çökmez', () => {
    const r = mergeScenarios({
      site: [{ id: 's', name: 'S', updatedAt: '2026-10-01T00:00:00Z', scenarios: [] }],
      kart: [{ id: 'k', name: 'K', updatedAt: '2026-10-01T00:00:00Z', inputs: {} }, null, 5, { inputs: 'x' }],
    })
    expect(r).toHaveLength(2)
    for (const i of r) {
      expect(i.summary).toBe('')
      expect(i.workspace.alanM2).toBeNull()
      expect(i.workspace.konum).toBeNull()
    }
  })
})
