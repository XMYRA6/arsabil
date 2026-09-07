import { fetchDataflowCsv } from '../../tuik/fetchData'
import type { DataflowRef } from '../../tuik/datasets'

const ref: DataflowRef = {
  key: 'population',
  dataflow: 'DF_ADNKS_T22',
  version: '1.1',
  field: 'population',
  level: 'ilce',
  rowFilter: { ADNKS_GOSTERGE: 'NUFUS', YERLESIM_YERI_TUR: '_T' },
}

function textResponse(body: string, ok = true, status = 200) {
  return { ok, status, text: async () => body } as Response
}

const CSV = 'IKAMET_YERI,TIME_PERIOD,OBS_VALUE\n1421,2025,1'

describe('fetchDataflowCsv', () => {
  it('anahtarsız URL + Bearer token + SDMX-CSV Accept + Accept-Language: tr + timeout signal', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return textResponse(CSV)
    }) as unknown as typeof fetch

    const csv = await fetchDataflowCsv(
      { fetch: fakeFetch, getToken: async () => 'tok-123' },
      ref,
      2025,
    )

    expect(csv).toBe(CSV)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      'https://nsiws.tuik.gov.tr/rest/data/TR,DF_ADNKS_T22,1.1/?startPeriod=2025&endPeriod=2025',
    )
    const headers = calls[0].init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok-123')
    expect(headers.Accept).toBe('application/vnd.sdmx.data+csv;version=1.0.0')
    expect(headers['Accept-Language']).toBe('tr')
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('4xx (401 hariç) → anında fırlatır, tekrar denemez', async () => {
    const fakeFetch = jest.fn(async () => textResponse('', false, 404)) as unknown as typeof fetch
    await expect(
      fetchDataflowCsv({ fetch: fakeFetch, getToken: async () => 't' }, ref, 2025),
    ).rejects.toThrow(/DF_ADNKS_T22.*404/)
    expect(fakeFetch).toHaveBeenCalledTimes(1)
  })

  describe('retry (sahte zamanlayıcı)', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('401 → sonraki denemede taze token ile Bearer yeniden gönderilir', async () => {
      const sentTokens: string[] = []
      const fakeFetch = (async (_url: string, init?: RequestInit) => {
        const auth = (init?.headers as Record<string, string>).Authorization
        sentTokens.push(auth)
        return sentTokens.length === 1 ? textResponse('', false, 401) : textResponse(CSV)
      }) as unknown as typeof fetch
      const getToken = jest.fn(async (force?: boolean) => (force ? 'fresh' : 'stale'))

      const p = fetchDataflowCsv({ fetch: fakeFetch, getToken }, ref, 2025)
      await jest.advanceTimersByTimeAsync(2000)
      await expect(p).resolves.toBe(CSV)

      expect(sentTokens).toEqual(['Bearer stale', 'Bearer fresh'])
      expect(getToken).toHaveBeenNthCalledWith(2, true) // 2. çağrı force
    })

    it('ikinci kez 401 → kalıcı hata (sonsuz döngü yok)', async () => {
      const fakeFetch = jest.fn(async () => textResponse('', false, 401)) as unknown as typeof fetch
      const getToken = jest.fn(async () => 't')
      const p = fetchDataflowCsv({ fetch: fakeFetch, getToken }, ref, 2025)
      const assertion = expect(p).rejects.toThrow(/HTTP 401/)
      await jest.advanceTimersByTimeAsync(2000)
      await jest.advanceTimersByTimeAsync(2000)
      await assertion
      expect(fakeFetch).toHaveBeenCalledTimes(2) // 1. 401 (retry) + 2. 401 (fatal)
    })

    it('5xx sonra 200 → başarılı, 2 çağrı', async () => {
      let n = 0
      const fakeFetch = (async () => {
        n++
        return n === 1 ? textResponse('', false, 502) : textResponse(CSV)
      }) as unknown as typeof fetch

      const p = fetchDataflowCsv({ fetch: fakeFetch, getToken: async () => 't' }, ref, 2025)
      await jest.advanceTimersByTimeAsync(2000)
      await expect(p).resolves.toBe(CSV)
      expect(n).toBe(2)
    })

    it('sürekli 5xx → 3 denemeden sonra fırlatır', async () => {
      const fakeFetch = jest.fn(async () => textResponse('', false, 500)) as unknown as typeof fetch
      const p = fetchDataflowCsv({ fetch: fakeFetch, getToken: async () => 't' }, ref, 2025)
      const assertion = expect(p).rejects.toThrow(/HTTP 500/)
      await jest.advanceTimersByTimeAsync(2000)
      await jest.advanceTimersByTimeAsync(2000)
      await assertion
      expect(fakeFetch).toHaveBeenCalledTimes(3)
    })
  })
})
