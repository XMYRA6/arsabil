import { DATA_BASE, type DataflowRef } from './datasets'

/** TÜİK NSI servisi aralıklı olarak 5xx / timeout veriyor (Task 1 gözlemi) —
 *  birkaç kez dene. Kısa sabit gecikme (sunucu genelde saniyeler içinde toparlıyor). */
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class ClientError extends Error {}

/**
 * Bir dataflow'un tek bir yılını SDMX-CSV metni olarak çeker.
 *
 * Anahtarsız sorgu — TÜİK ADNKS dataflow'ları INDICATOR + tek bir ADNKS_GOSTERGE'ye
 * kısıtlı olduğu için yanıt küçük (≤ ~300 KB). İstenmeyen cinsiyet / kentsel-kırsal
 * kırılım satırları `parseSdmxCsv`'de `ref.rowFilter` ile elenir.
 *
 * SDMX-CSV yalnız `Accept` başlığıyla döner; `?format=SDMX-CSV` query parametresi
 * TÜİK NSI servisinde yok sayılır (XML döner) — bkz. crawler/tuik/FINDINGS.md.
 *
 * 5xx ve ağ hatalarında `MAX_ATTEMPTS` kez denenir; 4xx anında fırlatılır.
 */
export async function fetchDataflowCsv(
  deps: { fetch: typeof fetch; token: string },
  ref: DataflowRef,
  year: number,
): Promise<string> {
  const url =
    `${DATA_BASE},${ref.dataflow},${ref.version}/` +
    `?startPeriod=${year}&endPeriod=${year}`

  let lastErr: Error | undefined
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await deps.fetch(url, {
        headers: {
          Authorization: `Bearer ${deps.token}`,
          Accept: 'application/vnd.sdmx.data+csv;version=1.0.0',
          // TÜİK NSI servisi Accept-Language yoksa bazı istemcilere (undici fetch)
          // HTTP 500 "languageTag" hatası veriyor — bkz. FINDINGS.md. curl'de sorun yok.
          'Accept-Language': 'tr',
        },
      })
      if (res.ok) return await res.text()
      const msg = `TÜİK ${ref.dataflow} çekilemedi (HTTP ${res.status})`
      // 4xx istemci hatası — tekrar denemek anlamsız.
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
