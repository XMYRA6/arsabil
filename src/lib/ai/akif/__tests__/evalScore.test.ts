import { scoreFixture } from '../__evals__/score'
import { FIXTURES } from '../__evals__/fixtures'
import type { AkifTurn } from '../contract'

const base: AkifTurn = {
  intent: 'smalltalk',
  speech: 'Selam.',
  state: 'FRIENDLY',
  facts_used: [],
  assumptions: [],
  missing_fields: [],
  risk_level: 'low',
}

describe('scoreFixture', () => {
  it('intent eşleşmesi', () => {
    expect(scoreFixture(base, { intent: 'smalltalk' }).pass).toBe(true)
    expect(scoreFixture(base, { intent: 'out_of_scope' }).pass).toBe(false)
  })

  it('toolKind none vs term', () => {
    expect(scoreFixture(base, { toolKind: 'none' }).pass).toBe(true)
    const withTerm: AkifTurn = {
      ...base,
      tool_result: { kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' },
    }
    expect(scoreFixture(withTerm, { toolKind: 'term' }).pass).toBe(true)
    expect(scoreFixture(withTerm, { toolKind: 'none' }).pass).toBe(false)
  })

  it('missingFieldsInclude alt-dize, TR küçük harf', () => {
    const t: AkifTurn = { ...base, intent: 'collect_info', missing_fields: ['Müteahhit payı'] }
    expect(scoreFixture(t, { missingFieldsInclude: ['pay'] }).pass).toBe(true)
    expect(scoreFixture(t, { missingFieldsInclude: ['emsal'] }).pass).toBe(false)
  })

  it('needsConfirmation', () => {
    const t: AkifTurn = {
      ...base,
      intent: 'clarify_number',
      needs_confirmation: { field: 'emsal', heard: '15', question: '?' },
    }
    expect(scoreFixture(t, { needsConfirmation: true }).pass).toBe(true)
    expect(scoreFixture(base, { needsConfirmation: true }).pass).toBe(false)
  })

  it('maxSpeechChars varsayılan 600', () => {
    const long: AkifTurn = { ...base, speech: 'x'.repeat(601) }
    expect(scoreFixture(long, {}).pass).toBe(false)
    expect(scoreFixture(long, { maxSpeechChars: 700 }).pass).toBe(true)
  })

  it('arsaPayiX toleranslı', () => {
    const t: AkifTurn = {
      ...base,
      intent: 'compare_contractor',
      tool_result: {
        kind: 'contractor_offers',
        rows: [
          { label: 'a', arsaPayiX: 0.501, arsaSahibiDaireSayisi: 1, arsaSahibiDegeriTL: 1, daireSatisFiyatiTL: 1 },
        ],
        defaultsUsed: [],
        assumptions: [],
        emsalNote: '',
      },
    }
    expect(scoreFixture(t, { arsaPayiX: [0.5] }).pass).toBe(true)
    expect(scoreFixture(t, { arsaPayiX: [0.4] }).pass).toBe(false)
  })

  it('checks listesi her kontrol için bir kayıt döner', () => {
    const r = scoreFixture(base, { intent: 'smalltalk', toolKind: 'none' })
    expect(r.checks.map((c) => c.name)).toEqual(
      expect.arrayContaining(['intent', 'toolKind', 'maxSpeechChars']),
    )
    expect(r.checks.every((c) => typeof c.ok === 'boolean')).toBe(true)
  })
})

describe('FIXTURES bütünlük', () => {
  it('≥25 fixture, benzersiz id, gerekli alanlar', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(25)
    const ids = FIXTURES.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of FIXTURES) {
      expect(typeof f.userMessage).toBe('string')
      expect(f.userMessage.length).toBeGreaterThan(0)
      expect(Array.isArray(f.history)).toBe(true)
      expect(typeof f.expect).toBe('object')
    }
  })

  it('kategori kapsamı', () => {
    const cats = new Set(FIXTURES.map((f) => f.category))
    for (const c of ['niyet', 'sayı', 'araç seçimi', 'eksik bilgi', 'kapsam dışı', 'düzeltme']) {
      expect(cats).toContain(c)
    }
  })
})
