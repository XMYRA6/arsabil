import type { PrismaClient } from '@prisma/client'
import { createClaim, consumeClaim, hashToken, CLAIM_TTL_MS } from '../claim'

const NOW = new Date('2026-10-15T12:00:00Z')
const PHONE = '905321234567'
const PARCEL = { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '1', parsel: '2' }

function makeDb() {
  const tx = {
    phoneClaim: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    // createProjectTx bağımlılıkları
    parselDosyasi: { upsert: jest.fn().mockResolvedValue({ id: 'pd1' }), update: jest.fn() },
    parselOlgu: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn(), create: jest.fn() },
    projeKarti: { create: jest.fn().mockResolvedValue({ id: 'pk1', name: 'Maçka' }) },
    projeRevizyon: { createMany: jest.fn() },
  }
  const db = { ...tx, $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) }
  return { db: db as unknown as PrismaClient, tx }
}

const claimRow = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  phone: PHONE,
  tokenHash: 'h',
  draft: null,
  expiresAt: new Date(NOW.getTime() + 60_000),
  usedAt: null,
  ...over,
})

describe('createClaim', () => {
  it('token\'ı yalnız hash olarak saklar ve 15 dk geçerli URL döner', async () => {
    const { db, tx } = makeDb()
    const r = await createClaim(db, { phone: PHONE, now: NOW, baseUrl: 'https://www.arsabil.com/', token: 'TOKEN123' })
    expect(r.url).toBe('https://www.arsabil.com/akif/baglan?t=TOKEN123')
    expect(r.expiresAt).toEqual(new Date(NOW.getTime() + CLAIM_TTL_MS))
    const data = tx.phoneClaim.create.mock.calls[0][0].data
    expect(data.tokenHash).toBe(hashToken('TOKEN123'))
    expect(JSON.stringify(data)).not.toContain('TOKEN123')
    expect(data.phone).toBe(PHONE)
  })

  it('token verilmezse rastgele üretir (iki çağrı farklı)', async () => {
    const { db } = makeDb()
    const a = await createClaim(db, { phone: PHONE, now: NOW, baseUrl: 'https://x.test' })
    const b = await createClaim(db, { phone: PHONE, now: NOW, baseUrl: 'https://x.test' })
    expect(a.url).not.toBe(b.url)
  })

  it('taslak JSON olarak kaydedilir', async () => {
    const { db, tx } = makeDb()
    const draft = { op: 'createProject' as const, args: { name: 'Maçka', parcels: [PARCEL], inputs: {} } }
    await createClaim(db, { phone: PHONE, draft, now: NOW, baseUrl: 'https://x.test', token: 't' })
    expect(tx.phoneClaim.create.mock.calls[0][0].data.draft).toEqual(draft)
  })
})

describe('consumeClaim', () => {
  const base = { token: 'TOKEN123', userId: 'u1', now: NOW }

  it('bilinmeyen token → invalid (Review Focus 6)', async () => {
    const { db } = makeDb()
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('kullanılmış → used; süresi dolmuş → expired', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow({ usedAt: new Date() }))
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'used' })
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow({ expiresAt: new Date(NOW.getTime() - 1) }))
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'expired' })
  })

  it('telefon başka hesaba bağlıysa phone_taken; hesap başka telefona bağlıysa user_has_other_phone', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow())
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : { id: 'baska' },
    )
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'phone_taken' })

    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: '905000000000' } : null,
    )
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'user_has_other_phone' })
    expect(tx.user.update).not.toHaveBeenCalled()
  })

  it('başarılı: token tüketilir, telefon bağlanır, taslak yoksa saved yok', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow())
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    const r = await consumeClaim(db, base)
    expect(r).toEqual({ ok: true, phone: PHONE, saved: undefined })
    expect(tx.phoneClaim.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', usedAt: null },
      data: { usedAt: NOW, userId: 'u1' },
    })
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { whatsappPhone: PHONE } })
  })

  it('eşzamanlı çift tüketim: updateMany count 0 → used, bağlama yapılmaz', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow())
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    tx.phoneClaim.updateMany.mockResolvedValue({ count: 0 })
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'used' })
    expect(tx.user.update).not.toHaveBeenCalled()
  })

  it('geçerli taslak varsa proje kaydedilir', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(
      claimRow({ draft: { op: 'createProject', args: { name: 'Maçka', parcels: [PARCEL], inputs: { arsaAlani: 850 } } } }),
    )
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    const r = await consumeClaim(db, base)
    expect(r).toEqual({ ok: true, phone: PHONE, saved: { projectId: 'pk1', name: 'Maçka' } })
    expect(tx.projeKarti.create.mock.calls[0][0].data.userId).toBe('u1')
  })

  it('bozuk taslak bağlamayı engellemez, saved yok (Review Focus 6)', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow({ draft: { op: 'createProject', args: { parcels: [] } } }))
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    const r = await consumeClaim(db, base)
    expect(r).toEqual({ ok: true, phone: PHONE, saved: undefined })
    expect(tx.projeKarti.create).not.toHaveBeenCalled()
  })

  it('benzersiz ihlali (P2002) phone_taken olarak raporlanır', async () => {
    const { db, tx } = makeDb()
    tx.phoneClaim.findUnique.mockResolvedValue(claimRow())
    tx.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.id ? { whatsappPhone: null } : null,
    )
    tx.user.update.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }))
    expect(await consumeClaim(db, base)).toEqual({ ok: false, reason: 'phone_taken' })
  })
})
