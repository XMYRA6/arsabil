// Akif-5c Aşama C — fiyat tahmini ve proje hesabı araç mantığı (WhatsApp gateway'i Görev 6'da bağlar).

import type { PrismaClient } from '@prisma/client'
import type { ProjectCard } from '@/lib/ai/akif/contract'
import { resolveEngineDefaults, type EngineDefaultsDb } from '@/lib/ai/akif/gateway/engineDefaults'
import { lookupKonutFiyat } from '@/lib/konutPrices/lookup'
import { computeProjectEstimate, type EstimateInput } from './hesap'
import { FACT_TTL_DAYS } from './freshness'
import { istanbulDateString } from './dateRange'
import { canonicalJson } from './parselDosyasi'

const DAY_MS = 86_400_000

interface FactRow {
  key: string
  value: unknown
  source: string
  recordedAt: Date
}

interface LoadedProject {
  id: string
  name: string
  inputs: unknown
  result: unknown
  parseller: Array<{
    parselDosyasi: { il: string; ilce: string; mahalle: string; ada: string; parsel: string; olgular: FactRow[] }
  }>
}

async function loadProject(db: PrismaClient, userId: string, projectId: string): Promise<LoadedProject | null> {
  const row = await db.projeKarti.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true,
      name: true,
      inputs: true,
      result: true,
      parseller: {
        select: {
          parselDosyasi: {
            select: {
              il: true,
              ilce: true,
              mahalle: true,
              ada: true,
              parsel: true,
              olgular: {
                where: { supersededAt: null },
                select: { key: true, value: true, source: true, recordedAt: true },
              },
            },
          },
        },
      },
    },
  })
  return row as unknown as LoadedProject | null
}

function latestFact(rows: FactRow[], key: string): FactRow | undefined {
  let best: FactRow | undefined
  for (const r of rows) {
    if (r.key !== key) continue
    if (!best || r.recordedAt.getTime() > best.recordedAt.getTime()) best = r
  }
  return best
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function pos(v: unknown): number | undefined {
  const n = num(v)
  return n !== undefined && n > 0 ? n : undefined
}

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function compact(result: unknown): {
  mod: unknown
  xMaxYuzde: unknown
  yapilamaz: unknown
  arsaSahibiDaire: unknown
  daireFiyatiTL: unknown
  toplamDaire: unknown
} | null {
  if (result === null || typeof result !== 'object') return null
  const r = result as Record<string, unknown>
  const satirlar = Array.isArray(r.satirlar) ? (r.satirlar as Array<Record<string, unknown>>) : []
  return {
    mod: r.mod ?? null,
    xMaxYuzde: r.xMaxYuzde ?? null,
    yapilamaz: r.yapilamaz ?? null,
    arsaSahibiDaire: satirlar[0]?.arsaSahibiDaire ?? null,
    daireFiyatiTL: r.daireFiyatiTL ?? null,
    toplamDaire: r.toplamDaire ?? null,
  }
}

export async function runEstimateDaireFiyati(
  db: PrismaClient,
  a: { userId: string; projectId: string },
): Promise<ProjectCard> {
  const p = await loadProject(db, a.userId, a.projectId)
  if (!p) return { kind: 'project', op: 'not_found' }
  const first = p.parseller[0]?.parselDosyasi
  if (!first) return { kind: 'project', op: 'failed', data: { alan: 'parsel', neden: 'projede parsel yok' } }

  const inputs = asRecord(p.inputs)
  const olgular = p.parseller.flatMap((x) => x.parselDosyasi.olgular)
  const fiyat = readFiyat(latestFact(olgular, 'daireFiyati')?.value)
  const inputM2 = num(inputs.daireBuyuklugu)
  const daireM2 = inputM2 ?? fiyat?.m2 ?? 100
  const daireM2Varsayilan = inputM2 === undefined && fiyat === undefined

  const hit = await lookupKonutFiyat(db as never, { il: first.il, ilce: first.ilce, mahalle: first.mahalle, daireM2 })
  if (!hit) {
    return {
      kind: 'project',
      op: 'price_unavailable',
      data: {
        projectId: p.id,
        bolge: `${first.il}/${first.ilce}/${first.mahalle}`,
        neden: 'Bu bölge için yeterli konut ilanı verisi yok',
      },
    }
  }
  return {
    kind: 'project',
    op: 'price_estimate',
    data: {
      projectId: p.id,
      daireM2,
      daireM2Varsayilan,
      tahminiFiyatTL: hit.tl,
      m2BirimFiyatTL: hit.perSqm,
      olcek: hit.scale,
      ornekSayisi: hit.sampleCount,
      guven: hit.confidence,
      bolge: hit.bolge,
      parsel: { il: first.il, ilce: first.ilce, mahalle: first.mahalle, ada: first.ada, parsel: first.parsel },
      not: 'İlan fiyatlarına dayanır; pazarlık payı içerebilir',
    },
  }
}

function readFiyat(v: unknown): { m2: number; tl: number } | undefined {
  const o = asRecord(v)
  const m2 = pos(o.m2)
  const tl = pos(o.tl)
  return m2 !== undefined && tl !== undefined ? { m2, tl } : undefined
}

export async function runCalculateProject(
  db: PrismaClient,
  a: { userId: string; projectId: string },
  now: Date,
): Promise<ProjectCard> {
  const p = await loadProject(db, a.userId, a.projectId)
  if (!p) return { kind: 'project', op: 'not_found' }

  const inputs = asRecord(p.inputs)
  const olgular = p.parseller.flatMap((x) => x.parselDosyasi.olgular)
  const fiyatOlgu = latestFact(olgular, 'daireFiyati')
  const fiyat = readFiyat(fiyatOlgu?.value)
  const kalite = inputs.kaliteSinifi
  const defaults = await resolveEngineDefaults(db as unknown as EngineDefaultsDb)

  const est = computeProjectEstimate({
    arsaAlani: num(inputs.arsaAlani) ?? num(latestFact(olgular, 'areaSqm')?.value),
    emsal: num(inputs.emsal) ?? num(latestFact(olgular, 'emsal')?.value),
    arsaSahibiPayiYuzde: num(inputs.arsaSahibiPayiYuzde),
    daireBuyuklugu: num(inputs.daireBuyuklugu),
    birimMaliyet: num(inputs.birimMaliyet),
    kaliteSinifi: kalite === 'standart' || kalite === 'orta' || kalite === 'luks' ? kalite : undefined,
    fiyat,
    defaults,
  } satisfies EstimateInput)

  if (!est.ok) {
    return { kind: 'project', op: 'failed', data: { alan: 'girdi', neden: 'hesap için eksik bilgi', eksik: est.eksik } }
  }

  const ttl = FACT_TTL_DAYS.daireFiyati
  const fiyatBayat =
    fiyat !== undefined && fiyatOlgu !== undefined && ttl !== null
      ? now.getTime() - fiyatOlgu.recordedAt.getTime() > ttl * DAY_MS
      : false
  const fiyatTarihi = fiyat && fiyatOlgu ? istanbulDateString(fiyatOlgu.recordedAt) : null

  const { ok: _ok, ...sonuc } = est
  void _ok
  const result = { ...sonuc, fiyatBayat, fiyatTarihi, hesapTarihi: istanbulDateString(now) }

  const ozet = compact(result)
  const onceki = compact(p.result)
  const degisti = canonicalJson(onceki) !== canonicalJson(ozet)

  const yazildi = await db.$transaction(async (tx) => {
    const upd = await tx.projeKarti.updateMany({ where: { id: p.id, userId: a.userId }, data: { result: result as never } })
    if (upd.count !== 1) return false
    if (degisti) {
      await tx.projeRevizyon.create({
        data: {
          projeKartiId: p.id,
          field: 'hesap',
          oldValue: (onceki ?? undefined) as never,
          newValue: ozet as never,
          changedAt: now,
          channel: 'whatsapp',
          note: est.mod,
        },
      })
    }
    return true
  })
  if (!yazildi) return { kind: 'project', op: 'not_found' }

  return { kind: 'project', op: 'calculated', data: { projectId: p.id, ad: p.name, ...result } }
}
