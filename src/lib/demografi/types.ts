export interface DistrictDemographicsRecord {
  dataYear: number
  population: number | null
  populationGrowthPerMille: number | null
  medianAge: number | null
  avgHouseholdSize: number | null
}

export interface DemographicsSummary {
  sentence: string | null
}
