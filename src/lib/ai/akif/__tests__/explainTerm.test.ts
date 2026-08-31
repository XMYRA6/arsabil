import { explainTerm } from '../gateway/explainTerm'
import { GLOSSARY, type AkifTerm } from '../gateway/glossary'

const TERMS: AkifTerm[] = [
  'emsal',
  'taks',
  'kaks',
  'kat_karsiligi',
  'arsa_payi',
  'iksa',
  'risk_katsayisi',
]

describe('GLOSSARY', () => {
  it('7 terimin hepsini içerir', () => {
    expect(Object.keys(GLOSSARY).sort()).toEqual([...TERMS].sort())
  })

  it.each(TERMS)('%s: non-empty shortDef + example', (term) => {
    const entry = GLOSSARY[term]
    expect(typeof entry.shortDef).toBe('string')
    expect(entry.shortDef.trim().length).toBeGreaterThan(0)
    expect(typeof entry.example).toBe('string')
    expect(entry.example.trim().length).toBeGreaterThan(0)
  })
})

describe('explainTerm', () => {
  it.each(TERMS)('%s → kind:term kartı', (term) => {
    const card = explainTerm({ term })
    expect(card.kind).toBe('term')
    expect(card.term).toBe(term)
    expect(card.shortDef).toBe(GLOSSARY[term].shortDef)
    expect(card.example).toBe(GLOSSARY[term].example)
    expect(card.shortDef.length).toBeGreaterThan(0)
    expect(card.example.length).toBeGreaterThan(0)
  })

  it('bilinmeyen term → throw', () => {
    expect(() => explainTerm({ term: 'bilinmeyen' as AkifTerm })).toThrow()
  })
})
