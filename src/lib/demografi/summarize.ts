import type { DistrictDemographicsRecord, DemographicsSummary } from './types'

export function summarizeDemographics(rec: DistrictDemographicsRecord): DemographicsSummary {
  const g = rec.populationGrowthPerMille
  if (g == null) return { sentence: null }

  let sentence: string
  if (g >= 10) {
    sentence = 'Bu ilçede nüfus belirgin şekilde büyüyor — konut talebi güçlü.'
  } else if (g <= -10) {
    sentence = 'Nüfus hızla azalıyor — konut talebi zayıf olabilir.'
  } else {
    sentence = 'Nüfus görece durağan; belirgin bir demografik baskı yok.'
  }

  const age = rec.medianAge
  if (age != null && age <= 32) sentence += ' Genç nüfus yapısı.'
  else if (age != null && age >= 40) sentence += ' Yaşlanan nüfus.'

  return { sentence }
}
