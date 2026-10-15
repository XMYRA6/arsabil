import { runEstimateDaireFiyati, runCalculateProject } from '../hesapTools'

const NOW = new Date('2026-10-15T09:00:00Z')
const DAY = 86_400_000

interface Fact {
  key: string
  value: unknown
  source?: string
  recordedAt: Date
}

function project(over: { inputs?: Record<string, unknown>; olgular?: Fact[]; result?: unknown; parseller?: boolean } = {}) {
  const parseller =
    over.parseller === false
      ? []
      : [
          {
            parselDosyasi: {
              il: 'TRABZON',
              ilce: 'AKCAABAT',
              mahalle: 'UĞURLU',
              ada: '101',
              parsel: '5',
              olgular: (over.olgular ?? []).map((o) => ({ source: 'user', ...o })),
            },
          },
        ]
  return { id: 'p1', name: 'Test Proje', inputs: over.inputs ?? {}, result: over.result ?? null, parseller }
}

function makeDb(row: unknown, konutRows: unknown[] = []) {
  const projeKartiUpdate = jest.fn(async () => ({}))
  const projeRevizyonCreate = jest.fn(async () => ({}))
  const findFirst = jest.fn(async () => row)
  const tx = { projeKarti: { update: projeKartiUpdate }, projeRevizyon: { create: projeRevizyonCreate } }
  const db = {
    projeKarti: { findFirst },
    konutFiyatStat: { findMany: jest.fn(async () => konutRows) },
    globalSettings: { findUnique: jest.fn(async () => null) },
    profitLevel: { findFirst: jest.fn(async () => null) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  }
  return { db: db as never, findFirst, projeKartiUpdate, projeRevizyonCreate }
}

const mahalleRow = { scope: 'mahalle', medianPricePerSqm: 46_666.67, sampleCount: 9 }
const fresh = (key: string, value: unknown, ageDays = 1): Fact => ({ key, value, recordedAt: new Date(NOW.getTime() - ageDays * DAY) })
const args = { userId: 'u1', projectId: 'p1' }

describe('runEstimateDaireFiyati', () => {
  it('mahalle satırı ile fiyat tahmini üretir', async () => {
    const { db } = makeDb(project({ inputs: { daireBuyuklugu: 150 } }), [mahalleRow])
    const card = await runEstimateDaireFiyati(db, args)
    expect(card.op).toBe('price_estimate')
    expect(card.data?.tahminiFiyatTL).toBe(7_000_000)
    expect(card.data?.olcek).toBe('mahalle')
    expect(card.data?.guven).toBe('yuksek')
    expect(card.data?.parsel).toEqual({ il: 'TRABZON', ilce: 'AKCAABAT', mahalle: 'UĞURLU', ada: '101', parsel: '5' })
    expect(String(card.data?.not)).toContain('pazarlık')
  })

  it('istatistik yoksa price_unavailable', async () => {
    const { db } = makeDb(project({ inputs: { daireBuyuklugu: 150 } }), [])
    const card = await runEstimateDaireFiyati(db, args)
    expect(card.op).toBe('price_unavailable')
    expect(card.data).not.toHaveProperty('tahminiFiyatTL')
  })

  it('başka kullanıcının/yok proje -> not_found, sorgu userId ile sınırlı', async () => {
    const { db, findFirst } = makeDb(null)
    const card = await runEstimateDaireFiyati(db, args)
    expect(card.op).toBe('not_found')
    const call = findFirst.mock.calls[0] as unknown as [{ where: unknown }]
    expect(call[0].where).toEqual({ id: 'p1', userId: 'u1' })
  })

  it('parselsiz proje -> failed', async () => {
    const { db } = makeDb(project({ parseller: false }), [mahalleRow])
    const card = await runEstimateDaireFiyati(db, args)
    expect(card.op).toBe('failed')
    expect(card.data?.alan).toBe('parsel')
  })

  it('daireBuyuklugu yoksa 100 m² varsayılır', async () => {
    const { db } = makeDb(project(), [mahalleRow])
    const card = await runEstimateDaireFiyati(db, args)
    expect(card.data?.daireM2Varsayilan).toBe(true)
    expect(card.data?.daireM2).toBe(100)
  })
})

describe('runCalculateProject', () => {
  it('imarsız modda hesaplar, result yazar ve revizyon açar', async () => {
    const { db, projeKartiUpdate, projeRevizyonCreate } = makeDb(
      project({ inputs: { daireBuyuklugu: 150 }, olgular: [fresh('daireFiyati', { m2: 150, tl: 7_000_000 })] }),
    )
    const card = await runCalculateProject(db, args, NOW)
    expect(card.op).toBe('calculated')
    expect(card.data?.mod).toBe('imarsiz')
    expect(typeof card.data?.xMaxYuzde).toBe('number')
    expect(projeKartiUpdate).toHaveBeenCalledTimes(1)
    const upd = projeKartiUpdate.mock.calls[0] as unknown as [{ data: { result: { mod: string } } }]
    expect(upd[0].data.result.mod).toBe('imarsiz')
    expect(projeRevizyonCreate).toHaveBeenCalledTimes(1)
    const rev = projeRevizyonCreate.mock.calls[0] as unknown as [{ data: { field: string; channel: string } }]
    expect(rev[0].data.field).toBe('hesap')
    expect(rev[0].data.channel).toBe('whatsapp')
  })

  it('tam modda toplam daire sayısını hesaplar; emsal olgudan da gelebilir', async () => {
    const a = makeDb(project({ inputs: { arsaAlani: 1000, emsal: 1.5, daireBuyuklugu: 100, arsaSahibiPayiYuzde: 40 } }))
    const c1 = await runCalculateProject(a.db, args, NOW)
    expect(c1.data?.mod).toBe('tam')
    expect(c1.data?.toplamDaire).toBe(15)

    const b = makeDb(
      project({
        inputs: { arsaAlani: 1000, daireBuyuklugu: 100, arsaSahibiPayiYuzde: 40 },
        olgular: [fresh('emsal', 1.5)],
      }),
    )
    const c2 = await runCalculateProject(b.db, args, NOW)
    expect(c2.data?.mod).toBe('tam')
    expect(c2.data?.toplamDaire).toBe(15)
  })

  it('fiyat bayatlığı 45 gün eşiğine göre', async () => {
    const mk = (age: number) =>
      makeDb(project({ inputs: { daireBuyuklugu: 150 }, olgular: [fresh('daireFiyati', { m2: 150, tl: 7_000_000 }, age)] }))
    const stale = await runCalculateProject(mk(46).db, args, NOW)
    expect(stale.data?.fiyatBayat).toBe(true)
    expect(stale.data?.fiyatTarihi).toBeTruthy()
    const ok = await runCalculateProject(mk(44).db, args, NOW)
    expect(ok.data?.fiyatBayat).toBe(false)
  })

  it('ne emsal ne fiyat varsa failed ve yazım yok', async () => {
    const { db, projeKartiUpdate, projeRevizyonCreate } = makeDb(project())
    const card = await runCalculateProject(db, args, NOW)
    expect(card.op).toBe('failed')
    expect(card.data?.eksik).toContain('daireFiyati')
    expect(projeKartiUpdate).not.toHaveBeenCalled()
    expect(projeRevizyonCreate).not.toHaveBeenCalled()
  })

  it('aynı hesap tekrarında revizyon açılmaz', async () => {
    const inputs = { daireBuyuklugu: 150 }
    const olgular = [fresh('daireFiyati', { m2: 150, tl: 7_000_000 })]
    const first = makeDb(project({ inputs, olgular }))
    await runCalculateProject(first.db, args, NOW)
    const saved = (first.projeKartiUpdate.mock.calls[0] as unknown as [{ data: { result: unknown } }])[0].data.result

    const second = makeDb(project({ inputs, olgular, result: saved }))
    await runCalculateProject(second.db, args, NOW)
    expect(second.projeKartiUpdate).toHaveBeenCalledTimes(1)
    expect(second.projeRevizyonCreate).not.toHaveBeenCalled()
  })

  it('yapılamaz senaryosu', async () => {
    const { db } = makeDb(
      project({
        inputs: { daireBuyuklugu: 150, birimMaliyet: 60_000 },
        olgular: [fresh('daireFiyati', { m2: 150, tl: 7_000_000 })],
      }),
    )
    const card = await runCalculateProject(db, args, NOW)
    expect(card.data?.yapilamaz).toBe(true)
    expect(card.data?.xMaxYuzde).toBeNull()
  })
})
