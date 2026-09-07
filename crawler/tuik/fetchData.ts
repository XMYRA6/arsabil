import { DATA_BASE, type DataflowRef } from './datasets'
import { FatalError, REQUEST_TIMEOUT_MS, retryTransient } from './retry'

export interface FetchDeps {
  fetch: typeof fetch
  /** Geçerli erişim token'ı. `force` ile taze token istenir (401 sonrası). */
  getToken: (force?: boolean) => Promise<string>
}

/**
 * Bir dataflow'un tek bir yılını SDMX-CSV metni olarak çeker.
 *
 * Anahtarsız sorgu — TÜİK ADNKS dataflow'ları INDICATOR + tek bir ADNKS_GOSTERGE'ye
 * kısıtlı olduğu için yanıt küçük (≤ ~300 KB). İstenmeyen cinsiyet / kentsel-kırsal
 * kırılım satırları `parseSdmxCsv`'de `ref.rowFilter` ile elenir.
 *
 * SDMX-CSV yalnız `Accept` başlığıyla döner; `?format=SDMX-CSV` query parametresi
 * TÜİK NSI servisinde yok sayılır. `Accept-Language: tr` de şart — yoksa bazı
 * istemciler (undici fetch) HTTP 500 "languageTag" alıyor. Bkz. FINDINGS.md.
 *
 * 401 → sonraki denemede taze token alınır (token TTL 300 sn, yavaş sunucuda
 * dolabiliyor). 5xx / ağ hatası / timeout → tekrar denenir. 4xx (401 hariç) → anında.
 */
export async function fetchDataflowCsv(
  deps: FetchDeps,
  ref: DataflowRef,
  year: number,
): Promise<string> {
  const url =
    `${DATA_BASE},${ref.dataflow},${ref.version}/` +
    `?startPeriod=${year}&endPeriod=${year}`

  let sawAuthFailure = false

  return retryTransient(async () => {
    // Bir önceki denemede 401 aldıysak taze token zorla.
    const token = await deps.getToken(sawAuthFailure)
    const res = await deps.fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.sdmx.data+csv;version=1.0.0',
        'Accept-Language': 'tr',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (res.ok) return await res.text()

    const msg = `TÜİK ${ref.dataflow} çekilemedi (HTTP ${res.status})`
    if (res.status === 401 && !sawAuthFailure) {
      sawAuthFailure = true
      throw new Error(msg) // geçici — sonraki deneme taze token'la
    }
    // 401 (ikinci kez) veya diğer 4xx = kalıcı; 5xx = geçici.
    throw res.status < 500 ? new FatalError(msg) : new Error(msg)
  })
}
