import { DATA_BASE, type DataflowRef } from './datasets'

/** TÜİK NSI servisi aralıklı olarak 5xx / timeout veriyor (Task 1 gözlemi) —
 *  birkaç kez dene. Kısa sabit gecikme (sunucu genelde saniyeler içinde toparlıyor). */
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2000
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class ClientError extends Error {}

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
 * 401 → bir kez taze token alıp yeniden dener (token TTL 300 sn, yavaş sunucuda
 * dolabiliyor). 5xx / ağ hatası → `MAX_ATTEMPTS` kez. 4xx (401 hariç) → anında.
 */
export async function fetchDataflowCsv(
  deps: FetchDeps,
  ref: DataflowRef,
  year: number,
): Promise<string> {
  const url =
    `${DATA_BASE},${ref.dataflow},${ref.version}/` +
    `?startPeriod=${year}&endPeriod=${year}`

  let refreshedOn401 = false
  let lastErr: Error | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const token = await deps.getToken()
      const res = await deps.fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.sdmx.data+csv;version=1.0.0',
          'Accept-Language': 'tr',
        },
      })
      if (res.ok) return await res.text()

      const msg = `TÜİK ${ref.dataflow} çekilemedi (HTTP ${res.status})`
      if (res.status === 401 && !refreshedOn401) {
        refreshedOn401 = true
        await deps.getToken(true) // taze token, sonra tekrar dene
        lastErr = new Error(msg)
        continue // gecikmesiz tekrar
      }
      if (res.status < 500) throw new ClientError(msg)
      lastErr = new Error(msg)
    } catch (err) {
      if (err instanceof ClientError) throw err
      lastErr = err as Error
    }
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS)
  }
  throw lastErr ?? new Error(`TÜİK ${ref.dataflow} çekilemedi`)
}
