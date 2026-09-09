import { createVoiceAuditLogger } from '../voiceAudit'

function makeDb() {
  const sessionCreate = jest.fn().mockResolvedValue({})
  const turnCreate = jest.fn().mockResolvedValue({})
  const sessionAggregate = jest.fn().mockResolvedValue({ _sum: { durationSec: 900, estCostUsd: 4.2 } })
  return {
    db: {
      akifVoiceSessionLog: { create: sessionCreate, aggregate: sessionAggregate, findFirst: jest.fn() },
      akifVoiceTurnLog: { create: turnCreate },
    },
    sessionCreate,
    turnCreate,
    sessionAggregate,
  }
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('createVoiceAuditLogger', () => {
  it('logVoiceTurn tur satırı yazar', async () => {
    const { db, turnCreate } = makeDb()
    await createVoiceAuditLogger(db as never).logVoiceTurn({
      sessionId: 's1', tool: 'compareContractorOffers', intent: null, estCostUsd: 0,
    })
    expect(turnCreate).toHaveBeenCalledWith({
      data: { sessionId: 's1', tool: 'compareContractorOffers', intent: null, estCostUsd: 0 },
    })
  })

  it('logVoiceSession id=sessionId ile yazar', async () => {
    const { db, sessionCreate } = makeDb()
    const started = new Date('2026-09-09T10:00:00Z')
    await createVoiceAuditLogger(db as never).logVoiceSession({
      sessionId: 'sess-1', userId: 'u1', startedAt: started,
      durationSec: 120, toolCalls: 2, estCostUsd: 0.3, endReason: 'user_ended',
    })
    expect(sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 'sess-1', userId: 'u1', durationSec: 120, endReason: 'user_ended' }),
    })
  })

  it('logVoiceSession unique çakışmasını yutar (idempotent)', async () => {
    const { db } = makeDb()
    db.akifVoiceSessionLog.create = jest.fn().mockRejectedValue({ code: 'P2002' })
    await expect(
      createVoiceAuditLogger(db as never).logVoiceSession({
        sessionId: 'sess-1', userId: 'u1', startedAt: new Date(),
        durationSec: 1, toolCalls: 0, estCostUsd: 0, endReason: 'timeout',
      }),
    ).resolves.toBeUndefined()
  })

  it('voiceMonthSpendUsd ay başından toplar', async () => {
    const { db, sessionAggregate } = makeDb()
    const spend = await createVoiceAuditLogger(db as never).voiceMonthSpendUsd(new Date('2026-09-20T00:00:00Z'))
    expect(spend).toBe(4.2)
    const arg = sessionAggregate.mock.calls[0][0]
    expect(arg.where.startedAt.gte).toEqual(new Date(Date.UTC(2026, 8, 1)))
  })

  it('voiceUserMonthSeconds kullanıcı + ay filtreler', async () => {
    const { db, sessionAggregate } = makeDb()
    const sec = await createVoiceAuditLogger(db as never).voiceUserMonthSeconds('u1', new Date('2026-09-20T00:00:00Z'))
    expect(sec).toBe(900)
    const arg = sessionAggregate.mock.calls[0][0]
    expect(arg.where.userId).toBe('u1')
  })

  it('create hatası logVoiceTurn i düşürmez', async () => {
    const { db } = makeDb()
    db.akifVoiceTurnLog.create = jest.fn().mockRejectedValue(new Error('db down'))
    await expect(
      createVoiceAuditLogger(db as never).logVoiceTurn({ sessionId: 's', tool: null, intent: null, estCostUsd: 0 }),
    ).resolves.toBeUndefined()
  })
})
