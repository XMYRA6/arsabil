import { validateActionArgs, ACTION_TOOL_DEFS } from '../actionTools'

it('ACTION_TOOL_DEFS has the two action tools', () => {
  const names = ACTION_TOOL_DEFS.map((d) => d.function.name)
  expect(names).toEqual(['prepareScenarioSave', 'commitPendingAction'])
})

it('prepareScenarioSave: valid args ok', () => {
  expect(
    validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45 }),
  ).toEqual({ ok: true })
})

it('prepareScenarioSave: out-of-range → fail with field', () => {
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 10, emsal: 2, muteahhitPayi: 45 }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 99, muteahhitPayi: 45 }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 0 }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 100 }).ok).toBe(false)
})

it('prepareScenarioSave: bad optional daireBuyuklugu / kaliteSinifi / birimMaliyet → fail', () => {
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45, daireBuyuklugu: 5 }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45, kaliteSinifi: 'altin' }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45, birimMaliyet: 10 }).ok).toBe(false)
})

it('prepareScenarioSave: over-long name → fail', () => {
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45, projectName: 'x'.repeat(200) }).ok).toBe(false)
})

it('commitPendingAction: requires pendingActionId string', () => {
  expect(validateActionArgs('commitPendingAction', { pendingActionId: 'abc' })).toEqual({ ok: true })
  expect(validateActionArgs('commitPendingAction', {}).ok).toBe(false)
  expect(validateActionArgs('commitPendingAction', { pendingActionId: 123 }).ok).toBe(false)
})
