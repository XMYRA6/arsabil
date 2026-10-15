// Akif-5c — her turda system prompt'a eklenen, SİSTEM tarafından hesaplanmış
// hafıza bağlamı. Bayatlık kararı burada KOD ile verilir; model yalnız okur.

import type { PrismaClient } from '@prisma/client'
import { classifyFacts, type FactRow } from './freshness'
import { istanbulDateString } from './dateRange'

const MAX_ITEMS = 5
const MAX_VALUE_CHARS = 60

const day = (d: Date) => istanbulDateString(d)

// Kullanıcı kaynaklı metinler system prompt satırı sahteleyemesin.
const clean = (s: string) =>
  String(s).replace(/[\x00-\x1f\x7f\x85]+/g, ' ').replace(/\s+/g, ' ').trim()

type ParcelRef = { il: string; ilce: string; mahalle: string; ada: string; parsel: string }
const parcelLabel = (x: ParcelRef) =>
  `${clean(x.il)}/${clean(x.ilce)}/${clean(x.mahalle)} ada ${clean(x.ada)} parsel ${clean(x.parsel)}`

function showValue(v: unknown): string {
  const s = clean(JSON.stringify(v) ?? 'null')
  return s.length > MAX_VALUE_CHARS ? s.slice(0, MAX_VALUE_CHARS) + '…' : s
}

const factLine = (label: 'TAZE' | 'BAYAT', f: FactRow) =>
  `  ${label}: ${clean(f.key)} = ${showValue(f.value)} (${clean(f.source)}, ${day(f.recordedAt)})` +
  (label === 'BAYAT' ? ' → kullanıcıya TARİHİYLE teyit ettir' : '')

export async function buildMemoryContext(
  db: PrismaClient,
  a: { userId: string | null; now: Date },
): Promise<string> {
  const lines = [
    'HAFIZA BAĞLAMI (sistem tarafından hesaplandı; tarih, kayıtlı proje ve parsel olguları için tek doğru kaynak):',
    `BUGÜN: ${day(a.now)} (Europe/Istanbul)`,
  ]
  if (!a.userId) {
    lines.push('HESAP: bağlı değil (telefon bir ArsaBil hesabına bağlı değil; kaydetme araçları kayıt yerine üyelik bağlantısı üretir)')
    return lines.join('\n')
  }
  lines.push('HESAP: bağlı')

  const projects = await db.projeKarti.findMany({
    where: { userId: a.userId },
    orderBy: { updatedAt: 'desc' },
    take: MAX_ITEMS,
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      parseller: { take: MAX_ITEMS + 1, select: { parselDosyasi: { select: { il: true, ilce: true, mahalle: true, ada: true, parsel: true } } } },
    },
  })
  if (projects.length) {
    lines.push('KAYITLI PROJELER (en yeni güncelleme önce):')
    for (const p of projects) {
      const parcels =
        p.parseller
          .slice(0, MAX_ITEMS)
          .map((x) => parcelLabel(x.parselDosyasi))
          .join('; ') + (p.parseller.length > MAX_ITEMS ? ' (+daha fazla)' : '')
      lines.push(
        `- id=${p.id} | ${JSON.stringify(clean(p.name ?? '') || 'Adsız proje')} | oluşturma ${day(p.createdAt)} | güncelleme ${day(p.updatedAt)} | ${parcels}`,
      )
    }
  } else {
    lines.push('KAYITLI PROJELER: yok')
  }

  const parcels = await db.parselDosyasi.findMany({
    where: { userId: a.userId },
    orderBy: { updatedAt: 'desc' },
    take: MAX_ITEMS,
    select: {
      id: true,
      il: true,
      ilce: true,
      mahalle: true,
      ada: true,
      parsel: true,
      olgular: { where: { supersededAt: null }, select: { key: true, value: true, source: true, recordedAt: true } },
    },
  })
  if (parcels.length) {
    lines.push('KAYITLI PARSELLER:')
    for (const p of parcels) {
      lines.push(`- ${parcelLabel(p)}`)
      const c = classifyFacts(p.olgular as unknown as FactRow[], a.now)
      for (const f of c.taze) lines.push(factLine('TAZE', f))
      for (const f of c.bayat) lines.push(factLine('BAYAT', f))
      for (const k of c.eksik) lines.push(`  EKSİK: ${k} → sor`)
    }
  }
  return lines.join('\n')
}
