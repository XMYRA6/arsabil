import { parseAkifTurn, AKIF_TURN_JSON_SCHEMA } from '../contract'

const valid = {
  intent: 'explain_term', speech: 'Emsal, arsana ne kadar inşaat yapılabileceğini gösterir.',
  state: 'EXPLAINING', facts_used: [], assumptions: [], missing_fields: [], risk_level: 'low',
}

describe('parseAkifTurn', () => {
  it('geçerli tur → nesne', () => {
    expect(parseAkifTurn(valid)).toEqual(valid)
  })
  it('geçersiz intent → null', () => {
    expect(parseAkifTurn({ ...valid, intent: 'xyz' })).toBeNull()
  })
  it('speech boş → null', () => {
    expect(parseAkifTurn({ ...valid, speech: '' })).toBeNull()
  })
  it('facts_used dizi değil → null', () => {
    expect(parseAkifTurn({ ...valid, facts_used: 'x' })).toBeNull()
  })
  it('modelden gelen tool_result yok sayılır', () => {
    const r = parseAkifTurn({ ...valid, tool_result: { kind: 'term', term: 'x' } })
    expect(r).not.toBeNull()
    expect(r!.tool_result).toBeUndefined()
  })
  it('needs_confirmation geçerli şekil korunur', () => {
    const nc = { field: 'emsal', heard: '15', question: 'Emsal 1,50 mi?' }
    expect(parseAkifTurn({ ...valid, intent: 'clarify_number', needs_confirmation: nc })!.needs_confirmation).toEqual(nc)
  })
  it('null / non-object → null', () => {
    expect(parseAkifTurn(null)).toBeNull()
    expect(parseAkifTurn('x')).toBeNull()
  })
  it('memory_updates string ise korunur', () => {
    const r = parseAkifTurn({ ...valid, memory_updates: 'Bütçe üst sınırı 5M TL.' })
    expect(r!.memory_updates).toBe('Bütçe üst sınırı 5M TL.')
  })
  it('memory_updates null ise turn nesnesine hiç eklenmez', () => {
    const r = parseAkifTurn({ ...valid, memory_updates: null })
    expect(r!.memory_updates).toBeUndefined()
  })
  it('memory_updates alanı hiç yoksa turn nesnesine eklenmez', () => {
    const r = parseAkifTurn(valid)
    expect(r!.memory_updates).toBeUndefined()
  })
})

describe('AKIF_TURN_JSON_SCHEMA', () => {
  it('tool_result alanı içermez (model üretmesin)', () => {
    const props = (AKIF_TURN_JSON_SCHEMA as any).properties
    expect(props.tool_result).toBeUndefined()
    // strict:true → properties'teki her anahtar (needs_confirmation dahil) required.
    expect((AKIF_TURN_JSON_SCHEMA as any).required).toEqual(
      expect.arrayContaining([
        'intent',
        'speech',
        'state',
        'risk_level',
        'needs_confirmation',
      ]),
    )
    const req: string[] = (AKIF_TURN_JSON_SCHEMA as any).required
    expect([...req].sort()).toEqual(Object.keys(props).sort())
  })
  it('memory_updates alanı string|null olarak tanımlı ve required listesinde', () => {
    const props = (AKIF_TURN_JSON_SCHEMA as any).properties
    expect(props.memory_updates).toEqual({ type: ['string', 'null'] })
    const req: string[] = (AKIF_TURN_JSON_SCHEMA as any).required
    expect(req).toContain('memory_updates')
  })
})
