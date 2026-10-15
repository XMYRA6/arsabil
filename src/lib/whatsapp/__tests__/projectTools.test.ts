import type { PrismaClient } from '@prisma/client'
import {
  PROJECT_TOOL_DEFS,
  isProjectToolName,
  validateProjectToolArgs,
  dispatchProjectTool,
  type ProjectToolDeps,
} from '../projectTools'

const NOW = new Date('2026-10-15T12:00:00Z')
const PHONE = '905321234567'
const PARCEL = { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45' }

function makeDeps(opts: { linked?: boolean } = {}) {
  const linked = opts.linked ?? true
  const tx = {
    user: { findUnique: jest.fn().mockResolvedValue(linked ? { id: 'u1' } : null) },
    phoneClaim: { create: jest.fn().mockResolvedValue({}) },
    parselDosyasi: { upsert: jest.fn().mockResolvedValue({ id: 'pd1' }), update: jest.fn() },
    parselOlgu: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn(), create: jest.fn() },
    projeKarti: {
      create: jest.fn().mockResolvedValue({ id: 'pk1', name: 'Maçka' }),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    projeRevizyon: { createMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  }
  const db = { ...tx, $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) }
  const deps: ProjectToolDeps = {
    db: db as unknown as PrismaClient,
    phone: PHONE,
    now: () => NOW,
    baseUrl: 'https://www.arsabil.com',
    checkRateLimit: jest.fn().mockReturnValue({ ok: true }),
  }
  return { deps, tx }
}

describe('araç kaydı', () => {
  it('5 araç, isProjectToolName doğru çalışır', () => {
    expect(PROJECT_TOOL_DEFS.map((d) => d.function.name)).toEqual([
      'findProjects',
      'summarizeProject',
      'createProject',
      'updateProject',
      'rememberFact',
    ])
    expect(isProjectToolName('createProject')).toBe(true)
    expect(isProjectToolName('lookupParcel')).toBe(false)
  })
})

describe('validateProjectToolArgs', () => {
  it('findProjects: filtresiz serbest; geçersiz tarih/ters aralık hata', () => {
    expect(validateProjectToolArgs('findProjects', {})).toEqual({ ok: true })
    expect(validateProjectToolArgs('findProjects', { dateFrom: '2026-01-01', dateTo: '2026-01-31' })).toEqual({ ok: true })
    expect(validateProjectToolArgs('findProjects', { dateFrom: '2026-02-30' }).ok).toBe(false)
    expect(validateProjectToolArgs('findProjects', { dateFrom: '2026-03-01', dateTo: '2026-01-01' }).ok).toBe(false)
    expect(validateProjectToolArgs('findProjects', { nameLike: 5 }).ok).toBe(false)
  })

  it('summarizeProject: projectId zorunlu', () => {
    expect(validateProjectToolArgs('summarizeProject', { projectId: 'pk1' })).toEqual({ ok: true })
    expect(validateProjectToolArgs('summarizeProject', {}).ok).toBe(false)
  })

  it('createProject: validateCreateArgs ile aynı kurallar', () => {
    expect(validateProjectToolArgs('createProject', { parcels: [PARCEL] })).toEqual({ ok: true })
    expect(validateProjectToolArgs('createProject', { parcels: [] }).ok).toBe(false)
  })

  it('updateProject: projectId + (changes veya name) zorunlu', () => {
    expect(validateProjectToolArgs('updateProject', { projectId: 'p', changes: { arsaSahibiPayiYuzde: 50 } })).toEqual({ ok: true })
    expect(validateProjectToolArgs('updateProject', { projectId: 'p', name: 'Yeni' })).toEqual({ ok: true })
    expect(validateProjectToolArgs('updateProject', { projectId: 'p' }).ok).toBe(false)
    expect(validateProjectToolArgs('updateProject', { projectId: 'p', changes: { arsaAlani: 1 } }).ok).toBe(false)
  })

  it('rememberFact: parsel alanları + key/value/source', () => {
    expect(validateProjectToolArgs('rememberFact', { ...PARCEL, key: 'emsal', value: 1.5, source: 'kullanici' })).toEqual({ ok: true })
    expect(validateProjectToolArgs('rememberFact', { ...PARCEL, key: 'emsal', value: 99, source: 'kullanici' }).ok).toBe(false)
    expect(validateProjectToolArgs('rememberFact', { key: 'emsal', value: 1.5, source: 'kullanici' }).ok).toBe(false)
  })
})

describe('dispatchProjectTool — bağlı olmayan telefon', () => {
  it('createProject: taslakla claim üretir, kayıt YAPMAZ', async () => {
    const { deps, tx } = makeDeps({ linked: false })
    const card = await dispatchProjectTool('createProject', { name: 'Maçka', parcels: [PARCEL], inputs: { arsaAlani: 850 } }, deps)
    expect(card.kind).toBe('project')
    expect(card.op).toBe('needs_signup')
    expect(String(card.data?.url)).toMatch(/^https:\/\/www\.arsabil\.com\/akif\/baglan\?t=/)
    expect(card.data?.gecerlilikDakika).toBe(15)
    expect(card.data?.taslakKaydedildi).toBe(true)
    expect(tx.phoneClaim.create.mock.calls[0][0].data.draft).toMatchObject({ op: 'createProject' })
    expect(tx.projeKarti.create).not.toHaveBeenCalled()
  })

  it('diğer araçlar: taslaksız claim', async () => {
    const { deps, tx } = makeDeps({ linked: false })
    const card = await dispatchProjectTool('findProjects', {}, deps)
    expect(card.op).toBe('needs_signup')
    expect(card.data?.taslakKaydedildi).toBe(false)
    expect(tx.phoneClaim.create.mock.calls[0][0].data.draft).toBeUndefined()
  })

  it('claim istekleri saatte 3 ile sınırlı', async () => {
    const { deps, tx } = makeDeps({ linked: false })
    ;(deps.checkRateLimit as jest.Mock).mockReturnValue({ ok: false })
    const card = await dispatchProjectTool('findProjects', {}, deps)
    expect(card.op).toBe('rate_limited')
    expect(tx.phoneClaim.create).not.toHaveBeenCalled()
    expect(deps.checkRateLimit).toHaveBeenCalledWith('wa-claim:' + PHONE, { limit: 3, windowMs: 3_600_000 })
  })
})

describe('dispatchProjectTool — bağlı telefon', () => {
  it('createProject: kartı oluşturur', async () => {
    const { deps, tx } = makeDeps()
    const card = await dispatchProjectTool('createProject', { name: 'Maçka', parcels: [PARCEL], inputs: { arsaAlani: 850 } }, deps)
    expect(card.op).toBe('created')
    expect(card.data).toMatchObject({ projectId: 'pk1', ad: 'Maçka', olusturma: '2026-10-15', girdiler: { arsaAlani: 850 } })
    expect(tx.user.findUnique).toHaveBeenCalledWith({ where: { whatsappPhone: PHONE }, select: { id: true } })
    expect(tx.projeKarti.create.mock.calls[0][0].data.userId).toBe('u1')
  })

  it('updateProject: başka kullanıcının/uydurma id → not_found (Review Focus 1)', async () => {
    const { deps } = makeDeps()
    const card = await dispatchProjectTool('updateProject', { projectId: 'uydurma', changes: { arsaSahibiPayiYuzde: 50 } }, deps)
    expect(card.op).toBe('not_found')
  })

  it('updateProject: değişiklikleri Türkçe alanlarla döner', async () => {
    const { deps, tx } = makeDeps()
    tx.projeKarti.findFirst.mockResolvedValue({ id: 'pk1', name: 'Maçka', inputs: { arsaSahibiPayiYuzde: 40 } })
    const card = await dispatchProjectTool('updateProject', { projectId: 'pk1', changes: { arsaSahibiPayiYuzde: 50 } }, deps)
    expect(card.op).toBe('updated')
    expect(card.data).toMatchObject({
      projectId: 'pk1',
      degisiklikler: [{ alan: 'arsaSahibiPayiYuzde', eski: 40, yeni: 50 }],
    })
    expect(card.data?.degisiklikYok).toBe(false)
  })

  it('findProjects: tek eşleşmede özeti de döner (en yeni → en eski, TR tarihleri)', async () => {
    const { deps, tx } = makeDeps()
    const created = new Date('2026-10-14T21:30:00Z') // TR: 15 Ekim 00:30
    const row = {
      id: 'pk1',
      name: 'Maçka',
      createdAt: created,
      updatedAt: NOW,
      parseller: [{ parselDosyasi: { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' } }],
    }
    tx.projeKarti.findMany.mockResolvedValue([row])
    tx.projeKarti.findFirst.mockResolvedValue({ ...row, inputs: { arsaSahibiPayiYuzde: 50 } })
    tx.projeRevizyon.findMany.mockResolvedValue([
      { field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50, changedAt: NOW, channel: 'whatsapp' },
      { field: 'arsaSahibiPayiYuzde', oldValue: null, newValue: 40, changedAt: created, channel: 'whatsapp' },
    ])
    const card = await dispatchProjectTool('findProjects', { dateFrom: '2026-10-15' }, deps)
    expect(card.op).toBe('summary')
    expect(card.data).toMatchObject({
      projectId: 'pk1',
      olusturma: '2026-10-15',
      guncelGirdiler: { arsaSahibiPayiYuzde: 50 },
      kesildi: false,
    })
    expect((card.data?.degisiklikler as Array<{ tarih: string }>).map((d) => d.tarih)).toEqual(['2026-10-15', '2026-10-15'])
    expect((card.data?.degisiklikler as Array<{ yeni: unknown }>)[0].yeni).toBe(50)
  })

  it('findProjects: birden çok eşleşmede aday listesi, sıfırda not_found', async () => {
    const { deps, tx } = makeDeps()
    const mk = (id: string) => ({ id, name: null, createdAt: NOW, updatedAt: NOW, parseller: [] })
    tx.projeKarti.findMany.mockResolvedValue([mk('a'), mk('b')])
    const many = await dispatchProjectTool('findProjects', {}, deps)
    expect(many.op).toBe('found')
    expect((many.data?.adaylar as unknown[]).length).toBe(2)
    tx.projeKarti.findMany.mockResolvedValue([])
    expect((await dispatchProjectTool('findProjects', {}, deps)).op).toBe('not_found')
  })

  it('summarizeProject: olmayan proje not_found', async () => {
    const { deps } = makeDeps()
    expect((await dispatchProjectTool('summarizeProject', { projectId: 'x' }, deps)).op).toBe('not_found')
  })

  it('rememberFact: olguyu kaydeder ve değişti bilgisini döner', async () => {
    const { deps, tx } = makeDeps()
    const card = await dispatchProjectTool('rememberFact', { ...PARCEL, key: 'emsal', value: 1.5, source: 'kullanici' }, deps)
    expect(card.op).toBe('fact_saved')
    expect(card.data).toMatchObject({ olgu: 'emsal', degisti: true })
    expect(tx.parselOlgu.create).toHaveBeenCalledTimes(1)
  })

  it('rememberFact: aynı değer teyidi degisti=false', async () => {
    const { deps, tx } = makeDeps()
    tx.parselOlgu.findFirst.mockResolvedValue({ id: 'o1', value: 1.5 })
    const card = await dispatchProjectTool('rememberFact', { ...PARCEL, key: 'emsal', value: 1.5, source: 'kullanici' }, deps)
    expect(card.data).toMatchObject({ olgu: 'emsal', degisti: false })
  })
})
