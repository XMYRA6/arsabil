export interface StatLike {
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
}

export interface ValuationInput {
  areaSqm: number | null
  mahalle?: StatLike | null
  ilce?: StatLike | null
  il?: StatLike | null
}

export type Confidence = 'yuksek' | 'orta' | 'dusuk'
export type ValuationBasis = 'mahalle' | 'ilce' | 'il'

export interface ValuationResult {
  insufficientData: boolean
  basis?: ValuationBasis
  confidence?: Confidence
  thinData?: boolean
  estimate?: number
  freeRangeLow?: number
  freeRangeHigh?: number
  memberRangeLow?: number
  memberRangeHigh?: number
  pricePerSqmCoarse?: number
  pricePerSqm?: { mahalle?: number; ilce?: number }
  sampleCount?: { mahalle?: number; ilce?: number }
}

const valid = (s?: StatLike | null): s is StatLike =>
  !!s && Number.isFinite(s.medianPricePerSqm) && s.medianPricePerSqm > 0

const round = (n: number) => Math.round(n)
const round100 = (n: number) => Math.round(n / 100) * 100

export function valuateParcel(input: ValuationInput): ValuationResult {
  const area = input.areaSqm
  if (area == null || !Number.isFinite(area) || area <= 0) {
    return { insufficientData: true }
  }

  const mahalle = valid(input.mahalle) ? input.mahalle : null
  const ilce = valid(input.ilce) ? input.ilce : null
  const il = valid(input.il) ? input.il : null

  let basis: ValuationBasis
  let basisStat: StatLike
  let confidence: Confidence

  if (mahalle && mahalle.sampleCount >= 8) {
    basis = 'mahalle'
    basisStat = mahalle
    confidence = 'yuksek'
  } else if (ilce && ilce.sampleCount >= 5) {
    basis = 'ilce'
    basisStat = ilce
    confidence = 'orta'
  } else if (il) {
    basis = 'il'
    basisStat = il
    confidence = 'dusuk'
  } else {
    return { insufficientData: true }
  }

  const pricePerSqm: { mahalle?: number; ilce?: number } = {}
  const sampleCount: { mahalle?: number; ilce?: number } = {}
  if (mahalle) {
    pricePerSqm.mahalle = round(mahalle.medianPricePerSqm)
    sampleCount.mahalle = mahalle.sampleCount
  }
  if (ilce) {
    pricePerSqm.ilce = round(ilce.medianPricePerSqm)
    sampleCount.ilce = ilce.sampleCount
  }

  return {
    insufficientData: false,
    basis,
    confidence,
    thinData: basis === 'il' || basisStat.sampleCount < 10,
    estimate: round(basisStat.medianPricePerSqm * area),
    freeRangeLow: round(basisStat.medianPricePerSqm * 0.75 * area),
    freeRangeHigh: round(basisStat.medianPricePerSqm * 1.25 * area),
    memberRangeLow: round(basisStat.p25 * area),
    memberRangeHigh: round(basisStat.p75 * area),
    pricePerSqmCoarse: round100(basisStat.medianPricePerSqm),
    pricePerSqm,
    sampleCount,
  }
}
