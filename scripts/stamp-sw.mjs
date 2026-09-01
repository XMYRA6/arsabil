// Build-time: public/sw.js'in CACHE_NAME + SW_VERSION satırlarını benzersiz bir
// yapı kimliğiyle damgalar. Tarayıcı SW güncellemesini `sw.js`'in BAYT farkına
// göre tetikler — bu damga olmadan yalnız `sw.js` elle düzenlenince güncelleme
// banner'ı görünür; damgayla HER deploy'da görünür.
//
// Kimlik: git kısa SHA (varsa) → yoksa `b<epoch>` (Docker build'inde .git yok).
// `prebuild` script'i çalıştırır. `public/sw.js` tracked kalır; yerelde
// `npm run build` sonrası dosya "dirty" görünebilir — `git checkout public/sw.js`
// ile geri alınır, deploy (Docker) ephemeral olduğu için orada sorun değil.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const SW = new URL('../public/sw.js', import.meta.url)

let id = ''
try {
  id = execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
} catch {
  /* .git yok */
}
if (!id) id = 'b' + Date.now()

const before = readFileSync(SW, 'utf8')
const after = before
  .replace(/const CACHE_NAME = '[^']*';/, `const CACHE_NAME = 'arsabil-cache-${id}';`)
  .replace(
    /const SW_VERSION = '[^']*';[^\n]*/,
    `const SW_VERSION = '${id}'; // build-time damgalı — scripts/stamp-sw.mjs`,
  )

if (!/const CACHE_NAME = 'arsabil-cache-/.test(after) || !new RegExp(`SW_VERSION = '${id}'`).test(after)) {
  console.error('[stamp-sw] HATA: public/sw.js beklenen CACHE_NAME/SW_VERSION satırlarını içermiyor')
  process.exit(1)
}

writeFileSync(SW, after)
console.log('[stamp-sw] SW_VERSION =', id)
