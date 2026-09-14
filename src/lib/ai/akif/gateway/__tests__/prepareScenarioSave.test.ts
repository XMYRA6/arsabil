import { prepareScenarioSave, type PrepareScenarioSaveDb } from '../prepareScenarioSave'

const engineDefaultsRows = {
  globalSettings: { findUnique: async () => null },
  profitLevel: { findFirst: async () => null },
}

function makeDb(over: Partial<Record<string, unknown>> = {}) {
  return {
    ...engineDefaultsRows,
    project: { findMany: jest.fn().mockResolvedValue([]) },
    scenario: { count: jest.fn().mockResolvedValue(0) },
    akifPendingAction: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'pa_1' }),
    },
    ...over,
  } as unknown as PrepareScenarioSaveDb
}

const okPlan = { checkPlanLimit: jest.fn().mockResolvedValue({ allowed: true, current: 0, limit: 3 }) }
const baseArgs = { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45 }
const deps = (db = makeDb(), plan = okPlan) => ({ db, userId: 'u1', sessionId: 's1', plan })

it('0 projects, no projectName → newName:null, writes one pending row', async () => {
  const db = makeDb()
  const r = await prepareScenarioSave(baseArgs, deps(db))
  expect(r.kind).toBe('pending_action')
  if (r.kind !== 'pending_action') return
  expect(r.pendingActionId).toBe('pa_1')
  expect(r.confirmCard.projectRef).toEqual({ newName: null })
  expect(r.confirmCard.display.arsaPayiPct).toBeCloseTo(55, 5)
  expect(db.akifPendingAction.create).toHaveBeenCalledTimes(1)
  expect(db.akifPendingAction.deleteMany).toHaveBeenCalled() // stale sweep
})

it('exactly one project + no name → existingId', async () => {
  const db = makeDb({ project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Trabzon' }]) } })
  const r = await prepareScenarioSave(baseArgs, deps(db))
  if (r.kind !== 'pending_action') throw new Error(r.kind)
  expect(r.confirmCard.projectRef).toEqual({ existingId: 'p1' })
})

it('projectName matches one → existingId', async () => {
  const db = makeDb({ project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Trabzon Arsa' }, { id: 'p2', name: 'Rize' }]) } })
  const r = await prepareScenarioSave({ ...baseArgs, projectName: 'trabzon arsa' }, deps(db))
  if (r.kind !== 'pending_action') throw new Error(r.kind)
  expect(r.confirmCard.projectRef).toEqual({ existingId: 'p1' })
})

it('projectName matches none → newName', async () => {
  const db = makeDb({ project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Rize' }]) } })
  const r = await prepareScenarioSave({ ...baseArgs, projectName: 'Yeni Proje' }, deps(db))
  if (r.kind !== 'pending_action') throw new Error(r.kind)
  expect(r.confirmCard.projectRef).toEqual({ newName: 'Yeni Proje' })
})

it('≥2 projects, no name → needs_project_choice with candidates', async () => {
  const db = makeDb({ project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }]) } })
  const r = await prepareScenarioSave(baseArgs, deps(db))
  expect(r.kind).toBe('needs_project_choice')
  if (r.kind !== 'needs_project_choice') return
  expect(r.candidates).toHaveLength(2)
  expect(r.pendingActionId).toBe('pa_1')
})

it('plan limit exceeded → blocked, no pending row', async () => {
  const db = makeDb()
  const plan = { checkPlanLimit: jest.fn().mockResolvedValue({ allowed: false, reason: 'Senaryo hakkın dolmuş', current: 3, limit: 3 }) }
  const r = await prepareScenarioSave(baseArgs, deps(db, plan))
  expect(r.kind).toBe('blocked')
  expect(db.akifPendingAction.create).not.toHaveBeenCalled()
})
