import { ruleBasedUnderstanding } from '../understanding'

describe('ruleBasedUnderstanding', () => {
  it('extractParcelQuery sonucunu döner', async () => {
    const r = await ruleBasedUnderstanding.understand('Trabzon Of 1/2', {})
    expect(r).toEqual({ ilText: 'Trabzon', ilceText: 'Of', ada: '1', parsel: '2' })
  })
  it('prior parametresini yok sayar (v1)', async () => {
    const r = await ruleBasedUnderstanding.understand('5/6', { ilText: 'Rize' })
    expect(r).toEqual({ ada: '5', parsel: '6' })
  })
})
