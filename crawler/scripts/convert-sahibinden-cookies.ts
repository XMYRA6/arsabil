/**
 * Cookie-Editor (veya benzeri bir tarayıcı uzantısının) ham dışa aktarımını
 * crawler/data/sahibinden-cookies.json'ın beklediği şekle dönüştürür. Gerçek
 * çerez değerleri bu script içinde HİÇBİR YERE loglanmaz/gönderilmez — yalnızca
 * yerel dosyadan okunup yerel dosyaya yazılır.
 *
 * Kullanım:
 *   1. Gerçek tarayıcıda sahibinden.com'a git, gerekirse meydan okumayı çöz.
 *   2. Cookie-Editor uzantısıyla "Export" (JSON formatı) — bir dosyaya kaydet
 *      (ör. Downloads/sahibinden-export.json).
 *   3. npx ts-node --transpile-only -r tsconfig-paths/register crawler/scripts/convert-sahibinden-cookies.ts <disaAktarilanDosya.json>
 *   4. Çıktı: crawler/data/sahibinden-cookies.json (üzerine yazılır, gitignore'lu).
 *      Script kendi çıktısını loadSahibindenCookies() ile hemen doğrular.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadSahibindenCookies, type SahibindenCookie } from '../fetcher/sahibindenCookies'

interface RawCookie {
  domain?: string
  name?: string
  value?: string
  path?: string
  httpOnly?: boolean
  secure?: boolean
  session?: boolean
  expirationDate?: number
  expires?: number | string
  sameSite?: string
}

/** Chrome'un cookies API'sindeki sameSite değerleri (Cookie-Editor bunları aynen dışa aktarır) küçük harf; Playwright büyük harf bekler. */
function mapSameSite(raw: string | undefined): SahibindenCookie['sameSite'] {
  switch ((raw ?? '').toLowerCase()) {
    case 'no_restriction':
    case 'none':
      return 'None'
    case 'strict':
      return 'Strict'
    case 'lax':
    case 'unspecified':
    default:
      return 'Lax'
  }
}

export function convertCookies(raw: RawCookie[]): SahibindenCookie[] {
  return raw
    .filter((c) => (c.domain ?? '').includes('sahibinden.com') && c.name && c.value)
    .map((c) => {
      const cookie: SahibindenCookie = {
        name: c.name!,
        value: c.value!,
        domain: c.domain!.startsWith('.') ? c.domain! : `.${c.domain}`,
        path: c.path || '/',
        httpOnly: !!c.httpOnly,
        secure: !!c.secure,
        sameSite: mapSameSite(c.sameSite),
      }
      // session:true → expires HİÇ eklenmez (loadSahibindenCookies bunu her zaman geçerli sayar).
      if (!c.session) {
        const exp = c.expirationDate ?? (typeof c.expires === 'number' ? c.expires : undefined)
        if (typeof exp === 'number') cookie.expires = Math.floor(exp)
      }
      return cookie
    })
}

function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Kullanım: convert-sahibinden-cookies.ts <disa-aktarilan-dosya.json>')
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  if (!Array.isArray(raw)) {
    console.error('Girdi dosyası bir JSON dizisi (array) olmalı.')
    process.exit(1)
  }

  const converted = convertCookies(raw as RawCookie[])
  if (converted.length === 0) {
    console.error("sahibinden.com'a ait çerez bulunamadı — doğru dosyayı mı dışa aktardın?")
    process.exit(1)
  }

  const outPath = path.join(__dirname, '..', 'data', 'sahibinden-cookies.json')
  fs.writeFileSync(outPath, JSON.stringify(converted, null, 2))
  console.log(`${converted.length} çerez yazıldı: ${outPath}`)

  // Yazdığımız dosyayı gerçek yükleyiciyle hemen doğrula — format/süre sorunu varsa şimdi görünsün.
  const verified = loadSahibindenCookies(outPath)
  console.log(`Doğrulandı: ${verified.length} taze çerez (loadSahibindenCookies ile okunabiliyor).`)
}

if (require.main === module) {
  main()
}
