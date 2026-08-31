// Akif-1 (LLM danışman metin MVP) — paylaşılan sözleşme.
// Her sonraki modül (orchestrator, tool runner, API route, testler) buradan import eder.
// zod YOK: elle yazılmış doğrulama + elle yazılmış JSON şema (5a parseInbound stili).

export interface AkifMessage {
  role: 'user' | 'akif'
  content: string
}

export type AkifIntent =
  | 'explain_term'
  | 'compare_contractor'
  | 'compare_apartment_size'
  | 'collect_info'
  | 'clarify_number'
  | 'smalltalk'
  | 'out_of_scope'

export type AkifState =
  | 'NEUTRAL'
  | 'THINKING'
  | 'EXPLAINING'
  | 'CAUTION'
  | 'CONFIDENT'
  | 'SERIOUS'
  | 'FRIENDLY'
  | 'HUMOR'

export interface TermCard {
  kind: 'term'
  term: string
  shortDef: string
  example: string
}

export interface ScenarioRow {
  label: string // "Müteahhit %50" / "100 m²"
  arsaPayiX: number
  arsaSahibiDaireSayisi: number | null
  arsaSahibiDegeriTL: number | null
  daireSatisFiyatiTL: number
}

export interface ScenarioCard {
  kind: 'contractor_offers' | 'apartment_sizes'
  rows: ScenarioRow[]
  defaultsUsed: string[]
  assumptions: string[]
  emsalNote: string
}

export type ToolResultCard = TermCard | ScenarioCard

export interface AkifTurn {
  intent: AkifIntent
  speech: string
  state: AkifState
  facts_used: string[]
  assumptions: string[]
  missing_fields: string[]
  tool_result?: ToolResultCard
  needs_confirmation?: { field: string; heard: string; question: string }
  risk_level: 'low' | 'medium' | 'high'
}

const INTENTS: readonly AkifIntent[] = [
  'explain_term',
  'compare_contractor',
  'compare_apartment_size',
  'collect_info',
  'clarify_number',
  'smalltalk',
  'out_of_scope',
]

const STATES: readonly AkifState[] = [
  'NEUTRAL',
  'THINKING',
  'EXPLAINING',
  'CAUTION',
  'CONFIDENT',
  'SERIOUS',
  'FRIENDLY',
  'HUMOR',
]

const RISK_LEVELS: readonly AkifTurn['risk_level'][] = ['low', 'medium', 'high']

// OpenAI response_format (json_schema) için — model YALNIZ bu alanları üretir.
// tool_result ŞEMADA YOK: modelden gelen araç sonucu yok sayılır, orchestrator
// kendi çalıştırdığı gerçek sonucu enjekte eder (vizyon §53: "araç sonucu yokken
// sonucu varmış gibi tamamlamaz").
export const AKIF_TURN_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intent',
    'speech',
    'state',
    'facts_used',
    'assumptions',
    'missing_fields',
    'risk_level',
  ],
  properties: {
    intent: { type: 'string', enum: [...INTENTS] },
    speech: { type: 'string' },
    state: { type: 'string', enum: [...STATES] },
    facts_used: { type: 'array', items: { type: 'string' } },
    assumptions: { type: 'array', items: { type: 'string' } },
    missing_fields: { type: 'array', items: { type: 'string' } },
    risk_level: { type: 'string', enum: [...RISK_LEVELS] },
    needs_confirmation: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['field', 'heard', 'question'],
      properties: {
        field: { type: 'string' },
        heard: { type: 'string' },
        question: { type: 'string' },
      },
    },
  },
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

/**
 * Elle yazılmış doğrulayıcı — herhangi bir şekil uyuşmazlığında `null` döner.
 * `raw` içindeki `tool_result` alanı YOK SAYILIR (orchestrator sonradan ekler).
 */
export function parseAkifTurn(raw: unknown): AkifTurn | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>

  if (!INTENTS.includes(r.intent as AkifIntent)) return null
  if (!STATES.includes(r.state as AkifState)) return null
  if (!RISK_LEVELS.includes(r.risk_level as AkifTurn['risk_level'])) return null
  if (!isNonEmptyString(r.speech)) return null
  if (!isStringArray(r.facts_used)) return null
  if (!isStringArray(r.assumptions)) return null
  if (!isStringArray(r.missing_fields)) return null

  const turn: AkifTurn = {
    intent: r.intent as AkifIntent,
    speech: r.speech,
    state: r.state as AkifState,
    facts_used: r.facts_used,
    assumptions: r.assumptions,
    missing_fields: r.missing_fields,
    risk_level: r.risk_level as AkifTurn['risk_level'],
  }

  if (r.needs_confirmation != null) {
    const nc = r.needs_confirmation
    if (typeof nc !== 'object' || Array.isArray(nc)) return null
    const n = nc as Record<string, unknown>
    if (
      !isNonEmptyString(n.field) ||
      !isNonEmptyString(n.heard) ||
      !isNonEmptyString(n.question)
    ) {
      return null
    }
    turn.needs_confirmation = {
      field: n.field,
      heard: n.heard,
      question: n.question,
    }
  }

  // tool_result: kasıtlı olarak yok sayılır.
  return turn
}
