import { test } from '@playwright/test'

// Faz 1 regresyon baseline'ı: 4 hedef sayfanın desktop görüntüsü.
// Task 2-8'de "desktop birebir" iddiası bu görüntülerle karşılaştırılarak doğrulanır.
const DESKTOP_VIEWPORT = { width: 1280, height: 800 }

const PAGES = [
    { path: '/hesapla', name: 'hesapla' },
    { path: '/marketplace', name: 'marketplace' },
    { path: '/listing/e2e-mock', name: 'listing' },
    { path: '/dashboard', name: 'dashboard' }, // auth yoksa /login'e yönlenir — görüntü yine alınır
]

test.use({ viewport: DESKTOP_VIEWPORT })

for (const { path, name } of PAGES) {
    test(`desktop baseline: ${name}`, async ({ page }) => {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await page.screenshot({
            path: `e2e/screenshots/baseline-desktop-${name}.png`,
            fullPage: true,
        })
    })
}
