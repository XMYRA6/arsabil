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

describe('fetchDataflowCsv', () => {
  it('anahtarsız URL + Bearer token + SDMX-CSV Accept başlığı', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return textResponse('IKAMET_YERI,TIME_PERIOD,OBS_VALUE\n1421,2025,1')
    }) as unknown as typeof fetch

    const csv = await fetchDataflowCsv({ fetch: fakeFetch, token: 'tok-123' }, ref, 2025)

    expect(csv).toContain('OBS_VALUE')
    expect(calls[0].url).toBe(
      'https://nsiws.tuik.gov.tr/rest/data/TR,DF_ADNKS_T22,1.1/?startPeriod=2025&endPeriod=2025',
    )
    const headers = calls[0].init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok-123')
    expect(headers.Accept).toBe('application/vnd.sdmx.data+csv;version=1.0.0')
  })

  it('non-ok yanıt → HTTP kodlu hata fırlatır', async () => {
    const fakeFetch = (async () => textResponse('', false, 503)) as unknown as typeof fetch
    await expect(
      fetchDataflowCsv({ fetch: fakeFetch, token: 't' }, ref, 2025),
    ).rejects.toThrow(/DF_ADNKS_T22.*503/)
  })
})
