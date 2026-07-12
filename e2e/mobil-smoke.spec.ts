import { test, expect, Page } from '@playwright/test'
import { loginAs } from './helpers'

// Mobil UI spec §5: her faz sonunda faz kapsamındaki sayfalar bu listeye taşınır.
// fixme'li sayfalar bilinen-bozuk envanteridir; ilgili fazda düzeltilip aktive edilir.
// auth: true olan sayfalar middleware korumalıdır; goto öncesi login yapılır.
const MOBILE_VIEWPORT = { width: 390, height: 844 }

const PAGES: { path: string; fixme?: string; auth?: boolean }[] = [
    { path: '/' },
    { path: '/login' },
    { path: '/register' },
    { path: '/listing/e2e-mock', auth: true },
    { path: '/marketplace', auth: true },
    { path: '/hesapla' },
    { path: '/profile/e2e-user-1' },
    { path: '/dashboard/projects', auth: true },
    { path: '/dashboard/reports', auth: true },
]

async function assertNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow, 'yatay taşma (px)').toBeLessThanOrEqual(0)
}

test.use({ viewport: MOBILE_VIEWPORT })

for (const { path, fixme, auth } of PAGES) {
    test(`mobil 390px: ${path} yatay taşma yok`, async ({ page }) => {
        if (fixme) test.fixme(true, fixme)
        if (auth) await loginAs(page)
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        // Client-side fetch networkidle'dan sonra bitebiliyor; "Yükleniyor"
        // spinner'ı kaybolmadan ölçülen taşma yanlış negatif verir. Spinner
        // hiç yoksa sorun değil — catch ile geç (desktop-baseline ile aynı yaklaşım).
        await page
            .getByText('Yükleniyor')
            .first()
            .waitFor({ state: 'hidden', timeout: 15_000 })
            .catch(() => {})
        await assertNoHorizontalOverflow(page)
        await page.screenshot({
            path: `e2e/screenshots/mobil${path === '/' ? '_home' : path.replace(/\//g, '_')}.png`,
            fullPage: true,
        })
    })
}

test('mobil 390px: /compare/[token] yatay taşma yok', async ({ page }) => {
    await loginAs(page)
    // page.request, page.context()'in çerezlerini (next-auth session) otomatik taşır —
    // manuel Cookie header oluşturmaya gerek yok.
    const projectRes = await page.request.post('/api/projects', {
        data: {
            name: 'E2E Karşılaştırma Projesi',
            scenario: {
                name: 'Senaryo A', luxLevel: 1.0, apartmentSize: 100, landShareRatio: 0.3,
                riskLevel: 1, builderProfit: 1.2, fdTotal: 4000000, fdPerM2: 40000,
                mi: 1500000, ma: 1000000, totalCost: 2500000,
            },
        },
    })
    const { project } = await projectRes.json()

    const scenarioRes = await page.request.post(`/api/projects/${project.id}/scenarios`, {
        data: {
            name: 'Senaryo B', luxLevel: 1.4, apartmentSize: 140, landShareRatio: 0.35,
            riskLevel: 2, builderProfit: 1.3, fdTotal: 6000000, fdPerM2: 42857,
            mi: 2200000, ma: 1500000, totalCost: 3700000,
        },
    })
    const { scenario } = await scenarioRes.json()

    const shareRes = await page.request.post('/api/compare/share', {
        data: { scenarioIds: [project.scenarios[0].id, scenario.id] },
    })
    const { token } = await shareRes.json()

    await page.goto(`/compare/${token}`)
    await page.waitForLoadState('networkidle')
    await assertNoHorizontalOverflow(page)
    await page.screenshot({ path: 'e2e/screenshots/mobil_compare_token.png', fullPage: true })
})
