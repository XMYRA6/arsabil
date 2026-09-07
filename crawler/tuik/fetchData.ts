import { DATA_BASE, type DataflowRef } from './datasets'

/** Bir dataflow'u SDMX-CSV metni olarak çeker. keyDimensions seri anahtarına
 *  gömülür (REF_AREA ve TIME_PERIOD boş bırakılır → tüm alanlar / tüm dönem-yıl). */
export async function fetchDataflowCsv(
  deps: { fetch: typeof fetch; token: string },
  ref: DataflowRef,
  year: number,
): Promise<string> {
  // Seri anahtarı: keyDimensions varsa "?" ile filtrelenir; yoksa tümü.
  const keyPart = Object.keys(ref.keyDimensions).length
    ? '/' + Object.values(ref.keyDimensions).join('.')  // DSD sırasına göre — Task 1 doğrular
    : ''
  const url =
    `${DATA_BASE},${ref.dataflow},${ref.version}${keyPart}` +
    `?format=SDMX-CSV&startPeriod=${year}&endPeriod=${year}`
  const res = await deps.fetch(url, { headers: { Authorization: `Bearer ${deps.token}` } })
  if (!res.ok) {
    throw new Error(`TÜİK ${ref.dataflow} çekilemedi (HTTP ${res.status})`)
  }
  return await res.text()
}
