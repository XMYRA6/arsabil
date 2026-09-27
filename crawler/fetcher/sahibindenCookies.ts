import * as fs from 'node:fs'
import * as path from 'node:path'

export interface SahibindenCookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'sahibinden-cookies.json')

/**
 * `crawler/data/sahibinden-cookies.json`'ı okur (gitignore'lu — gerçek tarayıcıda
 * meydan okuma çözülüp elle dışa aktarılır). Süresi geçmiş çerezleri filtreler;
 * `expires` yok ya da `-1` (session sentinel) ise her zaman geçerli sayılır.
 * Dosya yok / geçersiz JSON / dizi değil / hepsi bayatsa açık mesajla throw eder —
 * crawler hiç başlamasın diye (çağıran taraf bunu preflight'tan ÖNCE yakalar).
 */
export function loadSahibindenCookies(
  filePath: string = DEFAULT_PATH,
  now: () => Date = () => new Date(),
): SahibindenCookie[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `sahibinden-cookies.json yok (${filePath}) — gerçek tarayıcıda sahibinden.com'a girip meydan okumayı çöz, ` +
        `çerezleri dışa aktar (bkz. crawler/data/sahibinden-cookies.example.json).`,
    )
  }

  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (e) {
    throw new Error(`sahibinden-cookies.json geçerli JSON değil: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!Array.isArray(raw)) {
    throw new Error('sahibinden-cookies.json bir dizi (array) olmalı')
  }

  const nowSecs = now().getTime() / 1000
  const valid = (raw as SahibindenCookie[]).filter((c) => {
    if (!c || typeof c.name !== 'string' || typeof c.value !== 'string') return false
    if (typeof c.expires === 'number' && c.expires > 0 && c.expires < nowSecs) return false
    return true
  })

  if (valid.length === 0) {
    throw new Error(
      "sahibinden-cookies.json içindeki tüm çerezler bayat (süresi dolmuş) — gerçek tarayıcıda " +
        "sahibinden.com'a girip meydan okumayı tekrar çöz, çerezleri yeniden dışa aktar.",
    )
  }

  return valid
}
