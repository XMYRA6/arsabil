import { test } from '@playwright/test'
import { loginAs } from './helpers'

// Faz 1 regresyon baseline'ı: 4 hedef sayfanın desktop görüntüsü.
// Task 2-8'de "desktop birebir" iddiası bu görüntülerle karşılaştırılarak doğrulanır.
// marketplace/listing/dashboard middleware ile korunuyor — login sonrası çekilir.
const DESKTOP_VIEWPORT = { width: 1280, height: 800 }

const PAGES = [
    { path: '/hesapla', name: 'hesapla' },
    { path: '/marketplace', name: 'marketplace' },
    { path: '/listing/e2e-mock', name: 'listing' },
    { path: '/dashboard', name: 'dashboard' },
]

test.use({ viewport: DESKTOP_VIEWPORT })

for (const { path, name } of PAGES) {
    test(`desktop baseline: ${name}`, async ({ page }) => {
        await loginAs(page)
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        // Client-side fetch networkidle'dan sonra başlayabiliyor; spinner'ın
        // kaybolmasını bekle (spinner hiç yoksa sorun değil — catch ile geç).
        await page
            .getByText('Yükleniyor')
            .first()
            .waitFor({ state: 'hidden', timeout: 15_000 })
            .catch(() => {})
        await page.screenshot({
            path: `e2e/screenshots/baseline-desktop-${name}.png`,
            fullPage: true,
        })
    })
}
