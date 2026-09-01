// Akif-1 model kalite eval — ELLE çalıştırılır: `npm run akif:eval`.
// Gerçek OpenAI API'ye vurur (ücretli). CI'da KOŞMAZ. `AKIF_EVAL_BUDGET_USD`
// üst harcama sınırı. Skor eşikleri: vizyon §52 (deploy öncesi gözden geçir).

import OpenAI from 'openai'
import { createAkifModel } from '../src/lib/ai/akif/openaiClient'
import { runEval } from '../src/lib/ai/akif/__evals__/runEval'
import { FIXTURES } from '../src/lib/ai/akif/__evals__/fixtures'

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('OPENAI_API_KEY gerekli — eval gerçek API kullanır. Çıkılıyor.')
    process.exitCode = 1
    return
  }

  const modelName = process.env.AKIF_MODEL || 'gpt-4o-mini'
  const budgetUsd = Number(process.env.AKIF_EVAL_BUDGET_USD || 2)

  const stubDb = {
    globalSettings: { findUnique: async () => null },
    profitLevel: { findFirst: async () => null },
  }

  const summary = await runEval(FIXTURES, {
    model: createAkifModel({ client: new OpenAI({ apiKey }), model: modelName }),
    modelName,
    db: stubDb,
    budgetUsd,
    log: (l) => console.log(l),
  })

  console.log(
    `\n${summary.passed}/${summary.ran} geçti (${summary.total} fixture) · ~$${summary.spentUsd.toFixed(4)}`,
  )
  if (summary.stoppedForBudget) {
    console.warn(`⚠ Bütçe ($${budgetUsd}) dolduğu için erken durdu.`)
  }
  if (summary.passed < summary.ran) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
