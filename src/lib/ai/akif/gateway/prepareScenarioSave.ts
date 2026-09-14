// Akif-2-Aksiyon — "senaryo kaydet" HAZIRLIK adımı. YAZMAZ (tek AkifPendingAction hariç).
import { resolveEngineDefaults, type EngineDefaultsDb } from './engineDefaults'
import { computeFullScenario, type ScenarioFields, type ScenarioDisplay } from './scenarioEngine'
import type { checkPlanLimit as CheckPlanLimit } from '@/lib/plan'

export interface PrepareScenarioSaveArgs {
  arsaAlani: number
  emsal: number
  muteahhitPayi: number
  daireBuyuklugu?: number
  birimMaliyet?: number
  kaliteSinifi?: 'standart' | 'orta' | 'luks'
  projectName?: string
  scenarioName?: string
}

export interface PrepareScenarioSaveDb extends EngineDefaultsDb {
  project: {
    findMany(a: {
      where: { userId: string }
      select: { id: true; name: true }
    }): Promise<{ id: string; name: string }[]>
  }
  scenario: {
    count(a: { where: { project: { userId: string } } }): Promise<number>
  }
  akifPendingAction: {
    deleteMany(a: { where: Record<string, unknown> }): Promise<unknown>
    create(a: { data: Record<string, unknown> }): Promise<{ id: string }>
  }
}

export type ProjectRef = { existingId: string } | { newName: string | null }

export interface SaveScenarioPayload {
  projectRef: ProjectRef
  scenarioName: string
  scenarioFields: ScenarioFields
  display: ScenarioDisplay
}

export type PrepareResult =
  | {
      kind: 'pending_action'
      pendingActionId: string
      confirmCard: {
        projectRef: ProjectRef
        scenarioName: string
        display: ScenarioDisplay
      }
    }
  | {
      kind: 'needs_project_choice'
      pendingActionId: string
      candidates: { id: string; name: string }[]
      scenarioName: string
      display: ScenarioDisplay
    }
  | { kind: 'blocked'; reason: 'plan_limit'; message: string }

const STALE_MS = 5 * 60 * 1000

function trNormalize(s: string): string {
  return s.trim().toLocaleLowerCase('tr-TR')
}

export async function prepareScenarioSave(
  args: PrepareScenarioSaveArgs,
  deps: {
    db: PrepareScenarioSaveDb
    userId: string
    sessionId: string
    plan: { checkPlanLimit: typeof CheckPlanLimit }
  },
): Promise<PrepareResult> {
  const { db, userId, sessionId, plan } = deps

  // 1) Plan limiti ön-kontrol (yazmadan).
  const limit = await plan.checkPlanLimit(userId, 'scenarios')
  if (!limit.allowed) {
    return { kind: 'blocked', reason: 'plan_limit', message: limit.reason ?? 'Senaryo hakkın dolmuş.' }
  }

  // 2) Motor — seçilen tek satır.
  const defaults = await resolveEngineDefaults(db)
  const x = 1 - args.muteahhitPayi / 100
  const apartmentSize = args.daireBuyuklugu ?? 100
  const totalApartments = Math.floor((args.arsaAlani * args.emsal) / apartmentSize)
  const { scenarioFields, display } = computeFullScenario({
    x,
    apartmentSize,
    totalApartments,
    birimMaliyet: args.birimMaliyet,
    kaliteSinifi: args.kaliteSinifi,
    arsaAlani: args.arsaAlani,
    defaults,
  })

  const scenarioName = (args.scenarioName?.trim() || `Akif — Müteahhit %${args.muteahhitPayi}`).slice(0, 120)

  // 3) Proje hedefi.
  const projects = await db.project.findMany({ where: { userId }, select: { id: true, name: true } })
  let projectRef: ProjectRef
  let candidates: { id: string; name: string }[] | null = null

  if (args.projectName && args.projectName.trim()) {
    const target = trNormalize(args.projectName)
    const matches = projects.filter((p) => trNormalize(p.name) === target)
    if (matches.length === 1) projectRef = { existingId: matches[0].id }
    else if (matches.length === 0) projectRef = { newName: args.projectName.trim().slice(0, 120) }
    else {
      projectRef = { newName: null }
      candidates = matches
    }
  } else if (projects.length === 0) {
    projectRef = { newName: null }
  } else if (projects.length === 1) {
    projectRef = { existingId: projects[0].id }
  } else {
    projectRef = { newName: null }
    candidates = projects
  }

  // 4) Stale/consumed satırları temizle.
  await db.akifPendingAction.deleteMany({
    where: {
      userId,
      OR: [{ consumedAt: { not: null } }, { createdAt: { lt: new Date(Date.now() - STALE_MS) } }],
    },
  })

  // 5) Pending satırı yaz.
  const payload: SaveScenarioPayload = { projectRef, scenarioName, scenarioFields, display }
  const row = await db.akifPendingAction.create({
    data: { userId, sessionId, kind: 'save_scenario', payload: payload as unknown as Record<string, unknown> },
  })

  if (candidates) {
    return { kind: 'needs_project_choice', pendingActionId: row.id, candidates, scenarioName, display }
  }
  return { kind: 'pending_action', pendingActionId: row.id, confirmCard: { projectRef, scenarioName, display } }
}
