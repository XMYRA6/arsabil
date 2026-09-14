// Akif-2-Aksiyon — sesle mutasyon tool tanımları + argüman doğrulaması.
// dispatchTool/ToolName'e DOKUNMAZ (Akif-1 hesaplayıcı yolu ayrı kalır).
// Yalnız ses tool yolunda expose edilir.
import type { OpenAiToolDef, ValidateResult } from './toolRegistry'
import { validateRange } from '../numberSafety'

export type ActionToolName = 'prepareScenarioSave' | 'commitPendingAction'

const KALITE = ['standart', 'orta', 'luks'] as const

export const ACTION_TOOL_DEFS: OpenAiToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'prepareScenarioSave',
      description:
        'Az önce karşılaştırılan senaryolardan kullanıcının seçtiği TEK oranı bir projeye kaydetmeye HAZIRLA. Yazmaz — ekranda onay kartı gösterir. Kullanıcı "kaydet" dediğinde çağır.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['arsaAlani', 'emsal', 'muteahhitPayi'],
        properties: {
          arsaAlani: { type: 'number' },
          emsal: { type: 'number' },
          muteahhitPayi: { type: 'number' },
          daireBuyuklugu: { type: 'number' },
          birimMaliyet: { type: 'number' },
          kaliteSinifi: { type: 'string', enum: [...KALITE] },
          projectName: { type: 'string' },
          scenarioName: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'commitPendingAction',
      description:
        'Ekrandaki onay kartını kullanıcı SÖZLÜ olarak ("evet", "kaydet", "tamam") onayladığında çağır. Kullanıcı onaylamadıysa ASLA çağırma.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['pendingActionId'],
        properties: { pendingActionId: { type: 'string' } },
      },
    },
  },
]

function fail(field: string, reason: string): ValidateResult {
  return { ok: false, field, reason }
}
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function validateActionArgs(name: ActionToolName, args: unknown): ValidateResult {
  const o: Record<string, unknown> =
    args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {}

  if (name === 'commitPendingAction') {
    if (typeof o.pendingActionId !== 'string' || !o.pendingActionId) {
      return fail('pendingActionId', 'eksik')
    }
    return { ok: true }
  }

  // prepareScenarioSave
  if (!isNum(o.arsaAlani) || !validateRange('area', o.arsaAlani)) return fail('arsaAlani', 'geçersiz aralık')
  if (!isNum(o.emsal) || !validateRange('emsal', o.emsal)) return fail('emsal', 'geçersiz aralık')
  if (!isNum(o.muteahhitPayi) || !validateRange('percent', o.muteahhitPayi)) return fail('muteahhitPayi', 'geçersiz aralık')
  if (o.daireBuyuklugu !== undefined) {
    if (!isNum(o.daireBuyuklugu) || !validateRange('daire', o.daireBuyuklugu)) return fail('daireBuyuklugu', 'geçersiz aralık')
  }
  if (o.birimMaliyet !== undefined) {
    if (!isNum(o.birimMaliyet) || !validateRange('birimMaliyet', o.birimMaliyet)) return fail('birimMaliyet', 'geçersiz birim maliyet')
  }
  if (o.kaliteSinifi !== undefined) {
    if (typeof o.kaliteSinifi !== 'string' || !KALITE.includes(o.kaliteSinifi as (typeof KALITE)[number])) {
      return fail('kaliteSinifi', 'geçersiz kalite sınıfı')
    }
  }
  for (const f of ['projectName', 'scenarioName'] as const) {
    if (o[f] !== undefined) {
      if (typeof o[f] !== 'string') return fail(f, 'metin olmalı')
      if ((o[f] as string).length > 120) return fail(f, 'çok uzun')
    }
  }
  return { ok: true }
}
