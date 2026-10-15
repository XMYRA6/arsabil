// Akif-5c — Parsel Dosyası: parsel başına tek kayıt + tarihli, geçmişi korunan olgular.

import type { Prisma } from '@prisma/client'
import type { FactInput, ParcelRef } from './types'
import type { FactRow } from './freshness'

export type Tx = Prisma.TransactionClient

/** Anahtar sırasından bağımsız JSON metni — Postgres jsonb anahtarları yeniden sıralar. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
    .join(',')}}`
}

export async function upsertParsel(tx: Tx, userId: string, ref: ParcelRef): Promise<{ id: string }> {
  return tx.parselDosyasi.upsert({
    where: { userId_il_ilce_mahalle_ada_parsel: { userId, ...ref } },
    create: { userId, ...ref },
    update: {},
    select: { id: true },
  })
}

export async function recordFact(
  tx: Tx,
  parselDosyasiId: string,
  fact: FactInput,
  now: Date,
): Promise<{ changed: boolean }> {
  const current = await tx.parselOlgu.findFirst({
    where: { parselDosyasiId, key: fact.key, supersededAt: null },
    orderBy: { recordedAt: 'desc' },
  })
  let changed = true
  if (current && canonicalJson(current.value) === canonicalJson(fact.value)) {
    // Teyit: aynı değer tekrar söylendi → yeni satır açma, tazele.
    await tx.parselOlgu.update({
      where: { id: current.id },
      data: { recordedAt: now, source: fact.source },
    })
    changed = false
  } else {
    if (current) {
      await tx.parselOlgu.update({ where: { id: current.id }, data: { supersededAt: now } })
    }
    await tx.parselOlgu.create({
      data: {
        parselDosyasiId,
        key: fact.key,
        value: fact.value as Prisma.InputJsonValue,
        source: fact.source,
        recordedAt: now,
      },
    })
  }
  await tx.parselDosyasi.update({ where: { id: parselDosyasiId }, data: { updatedAt: now } })
  return { changed }
}

export async function listCurrentFacts(tx: Tx, parselDosyasiId: string): Promise<FactRow[]> {
  const rows = await tx.parselOlgu.findMany({
    where: { parselDosyasiId, supersededAt: null },
    select: { key: true, value: true, source: true, recordedAt: true },
  })
  return rows as unknown as FactRow[]
}
