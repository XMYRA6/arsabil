// Akif-5c — olgu bayatlık politikası. Kararı KOD verir, LLM vermez.

import type { FactKey, FactSource } from './types'

const DAY_MS = 86_400_000

/** null = süresiz. Değerler spec §3.1 (başlangıç ömürleri). */
export const FACT_TTL_DAYS: Record<FactKey, number | null> = {
  areaSqm: null,
  imarDurumu: 180,
  emsal: 180,
  katAdedi: 180,
  taks: 180,
  hmax: 180,
  malik: 365,
  daireFiyati: 45,
}

/** Bir proje hesaplanabilmesi için sorulması gereken olgular. */
export const REQUIRED_FOR_PROJECT: readonly FactKey[] = ['areaSqm', 'imarDurumu', 'emsal', 'katAdedi']

export interface FactRow {
  key: FactKey
  value: unknown
  source: FactSource
  recordedAt: Date
}

export interface Classified {
  taze: FactRow[]
  bayat: FactRow[]
  eksik: FactKey[]
}

export function classifyFacts(
  rows: FactRow[],
  now: Date,
  required: readonly FactKey[] = REQUIRED_FOR_PROJECT,
): Classified {
  const latest = new Map<FactKey, FactRow>()
  for (const r of rows) {
    const prev = latest.get(r.key)
    if (!prev || r.recordedAt.getTime() > prev.recordedAt.getTime()) latest.set(r.key, r)
  }

  const taze: FactRow[] = []
  const bayat: FactRow[] = []
  for (const r of latest.values()) {
    const ttl = FACT_TTL_DAYS[r.key]
    const stale = ttl !== null && now.getTime() - r.recordedAt.getTime() > ttl * DAY_MS
    ;(stale ? bayat : taze).push(r)
  }
  const eksik = required.filter((k) => !latest.has(k))
  return { taze, bayat, eksik }
}
