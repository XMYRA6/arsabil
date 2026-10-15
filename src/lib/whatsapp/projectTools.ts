// Akif-5c — WhatsApp-özel proje kartı araçları. Paylaşılan toolRegistry.ts'e
// HİÇ eklenmez; yalnız akifToolGateway.ts (WhatsApp) üzerinden açılır.
// Orchestrator tur başına TEK araç çağırır → findProjects tek eşleşmede özeti
// de döner, createProject olguları parsel başına `facts` ile alır.

import type { PrismaClient } from '@prisma/client'
import type { OpenAiToolDef, ValidateResult } from '@/lib/ai/akif/gateway/toolRegistry'
import type { ProjectCard } from '@/lib/ai/akif/contract'
import { cleanText, validateCreateArgs, validateFact, validateInputs, validateParcelRef } from '@/lib/akifProje/validation'
import { istanbulDateString, parseDateRange } from '@/lib/akifProje/dateRange'
import { recordFact, upsertParsel } from '@/lib/akifProje/parselDosyasi'
import {
  createProject,
  findProjects,
  getProjectSummary,
  updateProject,
  type ProjectListItem,
  type ProjectSummary,
} from '@/lib/akifProje/projeKarti'
import { runEstimateDaireFiyati, runCalculateProject } from '@/lib/akifProje/hesapTools'
import { createClaim, CLAIM_TTL_MS, type ClaimDraft } from '@/lib/akifProje/claim'

export type ProjectToolName =
  | 'findProjects' | 'summarizeProject' | 'createProject' | 'updateProject' | 'rememberFact'
  | 'estimateDaireFiyati' | 'calculateProject'

const NAMES: readonly ProjectToolName[] = [
  'findProjects', 'summarizeProject', 'createProject', 'updateProject', 'rememberFact',
  'estimateDaireFiyati', 'calculateProject',
]
export const isProjectToolName = (n: string): n is ProjectToolName => (NAMES as readonly string[]).includes(n)

const CLAIM_RATE_LIMIT = { limit: 3, windowMs: 3_600_000 }

const PARCEL_PROPS = {
  il: { type: 'string' },
  ilce: { type: 'string' },
  mahalle: { type: 'string' },
  ada: { type: 'string' },
  parsel: { type: 'string' },
}

const INPUTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  description: 'Proje girdileri; yalnız bildirilen alanlar.',
  properties: {
    arsaAlani: { type: 'number', description: 'm²' },
    emsal: { type: 'number' },
    arsaSahibiPayiYuzde: { type: 'number', description: 'Arsa sahibinin payı, % (1-99)' },
    daireBuyuklugu: { type: 'number', description: 'm²' },
    katAdedi: { type: 'number' },
    birimMaliyet: { type: 'number', description: 'TL/m²' },
    kaliteSinifi: { type: 'string', enum: ['standart', 'orta', 'luks'] },
  },
}

const FACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'value', 'source'],
  properties: {
    key: { type: 'string', enum: ['areaSqm', 'imarDurumu', 'emsal', 'katAdedi', 'taks', 'hmax', 'malik', 'daireFiyati'] },
    value: { description: 'sayı, metin ya da daireFiyati için {m2, tl} nesnesi' },
    source: { type: 'string', enum: ['tkgm', 'goruntu', 'kullanici', 'ilan'] },
  },
}

export const PROJECT_TOOL_DEFS: OpenAiToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'findProjects',
      description:
        "Kullanıcının kayıtlı projelerini tarih/isim/parsel ile bulur. Tek eşleşmede özeti (revizyon geçmişi dahil) de döner. Filtre vermezsen son projeleri listeler. Tarihleri YYYY-MM-DD ver (BUGÜN'e göre hesapla).",
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          dateFrom: { type: 'string', description: 'YYYY-MM-DD' },
          dateTo: { type: 'string', description: 'YYYY-MM-DD' },
          nameLike: { type: 'string' },
          mahalle: { type: 'string' },
          ada: { type: 'string' },
          parsel: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarizeProject',
      description: 'Bir projenin girdilerini ve revizyon geçmişini (en yeniden en eskiye) getirir. projectId yalnız bağlamdan veya önceki araç sonucundan alınır.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['projectId'],
        properties: { projectId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createProject',
      description:
        'Yeni proje kartı oluşturur (kullanıcı hesabı bağlı değilse kayıt yerine üyelik bağlantısı üretir). Eski projeye dokunmaz. Parsellere bilinen olguları facts ile ekleyebilirsin.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['parcels'],
        properties: {
          name: { type: 'string', description: 'Kullanıcının verdiği isim (opsiyonel)' },
          parcels: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['il', 'ilce', 'mahalle', 'ada', 'parsel'],
              properties: { ...PARCEL_PROPS, facts: { type: 'array', items: FACT_SCHEMA } },
            },
          },
          inputs: INPUTS_SCHEMA,
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateProject',
      description: 'Var olan bir projenin girdilerini/ismini değiştirir; her değişiklik tarihli revizyon olarak kaydedilir. Yalnız DEĞİŞEN alanları gönder.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
          changes: INPUTS_SCHEMA,
          name: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rememberFact',
      description:
        'Bir parselle ilgili olguyu (imar durumu, emsal, kat adedi vb.) Parsel Dosyası\'na kaydeder. Kullanıcı bayat bir olguyu "hâlâ geçerli" diye teyit ederse AYNI değerle çağır (tazelenir).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['il', 'ilce', 'mahalle', 'ada', 'parsel', 'key', 'value', 'source'],
        properties: { ...PARCEL_PROPS, ...FACT_SCHEMA.properties },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimateDaireFiyati',
      description:
        "Projenin parselinin bölgesindeki konut ilanlarından yaklaşık daire fiyatını getirir (kullanıcıya 'doğru mu?' diye doğrulatmak için). İmar bilinmiyorsa veya daire fiyatı olgusu yoksa çağır. Sonuç doğrulanmadan hesaba girmez.",
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['projectId'],
        properties: { projectId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculateProject',
      description:
        'Projeyi hesaplar: imar (emsal) biliniyorsa toplam daire ve arsa sahibine düşen daire/değer; yalnız doğrulanmış daire fiyatı varsa müteahhidin verebileceği en yüksek arsa payı (%). Rakamları yalnız bu aracın sonucundan aktar, kendin hesaplama. Sonuç projeye kaydedilir.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['projectId'],
        properties: { projectId: { type: 'string' } },
      },
    },
  },
]

// --- Doğrulama --------------------------------------------------------------

const OK: ValidateResult = { ok: true }
const bad = (field: string, reason: string): ValidateResult => ({ ok: false, field, reason })
const obj = (a: unknown): Record<string, unknown> =>
  a && typeof a === 'object' && !Array.isArray(a) ? (a as Record<string, unknown>) : {}

function optText(o: Record<string, unknown>, field: string, max: number): ValidateResult | null {
  const v = o[field]
  if (v === undefined || v === null) return null
  if (typeof v !== 'string' || v.length > max) return bad(field, 'geçersiz metin')
  return null
}

export function validateProjectToolArgs(name: ProjectToolName, args: unknown): ValidateResult {
  const o = obj(args)
  switch (name) {
    case 'findProjects': {
      for (const [f, max] of [['nameLike', 60], ['mahalle', 60], ['ada', 20], ['parsel', 20]] as const) {
        const r = optText(o, f, max)
        if (r) return r
      }
      const range = parseDateRange({ dateFrom: o.dateFrom, dateTo: o.dateTo })
      return range.ok ? OK : bad(range.field, range.reason)
    }
    case 'summarizeProject':
    case 'estimateDaireFiyati':
    case 'calculateProject':
      return typeof o.projectId === 'string' && o.projectId.length > 0 && o.projectId.length <= 40
        ? OK
        : bad('projectId', 'eksik')
    case 'createProject': {
      const v = validateCreateArgs(args)
      return v.ok ? OK : bad(v.field, v.reason)
    }
    case 'updateProject': {
      if (typeof o.projectId !== 'string' || !o.projectId || o.projectId.length > 40) return bad('projectId', 'eksik')
      const nameErr = optText(o, 'name', 80)
      if (nameErr) return nameErr
      const inputs = validateInputs(o.changes)
      if (!inputs.ok) return bad(inputs.field, inputs.reason)
      const hasChanges = Object.keys(inputs.inputs).length > 0
      const hasName = typeof o.name === 'string' && cleanText(o.name).length > 0
      return hasChanges || hasName ? OK : bad('changes', 'değişiklik veya isim gerekli')
    }
    case 'rememberFact': {
      const p = validateParcelRef(args)
      if (!p.ok) return bad(p.field, p.reason)
      const f = validateFact(args)
      return f.ok ? OK : bad(f.field, f.reason)
    }
  }
}

// --- Dispatch ---------------------------------------------------------------

export interface ProjectToolDeps {
  db: PrismaClient
  phone: string
  now: () => Date
  baseUrl: string
  checkRateLimit: (key: string, opts: { limit: number; windowMs: number }) => { ok: boolean }
}

const parcelText = (p: { il: string; ilce: string; mahalle: string; ada: string; parsel: string }) =>
  `${p.il}/${p.ilce}/${p.mahalle} ada ${p.ada} parsel ${p.parsel}`

const listItem = (p: ProjectListItem) => ({
  id: p.id,
  ad: p.name,
  olusturma: istanbulDateString(p.createdAt),
  sonGuncelleme: istanbulDateString(p.updatedAt),
  parseller: p.parcels.map(parcelText),
})

function summaryCard(s: ProjectSummary): ProjectCard {
  return {
    kind: 'project',
    op: 'summary',
    data: {
      projectId: s.id,
      ad: s.name,
      olusturma: istanbulDateString(s.createdAt),
      sonGuncelleme: istanbulDateString(s.updatedAt),
      parseller: s.parcels.map(parcelText),
      guncelGirdiler: s.inputs,
      degisiklikler: s.revisions.map((r) => ({
        tarih: istanbulDateString(r.changedAt),
        alan: r.field,
        eski: r.oldValue ?? null,
        yeni: r.newValue,
        kanal: r.channel,
      })),
      kesildi: s.truncated,
    },
  }
}

async function needsSignup(name: ProjectToolName, args: unknown, deps: ProjectToolDeps, now: Date): Promise<ProjectCard> {
  if (!deps.checkRateLimit('wa-claim:' + deps.phone, CLAIM_RATE_LIMIT).ok) {
    return { kind: 'project', op: 'rate_limited' }
  }
  let draft: ClaimDraft | null = null
  if (name === 'createProject') {
    const v = validateCreateArgs(args)
    if (v.ok) draft = { op: 'createProject', args: v.value }
  }
  const { url } = await createClaim(deps.db, { phone: deps.phone, draft, now, baseUrl: deps.baseUrl })
  return {
    kind: 'project',
    op: 'needs_signup',
    data: { url, gecerlilikDakika: CLAIM_TTL_MS / 60_000, taslakKaydedildi: draft !== null },
  }
}

export async function dispatchProjectTool(name: ProjectToolName, args: unknown, deps: ProjectToolDeps): Promise<ProjectCard> {
  const now = deps.now()
  const user = await deps.db.user.findUnique({ where: { whatsappPhone: deps.phone }, select: { id: true } })
  if (!user) return needsSignup(name, args, deps, now)
  const userId = user.id
  const o = obj(args)

  switch (name) {
    case 'findProjects': {
      const range = parseDateRange({ dateFrom: o.dateFrom, dateTo: o.dateTo })
      if (!range.ok) return { kind: 'project', op: 'failed', data: { alan: range.field, neden: range.reason } }
      const { candidates, more } = await findProjects(deps.db, {
        userId,
        range: range.range,
        nameLike: typeof o.nameLike === 'string' ? o.nameLike : undefined,
        mahalle: typeof o.mahalle === 'string' ? o.mahalle : undefined,
        ada: typeof o.ada === 'string' ? o.ada : undefined,
        parsel: typeof o.parsel === 'string' ? o.parsel : undefined,
      })
      if (candidates.length === 0) return { kind: 'project', op: 'not_found' }
      if (candidates.length === 1 && !more) {
        const s = await getProjectSummary(deps.db, { userId, projectId: candidates[0].id })
        return s ? summaryCard(s) : { kind: 'project', op: 'not_found' }
      }
      return { kind: 'project', op: 'found', data: { adaylar: candidates.map(listItem), dahaFazlaVar: more } }
    }
    case 'summarizeProject': {
      const s = await getProjectSummary(deps.db, { userId, projectId: String(o.projectId) })
      return s ? summaryCard(s) : { kind: 'project', op: 'not_found' }
    }
    case 'estimateDaireFiyati':
      return runEstimateDaireFiyati(deps.db, { userId, projectId: String(o.projectId) })
    case 'calculateProject':
      return runCalculateProject(deps.db, { userId, projectId: String(o.projectId) }, now)
    case 'createProject': {
      const v = validateCreateArgs(args)
      if (!v.ok) return { kind: 'project', op: 'failed', data: { alan: v.field, neden: v.reason } }
      const card = await createProject(deps.db, { ...v.value, userId, channel: 'whatsapp' }, now)
      return {
        kind: 'project',
        op: 'created',
        data: { projectId: card.id, ad: card.name, olusturma: istanbulDateString(now), girdiler: v.value.inputs },
      }
    }
    case 'updateProject': {
      const inputs = validateInputs(o.changes)
      if (!inputs.ok) return { kind: 'project', op: 'failed', data: { alan: inputs.field, neden: inputs.reason } }
      const nameArg = typeof o.name === 'string' && cleanText(o.name) ? cleanText(o.name) : undefined
      const r = await updateProject(
        deps.db,
        { userId, projectId: String(o.projectId), changes: inputs.inputs, name: nameArg, channel: 'whatsapp' },
        now,
      )
      if (!r.ok) return { kind: 'project', op: 'not_found' }
      return {
        kind: 'project',
        op: 'updated',
        data: {
          projectId: String(o.projectId),
          degisiklikler: r.changes.map((c) => ({ alan: c.field, eski: c.oldValue ?? null, yeni: c.newValue })),
          adDegisti: r.nameChanged,
          degisiklikYok: r.changes.length === 0 && !r.nameChanged,
        },
      }
    }
    case 'rememberFact': {
      const p = validateParcelRef(args)
      const f = validateFact(args)
      if (!p.ok) return { kind: 'project', op: 'failed', data: { alan: p.field, neden: p.reason } }
      if (!f.ok) return { kind: 'project', op: 'failed', data: { alan: f.field, neden: f.reason } }
      const changed = await deps.db.$transaction(async (tx) => {
        const { id } = await upsertParsel(tx, userId, p.parcel)
        return (await recordFact(tx, id, f.fact, now)).changed
      })
      return {
        kind: 'project',
        op: 'fact_saved',
        data: { parsel: parcelText(p.parcel), olgu: f.fact.key, degisti: changed },
      }
    }
  }
}
