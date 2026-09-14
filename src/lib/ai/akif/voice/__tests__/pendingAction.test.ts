import { commitPendingAction } from '../pendingAction'

const fields = {
  luxLevel: 1.2, apartmentSize: 100, landShareRatio: 0.55, totalApartments: 20, arsaAlani: 2000,
  riskLevel: 0, builderProfit: 1.3, iksaMode: 'off', iksaPercentage: 0, iksaManualTL: 0, marketPrice: 0,
  fdTotal: 5000000, fdPerM2: 50000, mi: 2000000, ma: 800000, totalCost: 2800000, fa: 900000, fabirim: 450, sdx: 9,
}
const display = { arsaPayiPct: 45, sahibineDaire: 9, sahibineTL: 900000, toplamMaliyet: 2800000, satisFiyati: 5000000 }
const payload = { projectRef: { existingId: 'p1' }, scenarioName: 'Akif — Müteahhit %45', scenarioFields: fields, display }

function row(over: Partial<Record<string, unknown>> = {}) {
  return { id: 'pa_1', userId: 'u1', sessionId: 's1', kind: 'save_scenario', payload, createdAt: new Date(), consumedAt: null, ...over }
}
function makeDb(r: unknown) {
  return {
    akifPendingAction: { findUnique: jest.fn().mockResolvedValue(r), update: jest.fn().mockResolvedValue({}) },
    project: {
      findFirst: jest.fn().mockResolvedValue({ id: 'p1' }),
      create: jest.fn().mockResolvedValue({ id: 'pNew', name: 'Yeni', scenarios: [{ id: 'sc_new' }] }),
    },
    scenario: { create: jest.fn().mockResolvedValue({ id: 'sc_1' }) },
  } as never
}
const okPlan = { checkPlanLimit: jest.fn().mockResolvedValue({ allowed: true, current: 0, limit: 3 }) }
const inp = (o = {}) => ({ pendingActionId: 'pa_1', userId: 'u1', sessionId: 's1', ...o })

it('happy: existing project → scenario.create + consumed + undoToken', async () => {
  const db = makeDb(row())
  const r = await commitPendingAction(db, inp(), okPlan)
  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(r.scenarioId).toBe('sc_1')
  expect(r.projectId).toBe('p1')
  expect(db.scenario.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ projectId: 'p1', name: 'Akif — Müteahhit %45', fdTotal: 5000000, landShareRatio: 0.55 }) }),
  )
  const upd = db.akifPendingAction.update.mock.calls[0][0].data
  expect(upd.consumedAt).toBeInstanceOf(Date)
  expect(typeof upd.undoToken).toBe('string')
  expect(upd.createdScenarioId).toBe('sc_1')
  expect(upd.createdProjectId).toBeNull()
})

it('happy: new project (newName) → nested project.create, createdProjectId set', async () => {
  const db = makeDb(row({ payload: { ...payload, projectRef: { newName: 'Yeni Proje' } } }))
  const r = await commitPendingAction(db, inp(), okPlan)
  if (!r.ok) throw new Error(r.reason)
  expect(db.project.create).toHaveBeenCalled()
  expect(db.scenario.create).not.toHaveBeenCalled()
  const upd = db.akifPendingAction.update.mock.calls[0][0].data
  expect(upd.createdProjectId).toBe('pNew')
  expect(upd.createdScenarioId).toBe('sc_new')
})

it('override projectId wins, verified for ownership', async () => {
  const db = makeDb(row({ payload: { ...payload, projectRef: { newName: null } } }))
  db.project.findFirst = jest.fn().mockResolvedValue({ id: 'p9' })
  const r = await commitPendingAction(db, inp({ overrides: { projectId: 'p9' } }), okPlan)
  if (!r.ok) throw new Error(r.reason)
  expect(db.project.findFirst).toHaveBeenCalledWith({ where: { id: 'p9', userId: 'u1' } })
  expect(db.scenario.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ projectId: 'p9' }) }))
})

it('newName null and no override → needs_project_name', async () => {
  const db = makeDb(row({ payload: { ...payload, projectRef: { newName: null } } }))
  const r = await commitPendingAction(db, inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'needs_project_name' })
})

it('not found → unknown', async () => {
  const r = await commitPendingAction(makeDb(null), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'unknown' })
})
it('wrong user → forbidden', async () => {
  const r = await commitPendingAction(makeDb(row({ userId: 'other' })), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'forbidden' })
})
it('wrong session → forbidden', async () => {
  const r = await commitPendingAction(makeDb(row({ sessionId: 'other' })), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'forbidden' })
})
it('already consumed → already_consumed', async () => {
  const r = await commitPendingAction(makeDb(row({ consumedAt: new Date() })), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'already_consumed' })
})
it('older than 5 min → expired', async () => {
  const r = await commitPendingAction(makeDb(row({ createdAt: new Date(Date.now() - 6 * 60 * 1000) })), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'expired' })
})
it('plan limit re-check fails → plan_limit, no write', async () => {
  const db = makeDb(row())
  const plan = { checkPlanLimit: jest.fn().mockResolvedValue({ allowed: false, reason: 'dolu', current: 3, limit: 3 }) }
  const r = await commitPendingAction(db, inp(), plan)
  expect(r).toMatchObject({ ok: false, reason: 'plan_limit' })
  expect(db.scenario.create).not.toHaveBeenCalled()
})
