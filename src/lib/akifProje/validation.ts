// Akif-5c — girdi/olgu/parsel doğrulaması. Saf modül, I/O yok.
// Aralıklar mevcut numberSafety.RANGES ile aynıdır (tek doğruluk kaynağı).

import { validateRange } from '@/lib/ai/akif/numberSafety'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import {
  FACT_KEYS,
  FACT_SOURCES,
  INPUT_KEYS,
  type CreateProjectInput,
  type FactInput,
  type FactKey,
  type FactSource,
  type InputChange,
  type InputKey,
  type ParcelRef,
  type ProjectInputs,
  type ProjectParcelInput,
} from './types'

export type Failure = { ok: false; field: string; reason: string }

const fail = (field: string, reason: string): Failure => ({ ok: false, field, reason })
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const asObj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const QUALITY = ['standart', 'orta', 'luks']

const INPUT_CHECKS: Record<Exclude<InputKey, 'kaliteSinifi'>, (v: number) => boolean> = {
  arsaAlani: (v) => validateRange('area', v),
  emsal: (v) => validateRange('emsal', v),
  arsaSahibiPayiYuzde: (v) => validateRange('percent', v),
  daireBuyuklugu: (v) => validateRange('daire', v),
  birimMaliyet: (v) => validateRange('birimMaliyet', v),
  katAdedi: (v) => Number.isInteger(v) && v >= 1 && v <= 50,
}

export function validateInputs(raw: unknown): { ok: true; inputs: ProjectInputs } | Failure {
  if (raw === undefined || raw === null) return { ok: true, inputs: {} }
  const obj = asObj(raw)
  if (!obj) return fail('inputs', 'nesne olmalı')
  const out: ProjectInputs = {}
  for (const [k, v] of Object.entries(obj)) {
    if (!(INPUT_KEYS as readonly string[]).includes(k)) return fail(k, 'bilinmeyen alan')
    const key = k as InputKey
    if (key === 'kaliteSinifi') {
      if (typeof v !== 'string' || !QUALITY.includes(v)) return fail(k, 'geçersiz kalite sınıfı')
      out[key] = v
      continue
    }
    if (!isNum(v)) return fail(k, 'sayı olmalı')
    if (!INPUT_CHECKS[key](v)) return fail(k, 'geçersiz aralık')
    out[key] = v
  }
  return { ok: true, inputs: out }
}

/** Kontrol karakterleri (NUL, satır sonu, tab… + C1 aralığı + U+2028/2029 satır/paragraf ayıracı)
 * tek boşluğa çevrilir; Postgres TEXT/JSONB NUL'u reddeder, ayrıca sistem promptuna enjekte
 * edilen metinde sahte satır üretip "HESAP:"/"TAZE/BAYAT" gibi satırları taklit etmesini önler
 * (review bulgusu — önceki hal yalnız \x85'i kapsayıp C1'in geri kalanını ve U+2028/2029'u atlıyordu). */
export const cleanText = (s: string): string =>
  s.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim()

const trimmedText = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = cleanText(v)
  return t.length >= 1 && t.length <= max ? t : null
}

export function validateFact(raw: unknown): { ok: true; fact: FactInput } | Failure {
  const o = asObj(raw)
  if (!o) return fail('fact', 'nesne olmalı')
  if (!(FACT_KEYS as readonly string[]).includes(o.key as string)) return fail('key', 'bilinmeyen olgu')
  if (!(FACT_SOURCES as readonly string[]).includes(o.source as string)) return fail('source', 'bilinmeyen kaynak')
  const key = o.key as FactKey
  const source = o.source as FactSource
  const v = o.value
  const ok = (value: unknown) => ({ ok: true as const, fact: { key, value, source } })

  switch (key) {
    case 'areaSqm':
      return isNum(v) && v > 0 && v <= 10_000_000 ? ok(v) : fail('value', 'geçersiz alan')
    case 'emsal':
      return isNum(v) && validateRange('emsal', v) ? ok(v) : fail('value', 'geçersiz emsal')
    case 'katAdedi':
      return isNum(v) && Number.isInteger(v) && v >= 1 && v <= 50 ? ok(v) : fail('value', 'geçersiz kat adedi')
    case 'taks':
      return isNum(v) && v >= 0.05 && v <= 1 ? ok(v) : fail('value', 'geçersiz taks')
    case 'hmax':
      return isNum(v) && v >= 3 && v <= 300 ? ok(v) : fail('value', 'geçersiz yükseklik')
    case 'imarDurumu': {
      const t = trimmedText(v, 200)
      return t ? ok(t) : fail('value', 'metin olmalı')
    }
    case 'malik': {
      const t = trimmedText(v, 100)
      return t ? ok(t) : fail('value', 'metin olmalı')
    }
    case 'daireFiyati': {
      const d = asObj(v)
      if (!d || !isNum(d.m2) || !validateRange('daire', d.m2)) return fail('value', 'geçersiz daire büyüklüğü')
      if (!isNum(d.tl) || d.tl < 100_000 || d.tl > 1_000_000_000) return fail('value', 'geçersiz fiyat')
      return ok({ m2: d.m2, tl: d.tl })
    }
  }
}

export function validateParcelRef(raw: unknown): { ok: true; parcel: ParcelRef } | Failure {
  const o = asObj(raw)
  if (!o) return fail('parcel', 'nesne olmalı')
  const text = (field: string, max: number): string | Failure => {
    const v = o[field]
    const s = typeof v === 'number' && Number.isFinite(v) ? String(v) : v
    const t = trimmedText(s, max)
    return t ?? fail(field, 'eksik veya geçersiz')
  }
  const il = text('il', 60)
  if (typeof il !== 'string') return il
  const ilce = text('ilce', 60)
  if (typeof ilce !== 'string') return ilce
  const mahalle = text('mahalle', 60)
  if (typeof mahalle !== 'string') return mahalle
  const ada = text('ada', 20)
  if (typeof ada !== 'string') return ada
  const parsel = text('parsel', 20)
  if (typeof parsel !== 'string') return parsel
  return {
    ok: true,
    parcel: {
      il: normalizeAreaName(il),
      ilce: normalizeAreaName(ilce),
      mahalle: normalizeAreaName(mahalle),
      ada,
      parsel,
    },
  }
}

const MAX_PARCELS = 5
const MAX_FACTS_PER_PARCEL = 10
const MAX_NAME = 80

export function validateCreateArgs(raw: unknown): { ok: true; value: CreateProjectInput } | Failure {
  const o = asObj(raw)
  if (!o) return fail('args', 'nesne olmalı')

  let name: string | null = null
  if (o.name !== undefined && o.name !== null) {
    if (typeof o.name !== 'string') return fail('name', 'metin olmalı')
    const t = cleanText(o.name)
    if (t.length > MAX_NAME) return fail('name', 'çok uzun')
    name = t.length ? t : null
  }

  if (!Array.isArray(o.parcels) || o.parcels.length < 1 || o.parcels.length > MAX_PARCELS) {
    return fail('parcels', `1-${MAX_PARCELS} parsel olmalı`)
  }
  const parcels: ProjectParcelInput[] = []
  for (const p of o.parcels) {
    const ref = validateParcelRef(p)
    if (!ref.ok) return ref
    const factsRaw = asObj(p)?.facts
    const facts: FactInput[] = []
    if (factsRaw !== undefined && factsRaw !== null) {
      if (!Array.isArray(factsRaw) || factsRaw.length > MAX_FACTS_PER_PARCEL) return fail('facts', 'geçersiz liste')
      for (const f of factsRaw) {
        const v = validateFact(f)
        if (!v.ok) return v
        facts.push(v.fact)
      }
    }
    parcels.push(facts.length ? { ...ref.parcel, facts } : ref.parcel)
  }

  const inputs = validateInputs(o.inputs)
  if (!inputs.ok) return inputs
  return { ok: true, value: { name, parcels, inputs: inputs.inputs } }
}

export function diffInputs(oldI: ProjectInputs, next: ProjectInputs): InputChange[] {
  const out: InputChange[] = []
  for (const k of INPUT_KEYS) {
    const nv = next[k]
    if (nv === undefined) continue
    if (oldI[k] === nv) continue
    out.push({ field: k, oldValue: oldI[k] ?? null, newValue: nv })
  }
  return out
}

export function applyChanges(oldI: ProjectInputs, changes: InputChange[]): ProjectInputs {
  const result: ProjectInputs = { ...oldI }
  for (const c of changes) result[c.field as InputKey] = c.newValue as number | string
  return result
}
