// Akif-2-Aksiyon — commit + undo. İki giriş (buton POST + sesli tool) tek fonksiyona iner.
import type { SaveScenarioPayload } from '../gateway/prepareScenarioSave'
import type { checkPlanLimit as CheckPlanLimit } from '@/lib/plan'

export interface PendingRow {
  id: string
  userId: string
  sessionId: string
  kind: string
  payload: unknown
  createdAt: Date
  consumedAt: Date | null
  undoToken?: string | null
  undoUntil?: Date | null
  createdScenarioId?: string | null
  createdProjectId?: string | null
}

export interface PendingActionDb {
  akifPendingAction: {
    findUnique(a: { where: { id: string } }): Promise<PendingRow | null>
    findFirst?(a: { where: { undoToken: string } }): Promise<PendingRow | null>
    update(a: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>
  }
  project: {
    findFirst(a: { where: { id: string; userId: string } }): Promise<{ id: string } | null>
    create(a: { data: Record<string, unknown> }): Promise<{ id: string; name: string; scenarios: { id: string }[] }>
  }
  scenario: {
    create(a: { data: Record<string, unknown> }): Promise<{ id: string }>
    deleteMany?(a: { where: Record<string, unknown> }): Promise<{ count: number }>
    count?(a: { where: Record<string, unknown> }): Promise<number>
  }
}

const STALE_MS = 5 * 60 * 1000
const UNDO_MS = 30 * 1000

export type CommitResult =
  | { ok: true; scenarioId: string; projectId: string; projectName: string; undoToken: string; undoUntil: string }
  | { ok: false; reason: 'unknown' | 'forbidden' | 'already_consumed' | 'expired' | 'plan_limit' | 'needs_project_name'; message: string }

const MSG: Record<Exclude<CommitResult, { ok: true }>['reason'], string> = {
  unknown: 'İşlem bulunamadı, tekrar söyle.',
  forbidden: 'Bu işlemi yapamıyorum.',
  already_consumed: 'Bu zaten kaydedildi.',
  expired: 'Süre doldu, tekrar söyle.',
  plan_limit: 'Bu ayki senaryo hakkın dolmuş.',
  needs_project_name: 'Proje için bir ad söyle.',
}

function toScenarioData(p: SaveScenarioPayload, name: string) {
  const f = p.scenarioFields
  return {
    name,
    luxLevel: f.luxLevel,
    apartmentSize: f.apartmentSize,
    landShareRatio: f.landShareRatio,
    totalApartments: f.totalApartments,
    arsaAlani: f.arsaAlani,
    riskLevel: f.riskLevel,
    builderProfit: f.builderProfit,
    iksaMode: f.iksaMode,
    iksaPercentage: f.iksaPercentage,
    iksaManualTL: f.iksaManualTL,
    marketPrice: f.marketPrice,
    fdTotal: f.fdTotal,
    fdPerM2: f.fdPerM2,
    mi: f.mi,
    ma: f.ma,
    totalCost: f.totalCost,
    fa: f.fa,
    fabirim: f.fabirim,
    sdx: f.sdx,
  }
}

export async function commitPendingAction(
  db: PendingActionDb,
  input: {
    pendingActionId: string
    userId: string
    sessionId: string
    overrides?: { projectId?: string; projectName?: string; scenarioName?: string }
  },
  planDep: { checkPlanLimit: typeof CheckPlanLimit },
): Promise<CommitResult> {
  const row = await db.akifPendingAction.findUnique({ where: { id: input.pendingActionId } })
  if (!row) return { ok: false, reason: 'unknown', message: MSG.unknown }
  if (row.userId !== input.userId || row.sessionId !== input.sessionId) {
    return { ok: false, reason: 'forbidden', message: MSG.forbidden }
  }
  if (row.consumedAt) return { ok: false, reason: 'already_consumed', message: MSG.already_consumed }
  if (Date.now() - new Date(row.createdAt).getTime() > STALE_MS) {
    return { ok: false, reason: 'expired', message: MSG.expired }
  }

  const limit = await planDep.checkPlanLimit(input.userId, 'scenarios')
  if (!limit.allowed) return { ok: false, reason: 'plan_limit', message: limit.reason ?? MSG.plan_limit }

  const payload = row.payload as SaveScenarioPayload
  const scenarioName = (input.overrides?.scenarioName?.trim() || payload.scenarioName).slice(0, 120)
  const scenarioData = toScenarioData(payload, scenarioName)

  // Proje çöz.
  const overrideName = input.overrides?.projectName?.trim()
  const payloadNewName = 'newName' in payload.projectRef ? payload.projectRef.newName : null
  const newName = overrideName || payloadNewName || null

  let projectId: string
  let projectName: string
  let createdProjectId: string | null = null
  let createdScenarioId: string

  if (input.overrides?.projectId) {
    const owned = await db.project.findFirst({ where: { id: input.overrides.projectId, userId: input.userId } })
    if (!owned) return { ok: false, reason: 'forbidden', message: MSG.forbidden }
    projectId = owned.id
    projectName = ''
    createdScenarioId = (await db.scenario.create({ data: { ...scenarioData, projectId } })).id
  } else if ('existingId' in payload.projectRef) {
    const owned = await db.project.findFirst({ where: { id: payload.projectRef.existingId, userId: input.userId } })
    if (!owned) return { ok: false, reason: 'forbidden', message: MSG.forbidden }
    projectId = owned.id
    projectName = ''
    createdScenarioId = (await db.scenario.create({ data: { ...scenarioData, projectId } })).id
  } else {
    if (!newName) return { ok: false, reason: 'needs_project_name', message: MSG.needs_project_name }
    const proj = await db.project.create({
      data: { name: newName, userId: input.userId, scenarios: { create: scenarioData } },
    })
    projectId = proj.id
    projectName = proj.name
    createdProjectId = proj.id
    createdScenarioId = proj.scenarios[0].id
  }

  const undoToken = crypto.randomUUID()
  const undoUntil = new Date(Date.now() + UNDO_MS)
  await db.akifPendingAction.update({
    where: { id: row.id },
    data: { consumedAt: new Date(), undoToken, undoUntil, createdScenarioId, createdProjectId },
  })

  return { ok: true, scenarioId: createdScenarioId, projectId, projectName, undoToken, undoUntil: undoUntil.toISOString() }
}
