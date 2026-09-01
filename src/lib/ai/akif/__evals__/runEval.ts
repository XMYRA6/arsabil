// Akif-1 model kalite eval — GERÇEK OpenAI API döngüsü. ELLE çalıştırılır
// (`npm run akif:eval`), ücretlidir, CI'da KOŞMAZ. Bütçe guard'lı: `budgetUsd`
// aşılınca kalan fixture'lar atlanır. Skorlama saf `scoreFixture`'dan gelir.

import type { EngineDefaultsDb } from '../gateway/engineDefaults'
import { dispatchTool, validateArgs, type ToolName } from '../gateway/toolRegistry'
import { runAkifTurn, type RunAkifTurnDeps } from '../orchestrator'
import type { createAkifModel } from '../openaiClient'
import { scoreFixture, type EvalFixture } from './score'

export interface RunEvalDeps {
  model: ReturnType<typeof createAkifModel>
  modelName: string
  db: EngineDefaultsDb
  budgetUsd: number
  log: (line: string) => void
}

export interface EvalRow {
  id: string
  category: string
  pass: boolean
  failedChecks: string[]
  assumptionsCount: number
  speechChars: number
  costUsd: number
}

export interface EvalSummary {
  total: number
  ran: number
  passed: number
  spentUsd: number
  rows: EvalRow[]
  stoppedForBudget: boolean
}

export async function runEval(
  fixtures: EvalFixture[],
  deps: RunEvalDeps,
): Promise<EvalSummary> {
  const rows: EvalRow[] = []
  let spentUsd = 0
  let stoppedForBudget = false

  for (const fx of fixtures) {
    if (spentUsd >= deps.budgetUsd) {
      stoppedForBudget = true
      break
    }

    let turnCost = 0
    const audit = {
      logTurn: async (e: { estCostUsd: number }) => {
        turnCost += e.estCostUsd
      },
      monthSpendUsd: async () => 0,
    }

    const rd: RunAkifTurnDeps = {
      model: deps.model,
      modelName: deps.modelName,
      dispatch: (n: ToolName, a: unknown) => dispatchTool(n, a, { db: deps.db }),
      validateArgs,
      audit,
      checkConversationBudget: () => ({ ok: true }),
      now: () => new Date(),
    }

    const turn = await runAkifTurn(
      { conversationId: fx.id, history: fx.history, userMessage: fx.userMessage },
      rd,
    )
    spentUsd += turnCost

    const score = scoreFixture(turn, fx.expect)
    const row: EvalRow = {
      id: fx.id,
      category: fx.category,
      pass: score.pass,
      failedChecks: score.checks.filter((c) => !c.ok).map((c) => c.name),
      assumptionsCount: turn.assumptions.length,
      speechChars: turn.speech.length,
      costUsd: turnCost,
    }
    rows.push(row)
    deps.log(
      `${row.pass ? '✓' : '✗'} ${fx.id.padEnd(32)} ${fx.category.padEnd(14)} ` +
        `asm=${row.assumptionsCount} chars=${row.speechChars} ` +
        `$${turnCost.toFixed(4)}${row.failedChecks.length ? `  ✗ ${row.failedChecks.join(',')}` : ''}`,
    )
  }

  const passed = rows.filter((r) => r.pass).length

  // Kategori kırılımı
  deps.log('\n— kategori —')
  const cats = [...new Set(rows.map((r) => r.category))]
  for (const c of cats) {
    const sub = rows.filter((r) => r.category === c)
    deps.log(`  ${c.padEnd(14)} ${sub.filter((r) => r.pass).length}/${sub.length}`)
  }

  return {
    total: fixtures.length,
    ran: rows.length,
    passed,
    spentUsd,
    rows,
    stoppedForBudget,
  }
}
