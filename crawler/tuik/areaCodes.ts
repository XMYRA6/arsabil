import { AREA_CODES } from './areaCodesData'

export interface ResolvedArea {
  il: string
  ilce: string | null
}

export function resolveArea(refAreaCode: string): ResolvedArea | null {
  const code = refAreaCode.trim()
  if (!code) return null
  return AREA_CODES[code] ?? null
}
