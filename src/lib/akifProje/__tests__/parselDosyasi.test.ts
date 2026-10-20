import { upsertParsel, recordFact, listCurrentFacts, canonicalJson } from '../parselDosyasi'
import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient
const NOW = new Date('2026-10-15T12:00:00Z')

function makeTx(over: Record<string, unknown> = {}) {
  const tx = {
    parselDosyasi: {
      upsert: jest.fn().mockResolvedValue({ id: 'pd1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    parselOlgu: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...over,
  }
  return tx as unknown as Tx & typeof tx
}

describe('canonicalJson', () => {
  it('nesne anahtar sırasından bağımsızdır (jsonb anahtarları yeniden sıralar)', () => {
    expect(canonicalJson({ m2: 150, tl: 7 })).toBe(canonicalJson({ tl: 7, m2: 150 }))
    expect(canonicalJson({ a: { y: 1, x: 2 } })).toBe(canonicalJson({ a: { x: 2, y: 1 } }))
    expect(canonicalJson(1.5)).not.toBe(canonicalJson('1.5'))
  })
})

describe('upsertParsel', () => {
  it('bileşik anahtarla upsert eder ve id döner', async () => {
    const tx = makeTx()
    const ref = { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' }
    const r = await upsertParsel(tx, 'u1', ref)
    expect(r).toEqual({ id: 'pd1' })
    expect(tx.parselDosyasi.upsert).toHaveBeenCalledWith({
      where: { userId_il_ilce_mahalle_ada_parsel: { userId: 'u1', ...ref } },
      create: { userId: 'u1', ...ref },
      update: {},
      select: { id: true },
    })
  })
})

describe('recordFact', () => {
  it('olgu yoksa yeni satır oluşturur ve dosyayı günceller', async () => {
    const tx = makeTx()
    const r = await recordFact(tx, 'pd1', { key: 'emsal', value: 1.5, source: 'kullanici' }, NOW)
    expect(r).toEqual({ changed: true })
    expect(tx.parselOlgu.create).toHaveBeenCalledWith({
      data: { parselDosyasiId: 'pd1', key: 'emsal', value: 1.5, source: 'kullanici', recordedAt: NOW },
    })
    expect(tx.parselOlgu.update).not.toHaveBeenCalled()
    expect(tx.parselDosyasi.update).toHaveBeenCalledWith({ where: { id: 'pd1' }, data: { updatedAt: NOW } })
  })

  it('değer değişirse eskisi supersede edilir, yenisi eklenir (geçmiş silinmez)', async () => {
    const tx = makeTx()
    tx.parselOlgu.findFirst.mockResolvedValue({ id: 'o1', value: 1.0 })
    const r = await recordFact(tx, 'pd1', { key: 'emsal', value: 1.5, source: 'kullanici' }, NOW)
    expect(r).toEqual({ changed: true })
    expect(tx.parselOlgu.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { supersededAt: NOW } })
    expect(tx.parselOlgu.create).toHaveBeenCalledTimes(1)
  })

  it('aynı değer tekrar teyit edilirse recordedAt tazelenir, yeni satır YOK (Review Focus 2)', async () => {
    const tx = makeTx()
    tx.parselOlgu.findFirst.mockResolvedValue({ id: 'o1', value: { tl: 7000000, m2: 150 } })
    const r = await recordFact(tx, 'pd1', { key: 'daireFiyati', value: { m2: 150, tl: 7000000 }, source: 'kullanici' }, NOW)
    expect(r).toEqual({ changed: false })
    expect(tx.parselOlgu.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { recordedAt: NOW, source: 'kullanici' },
    })
    expect(tx.parselOlgu.create).not.toHaveBeenCalled()
  })

  it('düşük güvenilirlikli bir teyit, daha yüksek güvenilirlikli mevcut kaynağı EZMEZ (review bulgusu)', async () => {
    const tx = makeTx()
    tx.parselOlgu.findFirst.mockResolvedValue({ id: 'o1', value: 1.5, source: 'tkgm' })
    const r = await recordFact(tx, 'pd1', { key: 'emsal', value: 1.5, source: 'kullanici' }, NOW)
    expect(r).toEqual({ changed: false })
    expect(tx.parselOlgu.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { recordedAt: NOW } })
  })

  it('eşit veya daha yüksek güvenilirlikli teyit kaynağı günceller', async () => {
    const tx = makeTx()
    tx.parselOlgu.findFirst.mockResolvedValue({ id: 'o1', value: 1.5, source: 'ilan' })
    const r = await recordFact(tx, 'pd1', { key: 'emsal', value: 1.5, source: 'tkgm' }, NOW)
    expect(r).toEqual({ changed: false })
    expect(tx.parselOlgu.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { recordedAt: NOW, source: 'tkgm' } })
  })
})

describe('listCurrentFacts', () => {
  it('yalnız supersede edilmemiş satırları FactRow olarak döner', async () => {
    const tx = makeTx()
    const at = new Date('2026-09-01T00:00:00Z')
    tx.parselOlgu.findMany.mockResolvedValue([{ key: 'emsal', value: 1.5, source: 'kullanici', recordedAt: at }])
    const rows = await listCurrentFacts(tx, 'pd1')
    expect(tx.parselOlgu.findMany).toHaveBeenCalledWith({
      where: { parselDosyasiId: 'pd1', supersededAt: null },
      select: { key: true, value: true, source: true, recordedAt: true },
    })
    expect(rows).toEqual([{ key: 'emsal', value: 1.5, source: 'kullanici', recordedAt: at }])
  })
})
