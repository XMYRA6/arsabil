import { runTuikDemographics, type RunDeps } from '../../tuik/run'
import type { DataflowRef } from '../../tuik/datasets'

const ref = (key: string, field: any, level: 'il' | 'ilce'): DataflowRef => ({
  key, dataflow: `DF_${key}`, version: '1.1', field, level, rowFilter: {},
})

function makeDeps(over: Partial<RunDeps> = {}): RunDeps & { _upserts: any[] } {
  const _upserts: any[] = []
  return {
    dataflows: [ref('population', 'population', 'ilce'), ref('medianAge', 'medianAge', 'il')],
    dataYear: 2024,
    getToken: jest.fn(async () => 'tok'),
    fetchCsv: jest.fn(async (r: DataflowRef) => `REF_AREA,TIME_PERIOD,OBS_VALUE\nA_${r.key},2024,1`),
    parse: jest.fn((csv: string, _ref: DataflowRef) => [
      { refArea: csv.split('\n')[1].split(',')[0], timePeriod: '2024', value: 1 },
    ]),
    resolve: jest.fn((code: string) =>
      code === 'A_population' ? { il: 'Trabzon', ilce: 'Ortahisar' }
      : code === 'A_medianAge' ? { il: 'Trabzon', ilce: null } : null),
    client: { districtDemographics: { upsert: async (a: any) => { _upserts.push(a) } } } as any,
    crawlRunClient: { crawlRun: { create: jest.fn(async () => ({ id: 'r1' })), update: jest.fn(async () => ({})) } } as any,
    _upserts,
    ...over,
  } as RunDeps & { _upserts: any[] }
}

describe('runTuikDemographics', () => {
  it('tüm dataflow OK → token alır, satır yazar, CrawlRun kapatır', async () => {
    const deps = makeDeps()
    const s = await runTuikDemographics(deps, { dryRun: false })
    expect(deps.getToken).toHaveBeenCalled()
    expect(s.dataflowsOk).toBe(2)
    expect(s.dataflowsFailed).toEqual([])
    expect(s.rowsWritten).toBe(1)               // 1 ilçe satırı (medianAge il→ilçe yayıldı)
    expect(s.aborted).toBe(false)
    expect(deps.crawlRunClient.crawlRun.update).toHaveBeenCalled()
  })

  it('token alınamazsa → abort, hiç fetch/upsert yok, CrawlRun blocked:true', async () => {
    const deps = makeDeps({ getToken: jest.fn(async () => { throw new Error('auth failed') }) })
    const s = await runTuikDemographics(deps, { dryRun: false })
    expect(s.aborted).toBe(true)
    expect(s.rowsWritten).toBe(0)
    expect(deps.fetchCsv).not.toHaveBeenCalled()
    expect(deps._upserts).toHaveLength(0)
    expect(deps.crawlRunClient.crawlRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blocked: true,
          notes: expect.stringContaining('auth failed'),
        }),
      }),
    )
  })

  it('bir dataflow HTTP 200 + boş gövde → o key dataflowsFailed', async () => {
    const deps = makeDeps({
      fetchCsv: jest.fn(async (r: DataflowRef) =>
        r.key === 'medianAge' ? '   ' : `REF_AREA,TIME_PERIOD,OBS_VALUE\nA_${r.key},2024,1`,
      ),
    })
    const s = await runTuikDemographics(deps, { dryRun: false })
    expect(s.dataflowsFailed).toEqual(['medianAge'])
    expect(s.dataflowsOk).toBe(1)
    expect(s.aborted).toBe(false)
  })

  it('çözülemeyen kod → RunSummary.unresolved sayar', async () => {
    const deps = makeDeps({
      resolve: jest.fn(() => null), // hiçbir kod çözülmez
    })
    const s = await runTuikDemographics(deps, { dryRun: true })
    expect(s.unresolved).toBeGreaterThan(0)
    expect(s.mergedRows).toBe(0)
  })

  it('bir dataflow fetch hata verir → o metrik atlanır, diğerleri yazılır', async () => {
    const deps = makeDeps({
      fetchCsv: jest.fn(async (r: DataflowRef) => {
        if (r.key === 'medianAge') throw new Error('HTTP 500')
        return `REF_AREA,TIME_PERIOD,OBS_VALUE\nA_${r.key},2024,1`
      }),
    })
    const s = await runTuikDemographics(deps, { dryRun: false })
    expect(s.dataflowsOk).toBe(1)
    expect(s.dataflowsFailed).toEqual(['medianAge'])
    expect(s.rowsWritten).toBe(1)
    expect(s.aborted).toBe(false)
  })

  it('HİÇBİR dataflow çekilemez → abort, 0 satır, hiç upsert yok', async () => {
    const deps = makeDeps({ fetchCsv: jest.fn(async () => { throw new Error('down') }) })
    const s = await runTuikDemographics(deps, { dryRun: false })
    expect(s.aborted).toBe(true)
    expect(deps._upserts).toHaveLength(0)
  })

  it('dryRun → parse+merge eder ama upsert ETMEZ', async () => {
    const deps = makeDeps()
    const s = await runTuikDemographics(deps, { dryRun: true })
    expect(s.dataflowsOk).toBe(2)
    expect(deps._upserts).toHaveLength(0)
  })
})
