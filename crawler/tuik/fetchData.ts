import { DATA_BASE, type DataflowRef } from './datasets'

/**
 * Bir dataflow'un tek bir yılını SDMX-CSV metni olarak çeker.
 *
 * Anahtarsız sorgu — TÜİK ADNKS dataflow'ları INDICATOR + tek bir ADNKS_GOSTERGE'ye
 * kısıtlı olduğu için yanıt küçük (≤ ~300 KB). İstenmeyen cinsiyet / kentsel-kırsal
 * kırılım satırları `parseSdmxCsv`'de `ref.rowFilter` ile elenir.
 *
 * SDMX-CSV yalnız `Accept` başlığıyla döner; `?format=SDMX-CSV` query parametresi
 * TÜİK NSI servisinde yok sayılır (XML döner) — bkz. crawler/tuik/FINDINGS.md.
 */
export async function fetchDataflowCsv(
  deps: { fetch: typeof fetch; token: string },
  ref: DataflowRef,
  year: number,
): Promise<string> {
  const url =
    `${DATA_BASE},${ref.dataflow},${ref.version}/` +
    `?startPeriod=${year}&endPeriod=${year}`
  const res = await deps.fetch(url, {
    headers: {
      Authorization: `Bearer ${deps.token}`,
      Accept: 'application/vnd.sdmx.data+csv;version=1.0.0',
    },
  })
  if (!res.ok) {
    throw new Error(`TÜİK ${ref.dataflow} çekilemedi (HTTP ${res.status})`)
  }
  return await res.text()
}
