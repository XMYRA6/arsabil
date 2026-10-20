// Akif-5c — Proje Kartı: oluştur / güncelle (revizyon günlüğüyle) / bul / özetle.
// Sahiplik filtresi (userId) HER sorgunun parçasıdır.

import { Prisma, type PrismaClient } from '@prisma/client'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { INPUT_KEYS, type Channel, type CreateProjectInput, type InputChange, type ParcelRef, type ProjectInputs } from './types'
import { applyChanges, diffInputs } from './validation'
import { recordFact, upsertParsel, type Tx } from './parselDosyasi'

export type CreateProjectArgs = CreateProjectInput & { userId: string; channel: Channel }

export async function createProjectTx(
  tx: Tx,
  a: CreateProjectArgs,
  now: Date,
): Promise<{ id: string; name: string | null }> {
  const parcelIds: string[] = []
  for (const p of a.parcels) {
    const { facts, ...ref } = p
    const { id } = await upsertParsel(tx, a.userId, ref)
    for (const f of facts ?? []) await recordFact(tx, id, f, now)
    parcelIds.push(id)
  }
  const card = await tx.projeKarti.create({
    data: {
      userId: a.userId,
      name: a.name ?? null,
      inputs: a.inputs as Prisma.InputJsonValue,
      parseller: { create: [...new Set(parcelIds)].map((parselDosyasiId) => ({ parselDosyasiId })) },
    },
    select: { id: true, name: true },
  })
  const rows: Prisma.ProjeRevizyonCreateManyInput[] = INPUT_KEYS.filter((k) => a.inputs[k] !== undefined).map((k) => ({
    projeKartiId: card.id,
    field: k,
    newValue: a.inputs[k] as Prisma.InputJsonValue,
    changedAt: now,
    channel: a.channel,
    note: 'ilk girdi',
  }))
  if (rows.length) await tx.projeRevizyon.createMany({ data: rows })
  return card
}

export function createProject(db: PrismaClient, a: CreateProjectArgs, now: Date) {
  return db.$transaction((tx) => createProjectTx(tx, a, now))
}

export interface UpdateProjectArgs {
  userId: string
  projectId: string
  changes: ProjectInputs
  name?: string
  channel: Channel
  note?: string
}

export type UpdateProjectResult =
  | { ok: true; changes: InputChange[]; nameChanged: boolean }
  | { ok: false; reason: 'not_found' }

export function updateProject(db: PrismaClient, a: UpdateProjectArgs, now: Date): Promise<UpdateProjectResult> {
  return db.$transaction(async (tx): Promise<UpdateProjectResult> => {
    const card = await tx.projeKarti.findFirst({
      where: { id: a.projectId, userId: a.userId },
      select: { id: true, name: true, inputs: true },
    })
    if (!card) return { ok: false, reason: 'not_found' }

    const oldInputs = card.inputs as ProjectInputs
    const diff = diffInputs(oldInputs, a.changes)
    const nameChanged = a.name !== undefined && a.name !== card.name
    if (!diff.length && !nameChanged) return { ok: true, changes: [], nameChanged: false }

    await tx.projeKarti.update({
      where: { id: card.id },
      data: {
        inputs: applyChanges(oldInputs, diff) as Prisma.InputJsonValue,
        ...(nameChanged ? { name: a.name } : {}),
        // Hesaba giren bir girdi değiştiyse önbelleklenmiş sonuç artık güncel girdileri
        // yansıtmıyor (review bulgusu) — bayat bir xMaxYuzde/yapilamaz'ın "değişiklikYok"
        // sanılıp sessizce güncel gibi kullanılmaması için temizlenir, sıradaki hesapta
        // doğal olarak yeniden üretilir.
        ...(diff.length ? { result: Prisma.DbNull } : {}),
      },
    })
    const rows: Prisma.ProjeRevizyonCreateManyInput[] = diff.map((d) => ({
      projeKartiId: card.id,
      field: d.field,
      oldValue: (d.oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
      newValue: d.newValue as Prisma.InputJsonValue,
      changedAt: now,
      channel: a.channel,
      note: a.note ?? null,
    }))
    if (nameChanged) {
      rows.push({
        projeKartiId: card.id,
        field: 'name',
        oldValue: (card.name ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: a.name as string,
        changedAt: now,
        channel: a.channel,
        note: a.note ?? null,
      })
    }
    await tx.projeRevizyon.createMany({ data: rows })
    return { ok: true, changes: diff, nameChanged }
  })
}

export interface ProjectListItem {
  id: string
  name: string | null
  createdAt: Date
  updatedAt: Date
  parcels: ParcelRef[]
}

type CardRow = {
  id: string
  name: string | null
  createdAt: Date
  updatedAt: Date
  parseller: Array<{ parselDosyasi: ParcelRef }>
}

const toListItem = (r: CardRow): ProjectListItem => ({
  id: r.id,
  name: r.name,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  parcels: r.parseller.map((p) => ({
    il: p.parselDosyasi.il,
    ilce: p.parselDosyasi.ilce,
    mahalle: p.parselDosyasi.mahalle,
    ada: p.parselDosyasi.ada,
    parsel: p.parselDosyasi.parsel,
  })),
})

const CARD_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  parseller: { select: { parselDosyasi: { select: { il: true, ilce: true, mahalle: true, ada: true, parsel: true } } } },
} as const

export interface FindProjectsQuery {
  userId: string
  range?: { from: Date; toExclusive: Date } | null
  nameLike?: string
  ada?: string
  parsel?: string
  mahalle?: string
}

export async function findProjects(
  db: PrismaClient,
  q: FindProjectsQuery,
): Promise<{ candidates: ProjectListItem[]; more: boolean }> {
  const and: Prisma.ProjeKartiWhereInput[] = []
  if (q.range) {
    const r = { gte: q.range.from, lt: q.range.toExclusive }
    and.push({ OR: [{ createdAt: r }, { revizyonlar: { some: { changedAt: r } } }] })
  }
  if (q.nameLike) and.push({ name: { contains: q.nameLike, mode: 'insensitive' } })
  if (q.ada || q.parsel || q.mahalle) {
    and.push({
      parseller: {
        some: {
          parselDosyasi: {
            ...(q.ada ? { ada: q.ada.trim() } : {}),
            ...(q.parsel ? { parsel: q.parsel.trim() } : {}),
            ...(q.mahalle ? { mahalle: { contains: normalizeAreaName(q.mahalle) } } : {}),
          },
        },
      },
    })
  }
  const rows = await db.projeKarti.findMany({
    where: { userId: q.userId, ...(and.length ? { AND: and } : {}) },
    orderBy: { updatedAt: 'desc' },
    take: 6,
    select: CARD_SELECT,
  })
  return { candidates: rows.slice(0, 5).map(toListItem), more: rows.length > 5 }
}

export interface ProjectSummary extends ProjectListItem {
  inputs: ProjectInputs
  revisions: Array<{ field: string; oldValue: unknown; newValue: unknown; changedAt: Date; channel: string }>
  truncated: boolean
}

const MAX_REVISIONS = 50

export async function getProjectSummary(
  db: PrismaClient,
  a: { userId: string; projectId: string },
): Promise<ProjectSummary | null> {
  const card = await db.projeKarti.findFirst({
    where: { id: a.projectId, userId: a.userId },
    select: { ...CARD_SELECT, inputs: true },
  })
  if (!card) return null
  const revs = await db.projeRevizyon.findMany({
    where: { projeKartiId: card.id },
    orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    take: MAX_REVISIONS + 1,
    select: { field: true, oldValue: true, newValue: true, changedAt: true, channel: true },
  })
  return {
    ...toListItem(card as unknown as CardRow),
    inputs: card.inputs as ProjectInputs,
    revisions: revs.slice(0, MAX_REVISIONS),
    truncated: revs.length > MAX_REVISIONS,
  }
}
