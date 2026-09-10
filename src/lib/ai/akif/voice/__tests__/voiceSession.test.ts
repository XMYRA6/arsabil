import {
  createVoiceSession,
  endStaleCallerSessions,
  checkVoiceSessionOwner,
  resolveResumableSession,
  claimReconnect,
  bumpReconnectCount,
  endVoiceSession,
  STALE_SLACK_SEC,
  type VoiceSessionRow,
} from '../voiceSession'

function makeDb(row: VoiceSessionRow | null) {
  return {
    findUnique: jest.fn().mockResolvedValue(row),
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    updateMany: jest.fn().mockResolvedValue(undefined),
  }
}
const wrap = (m: ReturnType<typeof makeDb>) => ({ akifVoiceSession: m }) as never

const base: VoiceSessionRow = {
  id: 's1',
  userId: 'u1',
  status: 'active',
  reconnectCount: 0,
  createdAt: new Date('2026-09-10T12:00:00Z'),
}
const now = new Date('2026-09-10T12:05:00Z') // 5 min later

it('createVoiceSession → create({data:{id,userId}})', async () => {
  const m = makeDb(null)
  await createVoiceSession(wrap(m), 's1', 'u1')
  expect(m.create).toHaveBeenCalledWith({ data: { id: 's1', userId: 'u1' } })
})

it('endStaleCallerSessions → updateMany with createdAt cutoff', async () => {
  const m = makeDb(null)
  await endStaleCallerSessions(wrap(m), 'u1', now, 600)
  const arg = m.updateMany.mock.calls[0][0]
  expect(arg.where).toMatchObject({ userId: 'u1', status: 'active' })
  const cutoff = arg.where.createdAt.lt as Date
  expect(cutoff.getTime()).toBe(now.getTime() - (600 + STALE_SLACK_SEC) * 1000)
  expect(arg.data).toMatchObject({ status: 'ended' })
})

it('checkVoiceSessionOwner: no row → unknown_session', async () => {
  expect(await checkVoiceSessionOwner(wrap(makeDb(null)), 's1', 'u1')).toEqual({
    ok: false,
    code: 'unknown_session',
  })
})

it('checkVoiceSessionOwner: wrong user → forbidden_session', async () => {
  expect(
    await checkVoiceSessionOwner(wrap(makeDb({ ...base, userId: 'other' })), 's1', 'u1'),
  ).toEqual({ ok: false, code: 'forbidden_session' })
})

it('checkVoiceSessionOwner: active row (even if old — no coercion) → status active', async () => {
  const old = { ...base, createdAt: new Date('2026-09-01T00:00:00Z') }
  expect(await checkVoiceSessionOwner(wrap(makeDb(old)), 's1', 'u1')).toEqual({
    ok: true,
    status: 'active',
  })
})

it('checkVoiceSessionOwner: ended row → status ended', async () => {
  expect(
    await checkVoiceSessionOwner(wrap(makeDb({ ...base, status: 'ended' })), 's1', 'u1'),
  ).toEqual({ ok: true, status: 'ended' })
})

it('resolveResumableSession: happy path → ok', async () => {
  expect(await resolveResumableSession(wrap(makeDb(base)), 's1', 'u1', now, 600)).toEqual({
    ok: true,
  })
})

it('resolveResumableSession: not found / forbidden / not_active / already_reconnected / stale', async () => {
  expect(await resolveResumableSession(wrap(makeDb(null)), 's1', 'u1', now, 600)).toEqual({
    ok: false,
    reason: 'not_found',
  })
  expect(
    await resolveResumableSession(wrap(makeDb({ ...base, userId: 'x' })), 's1', 'u1', now, 600),
  ).toEqual({ ok: false, reason: 'forbidden' })
  expect(
    await resolveResumableSession(wrap(makeDb({ ...base, status: 'ended' })), 's1', 'u1', now, 600),
  ).toEqual({ ok: false, reason: 'not_active' })
  expect(
    await resolveResumableSession(wrap(makeDb({ ...base, reconnectCount: 1 })), 's1', 'u1', now, 600),
  ).toEqual({ ok: false, reason: 'already_reconnected' })
  const stale = { ...base, createdAt: new Date('2026-09-10T11:40:00Z') } // 25 min old, max 600+60s
  expect(await resolveResumableSession(wrap(makeDb(stale)), 's1', 'u1', now, 600)).toEqual({
    ok: false,
    reason: 'stale',
  })
})

it('claimReconnect: ön-kontrol ok + updateMany count 1 → {ok:true}', async () => {
  const m = makeDb(base)
  m.updateMany.mockResolvedValue({ count: 1 })
  expect(await claimReconnect(wrap(m), 's1', 'u1', now, 600)).toEqual({ ok: true })
  expect(m.updateMany).toHaveBeenCalledWith({
    where: { id: 's1', userId: 'u1', status: 'active', reconnectCount: 0 },
    data: { reconnectCount: 1 },
  })
})

it('claimReconnect: ön-kontrol ok ama updateMany count 0 (yarış kaybı) → already_reconnected', async () => {
  const m = makeDb(base)
  m.updateMany.mockResolvedValue({ count: 0 })
  expect(await claimReconnect(wrap(m), 's1', 'u1', now, 600)).toEqual({
    ok: false,
    reason: 'already_reconnected',
  })
})

it('claimReconnect: ön-kontrol reddi propagate edilir, updateMany çağrılmaz', async () => {
  const m = makeDb({ ...base, status: 'ended' })
  expect(await claimReconnect(wrap(m), 's1', 'u1', now, 600)).toEqual({
    ok: false,
    reason: 'not_active',
  })
  expect(m.updateMany).not.toHaveBeenCalled()
})

it('bumpReconnectCount → update increment', async () => {
  const m = makeDb(base)
  await bumpReconnectCount(wrap(m), 's1')
  expect(m.update).toHaveBeenCalledWith({
    where: { id: 's1' },
    data: { reconnectCount: { increment: 1 } },
  })
})

it('endVoiceSession → update status ended + endedAt', async () => {
  const m = makeDb(base)
  await endVoiceSession(wrap(m), 's1', now)
  const arg = m.update.mock.calls[0][0]
  expect(arg.where).toEqual({ id: 's1' })
  expect(arg.data.status).toBe('ended')
  expect((arg.data.endedAt as Date).getTime()).toBe(now.getTime())
})
