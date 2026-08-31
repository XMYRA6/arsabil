export interface SubLike {
  id: string
  phone: string
  il: string
  ilce: string
  mahalle: string
  lastDigestMonth: string | null
  lastAlertAt: Date | null
  lastAlertDirection: string | null
}

export interface TrendBucket {
  scope: 'il' | 'ilce' | 'mahalle'
  monthBucket: Date
  medianPricePerSqm: number
  sampleCount: number
}
