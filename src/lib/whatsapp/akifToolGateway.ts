// Akif-5 — WhatsApp-özel tool gateway. Paylaşılan toolRegistry.ts'i
// DOKUNMADAN çevreler: 3 mevcut aracı olduğu gibi kullanır + lookupParcel'i
// ekler. Bu dizi/tip SADECE WhatsApp handler'ından import edilir — web/voice
// hâlâ paylaşılan AKIF_TOOL_DEFS/ToolName'i kullanır.

import {
  AKIF_TOOL_DEFS,
  validateArgs,
  dispatchTool,
  type ToolName,
  type OpenAiToolDef,
  type ValidateResult,
  type DispatchDeps,
} from '@/lib/ai/akif/gateway/toolRegistry'
import { lookupParcel, type LookupParcelArgs, type LookupParcelDeps } from '@/lib/ai/akif/gateway/lookupParcel'
import type { ToolResultCard } from '@/lib/ai/akif/contract'
import {
  PROJECT_TOOL_DEFS,
  isProjectToolName,
  validateProjectToolArgs,
  dispatchProjectTool,
  type ProjectToolName,
  type ProjectToolDeps,
} from './projectTools'

export type WaToolName = ToolName | 'lookupParcel' | ProjectToolName

const LOOKUP_PARCEL_DEF: OpenAiToolDef = {
  type: 'function',
  function: {
    name: 'lookupParcel',
    description:
      "Bir arsanın ada/parsel numarasıyla TKGM'den gerçek parsel verisini ve Değer Kartı'nı getirir. Kullanıcıdan il, ilçe, mahalle, ada ve parsel numarasının HEPSİNİ topladıktan sonra çağır.",
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['ilText', 'ilceText', 'mahalleText', 'ada', 'parsel'],
      properties: {
        ilText: { type: 'string' },
        ilceText: { type: 'string' },
        mahalleText: { type: 'string' },
        ada: { type: 'string' },
        parsel: { type: 'string' },
      },
    },
  },
}

export const WA_AKIF_TOOL_DEFS: OpenAiToolDef[] = [...AKIF_TOOL_DEFS, LOOKUP_PARCEL_DEF, ...PROJECT_TOOL_DEFS]

function isSharedToolName(name: WaToolName): name is ToolName {
  return name !== 'lookupParcel' && !isProjectToolName(name)
}

export function validateArgsWa(name: WaToolName, args: unknown): ValidateResult {
  if (isProjectToolName(name)) return validateProjectToolArgs(name, args)
  if (name === 'lookupParcel') {
    const obj: Record<string, unknown> =
      args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {}
    for (const field of ['ilText', 'ilceText', 'mahalleText', 'ada', 'parsel'] as const) {
      const v = obj[field]
      if (typeof v !== 'string' || v.trim() === '') {
        return { ok: false, field, reason: 'eksik' }
      }
    }
    return { ok: true }
  }
  return validateArgs(name, args)
}

export interface WaDispatchDeps extends DispatchDeps {
  lookupParcelDeps: LookupParcelDeps
  projectToolDeps: ProjectToolDeps
}

export async function dispatchToolWa(
  name: WaToolName,
  args: unknown,
  deps: WaDispatchDeps,
): Promise<ToolResultCard> {
  if (isProjectToolName(name)) {
    return dispatchProjectTool(name, args, deps.projectToolDeps)
  }
  if (name === 'lookupParcel') {
    return lookupParcel(args as LookupParcelArgs, deps.lookupParcelDeps)
  }
  if (isSharedToolName(name)) {
    return dispatchTool(name, args, deps)
  }
  throw new Error(`dispatchToolWa: bilinmeyen araç "${String(name)}"`)
}
