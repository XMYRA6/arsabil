import type { PrismaClient } from '@prisma/client'
import { createProject, updateProject, findProjects, getProjectSummary } from '../projeKarti'

const NOW = new Date('2026-10-15T12:00:00Z')
const REF = { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' }

function makeDb() {
  const tx = {
    parselDosyasi: { upsert: jest.fn().mockResolvedValue({ id: 'pd1' }), update: jest.fn().mockResolvedValue({}) },
    parselOlgu: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    projeKarti: {
      create: jest.fn().mockResolvedValue({ id: 'pk1', name: 'Maçka' }),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    projeRevizyon: { createMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
  }
  const db = {
    ...tx,
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  }
  return { db: db as unknown as PrismaClient, tx }
}

describe('createProject', () => {
  it('parseli upsert eder, olguları kaydeder, kartı ve ilk girdi revizyonlarını yazar', async () => {
    const { db, tx } = makeDb()
    const r = await createProject(
      db,
      {
        userId: 'u1',
        name: 'Maçka',
        parcels: [{ ...REF, facts: [{ key: 'emsal', value: 1.5, source: 'kullanici' }] }],
        inputs: { arsaSahibiPayiYuzde: 40, arsaAlani: 850 },
        channel: 'whatsapp',
      },
      NOW,
    )
    expect(r).toEqual({ id: 'pk1', name: 'Maçka' })
    expect(tx.parselOlgu.create).toHaveBeenCalledTimes(1)
    expect(tx.projeKarti.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        name: 'Maçka',
        inputs: { arsaSahibiPayiYuzde: 40, arsaAlani: 850 },
        parseller: { create: [{ parselDosyasiId: 'pd1' }] },
      },
      select: { id: true, name: true },
    })
    // INPUT_KEYS sırası: arsaAlani önce
    expect(tx.projeRevizyon.createMany).toHaveBeenCalledWith({
      data: [
        { projeKartiId: 'pk1', field: 'arsaAlani', newValue: 850, changedAt: NOW, channel: 'whatsapp', note: 'ilk girdi' },
        { projeKartiId: 'pk1', field: 'arsaSahibiPayiYuzde', newValue: 40, changedAt: NOW, channel: 'whatsapp', note: 'ilk girdi' },
      ],
    })
  })

  it('girdi yoksa revizyon yazılmaz; aynı parsel iki kez verilse tek bağ kurulur', async () => {
    const { db, tx } = makeDb()
    await createProject(db, { userId: 'u1', parcels: [REF, REF], inputs: {}, channel: 'whatsapp' }, NOW)
    expect(tx.projeRevizyon.createMany).not.toHaveBeenCalled()
    expect(tx.projeKarti.create.mock.calls[0][0].data.parseller).toEqual({ create: [{ parselDosyasiId: 'pd1' }] })
    expect(tx.projeKarti.create.mock.calls[0][0].data.name).toBeNull()
  })
})

describe('updateProject', () => {
  const card = { id: 'pk1', name: 'Maçka', inputs: { arsaAlani: 850, arsaSahibiPayiYuzde: 40 } }

  it('sahibi olmayan veya var olmayan proje → not_found (Review Focus 1)', async () => {
    const { db, tx } = makeDb()
    const r = await updateProject(db, { userId: 'baskasi', projectId: 'pk1', changes: { emsal: 1.5 }, channel: 'whatsapp' }, NOW)
    expect(r).toEqual({ ok: false, reason: 'not_found' })
    expect(tx.projeKarti.findFirst).toHaveBeenCalledWith({
      where: { id: 'pk1', userId: 'baskasi' },
      select: { id: true, name: true, inputs: true },
    })
    expect(tx.projeKarti.update).not.toHaveBeenCalled()
  })

  it('değişen alanlar için revizyon yazar ve girdileri birleştirir', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findFirst.mockResolvedValue(card)
    const r = await updateProject(
      db,
      { userId: 'u1', projectId: 'pk1', changes: { arsaSahibiPayiYuzde: 50, arsaAlani: 850 }, channel: 'whatsapp' },
      NOW,
    )
    expect(r).toEqual({
      ok: true,
      changes: [{ field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50 }],
      nameChanged: false,
    })
    expect(tx.projeKarti.update).toHaveBeenCalledWith({
      where: { id: 'pk1' },
      data: { inputs: { arsaAlani: 850, arsaSahibiPayiYuzde: 50 } },
    })
    expect(tx.projeRevizyon.createMany).toHaveBeenCalledWith({
      data: [
        { projeKartiId: 'pk1', field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50, changedAt: NOW, channel: 'whatsapp', note: null },
      ],
    })
  })

  it('değişiklik yoksa sessiz no-op (Review Focus 5)', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findFirst.mockResolvedValue(card)
    const r = await updateProject(db, { userId: 'u1', projectId: 'pk1', changes: { arsaAlani: 850 }, channel: 'whatsapp' }, NOW)
    expect(r).toEqual({ ok: true, changes: [], nameChanged: false })
    expect(tx.projeKarti.update).not.toHaveBeenCalled()
    expect(tx.projeRevizyon.createMany).not.toHaveBeenCalled()
  })

  it('isim değişimi "name" alanıyla revizyona yazılır', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findFirst.mockResolvedValue(card)
    const r = await updateProject(db, { userId: 'u1', projectId: 'pk1', changes: {}, name: 'Yeni ad', channel: 'whatsapp' }, NOW)
    expect(r).toEqual({ ok: true, changes: [], nameChanged: true })
    expect(tx.projeKarti.update).toHaveBeenCalledWith({
      where: { id: 'pk1' },
      data: { inputs: card.inputs, name: 'Yeni ad' },
    })
    expect(tx.projeRevizyon.createMany.mock.calls[0][0].data[0]).toMatchObject({ field: 'name', oldValue: 'Maçka', newValue: 'Yeni ad' })
  })
})

describe('findProjects', () => {
  const row = (id: string) => ({
    id,
    name: null,
    createdAt: NOW,
    updatedAt: NOW,
    parseller: [{ parselDosyasi: REF }],
  })

  it('her zaman userId ile süzer; tarih aralığı createdAt VEYA revizyon tarihi olarak uygulanır (Review Focus 3)', async () => {
    const { db, tx } = makeDb()
    const range = { from: new Date('2026-10-14T21:00:00Z'), toExclusive: new Date('2026-10-15T21:00:00Z') }
    await findProjects(db, { userId: 'u1', range })
    const arg = tx.projeKarti.findMany.mock.calls[0][0]
    expect(arg.where.userId).toBe('u1')
    expect(arg.where.AND).toEqual([
      {
        OR: [
          { createdAt: { gte: range.from, lt: range.toExclusive } },
          { revizyonlar: { some: { changedAt: { gte: range.from, lt: range.toExclusive } } } },
        ],
      },
    ])
    expect(arg.take).toBe(6)
  })

  it('ad, ada/parsel ve mahalle filtreleri eklenir (mahalle normalize)', async () => {
    const { db, tx } = makeDb()
    await findProjects(db, { userId: 'u1', nameLike: 'maçka', ada: '123', parsel: '45', mahalle: 'Uğurlu' })
    const and = tx.projeKarti.findMany.mock.calls[0][0].where.AND
    expect(and).toContainEqual({ name: { contains: 'maçka', mode: 'insensitive' } })
    expect(and).toContainEqual({
      parseller: { some: { parselDosyasi: { ada: '123', parsel: '45', mahalle: { contains: 'UĞURLU' } } } },
    })
  })

  it('6 sonuçtan 5\'i döner ve more=true', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findMany.mockResolvedValue(['a', 'b', 'c', 'd', 'e', 'f'].map(row))
    const r = await findProjects(db, { userId: 'u1' })
    expect(r.candidates).toHaveLength(5)
    expect(r.more).toBe(true)
    expect(r.candidates[0].parcels).toEqual([REF])
  })
})

describe('getProjectSummary', () => {
  it('başkasının/olmayan proje → null (Review Focus 1)', async () => {
    const { db, tx } = makeDb()
    expect(await getProjectSummary(db, { userId: 'x', projectId: 'pk1' })).toBeNull()
    expect(tx.projeKarti.findFirst.mock.calls[0][0].where).toEqual({ id: 'pk1', userId: 'x' })
  })

  it('revizyonlar en yeni → en eski; 51. satır truncated işareti', async () => {
    const { db, tx } = makeDb()
    tx.projeKarti.findFirst.mockResolvedValue({
      id: 'pk1',
      name: 'Maçka',
      inputs: { arsaAlani: 900 },
      createdAt: NOW,
      updatedAt: NOW,
      parseller: [{ parselDosyasi: REF }],
    })
    const revs = Array.from({ length: 51 }, (_, i) => ({
      field: 'arsaAlani',
      oldValue: i,
      newValue: i + 1,
      changedAt: new Date(NOW.getTime() - i * 1000),
      channel: 'whatsapp',
    }))
    tx.projeRevizyon.findMany.mockResolvedValue(revs)
    const s = await getProjectSummary(db, { userId: 'u1', projectId: 'pk1' })
    expect(tx.projeRevizyon.findMany).toHaveBeenCalledWith({
      where: { projeKartiId: 'pk1' },
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
      take: 51,
      select: { field: true, oldValue: true, newValue: true, changedAt: true, channel: true },
    })
    expect(s?.revisions).toHaveLength(50)
    expect(s?.truncated).toBe(true)
    expect(s?.inputs).toEqual({ arsaAlani: 900 })
  })
})
