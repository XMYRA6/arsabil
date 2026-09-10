import { buildScenarioEngineInput, computeFullScenario } from '../scenarioEngine'
import type { EngineDefaults } from '../engineDefaults'

const defaults: EngineDefaults = {
  P: 12000,
  K: 1.3,
  qualityLevels: { standart: 1.0, orta: 1.2, luks: 1.4 },
}

const args = {
  x: 0.55, // müteahhit %45
  apartmentSize: 100,
  totalApartments: 20,
  birimMaliyet: undefined,
  kaliteSinifi: undefined as 'orta' | undefined,
  arsaAlani: 2000,
  defaults,
}

it('buildScenarioEngineInput maps to engine CalculationInput', () => {
  const input = buildScenarioEngineInput(args)
  expect(input.x).toBe(0.55)
  expect(input.L).toBe(1.2) // lValue('orta')
  expect(input.Ad).toBe(100)
  expect(input.P).toBe(12000) // birimMaliyet undefined → defaults.P
  expect(input.K).toBe(1.3)
  expect(input.Sd).toBe(20)
  expect(input.Aa).toBe(2000)
  expect(input.isRiskEnabled).toBe(false)
  expect(input.isExcavationEnabled).toBe(false)
})

it('totalApartments < 1 → count disabled (Sd undefined)', () => {
  const input = buildScenarioEngineInput({ ...args, totalApartments: 0 })
  expect(input.Sd).toBeUndefined()
})

it('computeFullScenario returns output + mapped scenarioFields + display', () => {
  const r = computeFullScenario(args)
  expect(r.output.FD_total).toBeGreaterThan(0)
  // scenarioFields mapped from engine
  expect(r.scenarioFields.landShareRatio).toBe(0.55)
  expect(r.scenarioFields.luxLevel).toBe(1.2)
  expect(r.scenarioFields.apartmentSize).toBe(100)
  expect(r.scenarioFields.arsaAlani).toBe(2000)
  expect(r.scenarioFields.totalApartments).toBe(20)
  expect(r.scenarioFields.riskLevel).toBe(0)
  expect(r.scenarioFields.builderProfit).toBe(1.3)
  expect(r.scenarioFields.iksaMode).toBe('off')
  expect(r.scenarioFields.marketPrice).toBe(0)
  expect(r.scenarioFields.fdTotal).toBe(r.output.FD_total)
  expect(r.scenarioFields.mi).toBe(r.output.Mi)
  expect(r.scenarioFields.ma).toBe(r.output.Ma)
  expect(r.scenarioFields.totalCost).toBe(r.output.M)
  expect(r.scenarioFields.sdx).toBe(r.output.Sdx)
  expect(r.scenarioFields.fa).toBe(r.output.FA)
  expect(r.scenarioFields.fabirim).toBe(r.output.FAbirim)
  // display
  expect(r.display.arsaPayiPct).toBeCloseTo(45, 5) // (1 - 0.55) * 100
  expect(r.display.satisFiyati).toBe(r.output.FD_total)
  expect(r.display.toplamMaliyet).toBe(r.output.M)
  expect(r.display.sahibineDaire).toBe(r.output.Sdx)
})

it('kaliteSinifi luks → L from defaults', () => {
  const input = buildScenarioEngineInput({ ...args, kaliteSinifi: 'luks' })
  expect(input.L).toBe(1.4)
})
