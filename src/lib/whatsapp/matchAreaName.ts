import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import type { AreaOption } from './types'

const SUFFIX = /\s+(MAH\.?|MAHALLESI|MAHALLESİ|KOYU|KÖYÜ|BELDESI)$/

function fold(s: string): string {
  return normalizeAreaName(s).replace(SUFFIX, '').replace(/\s+/g, ' ').trim()
}

export function matchAreaName(input: string, options: AreaOption[]): AreaOption[] {
  const q = fold(input)
  if (!q) return []
  const exact: AreaOption[] = []
  const prefix: AreaOption[] = []
  for (const o of options) {
    const t = fold(o.text)
    if (t === q) exact.push(o)
    else if (t.startsWith(q) || q.startsWith(t)) prefix.push(o)
  }
  if (exact.length) return exact
  return prefix
}
