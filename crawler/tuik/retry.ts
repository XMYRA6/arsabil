/** TÜİK NSI + giriş sunucusu aralıklı olarak 5xx / HTML hata sayfası / timeout
 *  veriyor (Task 1 gözlemi, bkz. FINDINGS.md) — geçici hatalarda birkaç kez dene. */
export const RETRY_MAX_ATTEMPTS = 3
export const RETRY_DELAY_MS = 2000
/** Tek bir HTTP isteği için üst sınır — asılı socket cron turunu kilitlemesin. */
export const REQUEST_TIMEOUT_MS = 60_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** `isFatal` true dönen hata anında fırlatılır (4xx, kötü api_key) — tekrar denenmez. */
export class FatalError extends Error {}

export async function retryTransient<T>(
  op: (attempt: number) => Promise<T>,
  opts: {
    isFatal?: (err: unknown) => boolean
    attempts?: number
    delayMs?: number
  } = {},
): Promise<T> {
  const attempts = opts.attempts ?? RETRY_MAX_ATTEMPTS
  const delayMs = opts.delayMs ?? RETRY_DELAY_MS
  const isFatal = opts.isFatal ?? ((e) => e instanceof FatalError)

  let lastErr: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await op(attempt)
    } catch (err) {
      if (isFatal(err)) throw err
      lastErr = err
    }
    if (attempt < attempts) await sleep(delayMs)
  }
  throw lastErr ?? new Error('retryTransient: tüm denemeler başarısız')
}
