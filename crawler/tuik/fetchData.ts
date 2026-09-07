import { DATA_BASE, type DataflowRef } from './datasets'

/** Bir dataflow'u SDMX-CSV metni olarak çeker. keyDimensions seri anahtarına
 *  gömülür (REF_AREA ve TIME_PERIOD boş bırakılır → tüm alanlar / tüm dönem-yıl). */
export async function fetchDataflowCsv(
  deps: { fetch: typeof fetch; token: string },
  ref: DataflowRef,
  year: number,
): Promise<string> {
  // SDMX seri anahtarı: DSD'nin HER boyut pozisyonu verilmeli (REF_AREA ve
  // TIME_PERIOD boş bırakılır = wildcard). Sıralama = DSD boyut sırası, obje
  // anahtar sırası DEĞİL. Ör. DSD (REF_AREA, CINSIYET) + {CINSIYET:'_T'} → "/._T"
  // (mevcut kod "/_T" üretir — server bunu REF_AREA=_T sanar). Task 1b: gerçek
  // DSD'ye karşı bir curl ile doğrula ve gerekiyorsa bu birleştirmeyi düzelt.
  const keyPart = Object.keys(ref.keyDimensions).length
    ? '/' + Object.values(ref.keyDimensions).join('.')
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
