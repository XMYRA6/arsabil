// Akif-1 eval — saf skorlama. `runEval` (gerçek API döngüsü) bunu kullanır;
// jest'te `evalScore.test.ts` doğrular. I/O YOK.

import type { AkifIntent, AkifMessage, AkifTurn } from '../contract'

export type ExpectedToolKind = 'term' | 'contractor_offers' | 'apartment_sizes' | 'parcel' | 'parcel_compare' | 'project' | 'none'

export interface EvalExpect {
  intent?: AkifIntent
  toolKind?: ExpectedToolKind
  /** her biri turn.missing_fields'te bir öğenin alt-dizesi olmalı (TR küçük harf) */
  missingFieldsInclude?: string[]
  needsConfirmation?: boolean
  /** varsayılan 600 — vizyon §53 "kısa konuşma" */
  maxSpeechChars?: number
  /** tool_result.rows[i].arsaPayiX beklenen değerleri, tolerans 0.005 */
  arsaPayiX?: number[]
}

export interface EvalFixture {
  id: string
  category: string
  history: AkifMessage[]
  userMessage: string
  expect: EvalExpect
}

export interface CheckResult {
  name: string
  ok: boolean
  detail?: string
}

const lc = (s: string) => s.toLocaleLowerCase('tr')

function toolKindOf(turn: AkifTurn): ExpectedToolKind {
  return turn.tool_result ? turn.tool_result.kind : 'none'
}

export function scoreFixture(
  turn: AkifTurn,
  expected: EvalExpect,
): { pass: boolean; checks: CheckResult[] } {
  const checks: CheckResult[] = []

  if (expected.intent !== undefined) {
    checks.push({
      name: 'intent',
      ok: turn.intent === expected.intent,
      detail: `beklenen ${expected.intent}, gelen ${turn.intent}`,
    })
  }

  if (expected.toolKind !== undefined) {
    const got = toolKindOf(turn)
    checks.push({
      name: 'toolKind',
      ok: got === expected.toolKind,
      detail: `beklenen ${expected.toolKind}, gelen ${got}`,
    })
  }

  if (expected.missingFieldsInclude !== undefined) {
    const have = turn.missing_fields.map(lc)
    const missing = expected.missingFieldsInclude.filter(
      (want) => !have.some((h) => h.includes(lc(want))),
    )
    checks.push({
      name: 'missingFields',
      ok: missing.length === 0,
      detail: missing.length ? `eksik: ${missing.join(', ')}` : undefined,
    })
  }

  if (expected.needsConfirmation !== undefined) {
    checks.push({
      name: 'needsConfirmation',
      ok: (turn.needs_confirmation != null) === expected.needsConfirmation,
    })
  }

  const speechLimit = expected.maxSpeechChars ?? 600
  checks.push({
    name: 'maxSpeechChars',
    ok: turn.speech.length <= speechLimit,
    detail: `${turn.speech.length}/${speechLimit}`,
  })

  if (expected.arsaPayiX !== undefined) {
    const tr = turn.tool_result
    if (!tr || tr.kind === 'term' || tr.kind === 'parcel' || tr.kind === 'project' || tr.kind === 'parcel_compare') {
      checks.push({ name: 'arsaPayiX', ok: false, detail: 'senaryo kartı yok' })
    } else if (tr.rows.length !== expected.arsaPayiX.length) {
      checks.push({
        name: 'arsaPayiX',
        ok: false,
        detail: `satır sayısı ${tr.rows.length} ≠ ${expected.arsaPayiX.length}`,
      })
    } else {
      const bad = tr.rows
        .map((r, i) => Math.abs(r.arsaPayiX - expected.arsaPayiX![i]))
        .filter((d) => d > 0.005)
      checks.push({
        name: 'arsaPayiX',
        ok: bad.length === 0,
        detail: bad.length ? `${bad.length} satır toleransı aştı` : undefined,
      })
    }
  }

  return { pass: checks.every((c) => c.ok), checks }
}
