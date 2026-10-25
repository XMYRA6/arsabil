// Akif rich gateway — toolRegistry'ye dokunmadan compareParcels ekler ve
// senaryo kartlarına öneri iliştirir.

import { validateArgs, dispatchTool, type DispatchDeps, type ToolName, type OpenAiToolDef, type ValidateResult } from './toolRegistry'
import { compareParcels, type CompareParcelsArgs } from './compareParcels'
import { recommendScenario } from './recommend'
import type { LookupParcelDeps } from './lookupParcel'
import type { ToolResultCard } from '../contract'

export type RichToolName = ToolName | 'compareParcels'

const PARCEL_FIELDS = ['ilText', 'ilceText', 'mahalleText', 'ada', 'parsel'] as const

export const RICH_EXTRA_TOOL_DEFS: OpenAiToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'compareParcels',
      description:
        '2-4 arsayı (ada/parsel) yan yana kıyaslar. Her parsel için il, ilçe, mahalle, ada ve parsel alanlarının tümünü topladıktan sonra çağır.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['parcels'],
        properties: {
          parcels: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              additionalProperties: false,
              required: [...PARCEL_FIELDS],
              properties: Object.fromEntries(PARCEL_FIELDS.map((f) => [f, { type: 'string' }])),
            },
          },
        },
      },
    },
  },
]

export function isRichToolName(n: string): n is RichToolName {
  return (
    n === 'compareParcels' ||
    n === 'explainTerm' ||
    n === 'compareContractorOffers' ||
    n === 'compareApartmentSizes'
  )
}

const bad = (field: string, reason: string): ValidateResult => ({ ok: false, field, reason })
const norm = (s: string) => s.trim().toLowerCase()

export function validateRichArgs(name: RichToolName, args: unknown): ValidateResult {
  if (name !== 'compareParcels') return validateArgs(name, args)
  const obj = args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {}
  const parcels = obj.parcels
  if (!Array.isArray(parcels)) return bad('parcels', 'eksik')
  if (parcels.length < 2 || parcels.length > 4) return bad('parcels', '2-4 parsel olmalı')
  const seen = new Set<string>()
  for (const item of parcels) {
    const p = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : null
    if (!p) return bad('parcels', 'geçersiz parsel')
    for (const f of PARCEL_FIELDS) {
      const v = p[f]
      if (typeof v !== 'string' || v.trim() === '') return bad(f, 'boş olmayan metin olmalı')
    }
    for (const f of ['ada', 'parsel'] as const) {
      if (!/^\d{1,7}$/.test(p[f] as string)) return bad(f, 'sayısal olmalı')
    }
    const key = `${norm(p.mahalleText as string)}|${norm(p.ada as string)}|${norm(p.parsel as string)}`
    if (seen.has(key)) return bad('parcels', 'aynı parsel tekrar edilmiş')
    seen.add(key)
  }
  return { ok: true }
}

export async function dispatchRichTool(
  name: RichToolName,
  args: unknown,
  deps: { db: DispatchDeps['db']; parcelDeps: LookupParcelDeps; memberView: boolean },
): Promise<ToolResultCard> {
  if (name === 'compareParcels') {
    return compareParcels(args as CompareParcelsArgs, deps.parcelDeps, { memberView: deps.memberView })
  }
  const card = await dispatchTool(name, args, { db: deps.db })
  if (card.kind === 'contractor_offers' || card.kind === 'apartment_sizes') {
    const recommendation = recommendScenario(card)
    return recommendation ? { ...card, recommendation } : card
  }
  return card
}
