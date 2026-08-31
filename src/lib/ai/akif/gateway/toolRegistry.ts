// Akif-1 Tool Gateway — allowlist.
// Akif YALNIZ bu 3 aracı çağırabilir. Burada:
//   1. `AKIF_TOOL_DEFS` — OpenAI Chat Completions `tools` şemaları (modele verilir)
//   2. `validateArgs`  — bir aracı ÇALIŞTIRMADAN ÖNCE argüman doğrulaması
//   3. `dispatchTool`  — ad → gerçek fonksiyon (validateArgs geçtiği varsayılır)
// Saf allowlist: dispatch dışında yan etki yok; DB erişimi `deps.db` üzerinden.

import { explainTerm } from './explainTerm'
import { GLOSSARY, type AkifTerm } from './glossary'
import {
  compareContractorOffers,
  compareApartmentSizes,
  type ContractorOffersArgs,
  type ApartmentSizesArgs,
} from './compareContractorOffers'
import { validateRange } from '../numberSafety'
import { resolveEngineDefaults, type EngineDefaultsDb } from './engineDefaults'
import type { ToolResultCard } from '../contract'

// --- Allowlist adları -------------------------------------------------------

export type ToolName =
  | 'explainTerm'
  | 'compareContractorOffers'
  | 'compareApartmentSizes'

const AKIF_TERMS: AkifTerm[] = Object.keys(GLOSSARY) as AkifTerm[]

// --- OpenAI tool şemaları ---------------------------------------------------

export interface OpenAiToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

const KALITE_ENUM = ['standart', 'orta', 'luks'] as const

export const AKIF_TOOL_DEFS: OpenAiToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'explainTerm',
      description:
        'İmar/arsa terimini (emsal, TAKS, KAKS, kat karşılığı, arsa payı, iksa, risk katsayısı) sade Türkçe açıkla.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['term'],
        properties: {
          term: { type: 'string', enum: [...AKIF_TERMS] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compareContractorOffers',
      description:
        'Farklı müteahhit paylaşım oranları için kat karşılığı senaryolarını karşılaştır.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['arsaAlani', 'emsal', 'muteahhitPaylari'],
        properties: {
          arsaAlani: { type: 'number' },
          emsal: { type: 'number' },
          muteahhitPaylari: { type: 'array', items: { type: 'number' } },
          daireBuyuklugu: { type: 'number' },
          birimMaliyet: { type: 'number' },
          kaliteSinifi: { type: 'string', enum: [...KALITE_ENUM] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compareApartmentSizes',
      description:
        'Farklı ortalama daire büyüklükleri için kat karşılığı senaryolarını karşılaştır.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['arsaAlani', 'emsal', 'muteahhitPayi', 'daireBuyuklukleri'],
        properties: {
          arsaAlani: { type: 'number' },
          emsal: { type: 'number' },
          muteahhitPayi: { type: 'number' },
          daireBuyuklukleri: { type: 'array', items: { type: 'number' } },
          birimMaliyet: { type: 'number' },
          kaliteSinifi: { type: 'string', enum: [...KALITE_ENUM] },
        },
      },
    },
  },
]

// --- Argüman doğrulama -----------------------------------------------------

export type ValidateResult =
  | { ok: true }
  | { ok: false; field: string; reason: string }

const OK: ValidateResult = { ok: true }

function fail(field: string, reason: string): ValidateResult {
  return { ok: false, field, reason }
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

type RangeField = 'percent' | 'area' | 'emsal' | 'daire'

/** Zorunlu tekil sayı alanı: eksik / sayı-değil / aralık dışı kontrolleri. */
function checkNumberField(
  obj: Record<string, unknown>,
  field: string,
  range: RangeField,
): ValidateResult | null {
  const v = obj[field]
  if (v === undefined || v === null) return fail(field, 'eksik')
  if (!isNum(v)) return fail(field, 'sayı olmalı')
  if (!validateRange(range, v)) return fail(field, 'geçersiz aralık')
  return null
}

/** 2–4 elemanlı sayı dizisi, her eleman verilen aralıkta. */
function checkNumberArray(
  obj: Record<string, unknown>,
  field: string,
  range: RangeField,
): ValidateResult | null {
  const v = obj[field]
  if (v === undefined || v === null) return fail(field, 'eksik')
  if (!Array.isArray(v)) return fail(field, 'sayı olmalı')
  if (v.length < 2 || v.length > 4) return fail(field, '2-4 değer olmalı')
  for (const item of v) {
    if (!isNum(item)) return fail(field, 'sayı olmalı')
    if (!validateRange(range, item)) return fail(field, 'geçersiz aralık')
  }
  return null
}

export function validateArgs(name: ToolName, args: unknown): ValidateResult {
  const obj: Record<string, unknown> =
    args && typeof args === 'object' && !Array.isArray(args)
      ? (args as Record<string, unknown>)
      : {}

  if (name === 'explainTerm') {
    const term = obj.term
    if (typeof term !== 'string' || !AKIF_TERMS.includes(term as AkifTerm)) {
      return fail('term', 'bilinmeyen terim')
    }
    return OK
  }

  if (name === 'compareContractorOffers') {
    return (
      checkNumberField(obj, 'arsaAlani', 'area') ??
      checkNumberField(obj, 'emsal', 'emsal') ??
      checkNumberArray(obj, 'muteahhitPaylari', 'percent') ??
      (obj.daireBuyuklugu !== undefined && obj.daireBuyuklugu !== null
        ? checkNumberField(obj, 'daireBuyuklugu', 'daire')
        : null) ??
      OK
    )
  }

  if (name === 'compareApartmentSizes') {
    return (
      checkNumberField(obj, 'arsaAlani', 'area') ??
      checkNumberField(obj, 'emsal', 'emsal') ??
      checkNumberField(obj, 'muteahhitPayi', 'percent') ??
      checkNumberArray(obj, 'daireBuyuklukleri', 'daire') ??
      OK
    )
  }

  return fail('name', 'bilinmeyen araç')
}

// --- Dispatch -------------------------------------------------------------

export interface DispatchDeps {
  db: EngineDefaultsDb
}

export async function dispatchTool(
  name: ToolName,
  args: unknown,
  deps: DispatchDeps,
): Promise<ToolResultCard> {
  switch (name) {
    case 'explainTerm':
      return explainTerm(args as { term: AkifTerm })
    case 'compareContractorOffers': {
      const defaults = await resolveEngineDefaults(deps.db)
      return compareContractorOffers(args as ContractorOffersArgs, defaults)
    }
    case 'compareApartmentSizes': {
      const defaults = await resolveEngineDefaults(deps.db)
      return compareApartmentSizes(args as ApartmentSizesArgs, defaults)
    }
    default:
      throw new Error(`dispatchTool: bilinmeyen araç "${String(name)}"`)
  }
}
