import { summarizeDemographics } from './summarize'
import type { DistrictDemographicsRecord } from './types'

const base: DistrictDemographicsRecord = {
  dataYear: 2024,
  population: 300_000,
  populationGrowthPerMille: 0,
  medianAge: 35,
  avgHouseholdSize: 3.2,
}

describe('summarizeDemographics', () => {
  it('artış ≥ +10‰ → nüfus belirgin büyüyor', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 14 })
    expect(r.sentence).toBe('Bu ilçede nüfus belirgin şekilde büyüyor — konut talebi güçlü.')
  })

  it('artış ≤ −10‰ → nüfus hızla azalıyor', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: -12 })
    expect(r.sentence).toBe('Nüfus hızla azalıyor — konut talebi zayıf olabilir.')
  })

  it('−10‰ < artış < +10‰ → durağan', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 3 })
    expect(r.sentence).toBe('Nüfus görece durağan; belirgin bir demografik baskı yok.')
  })

  it('medyan yaş ≤ 32 → genç nüfus eki', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 3, medianAge: 29 })
    expect(r.sentence).toBe('Nüfus görece durağan; belirgin bir demografik baskı yok. Genç nüfus yapısı.')
  })

  it('medyan yaş ≥ 40 → yaşlanan nüfus eki', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 14, medianAge: 43 })
    expect(r.sentence).toBe('Bu ilçede nüfus belirgin şekilde büyüyor — konut talebi güçlü. Yaşlanan nüfus.')
  })

  it('medyan yaş null → yaş eki yok', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 3, medianAge: null })
    expect(r.sentence).toBe('Nüfus görece durağan; belirgin bir demografik baskı yok.')
  })

  it('artış null → sentence null', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: null })
    expect(r.sentence).toBeNull()
  })
})
