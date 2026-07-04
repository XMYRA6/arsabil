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
    { path: '/marketplace', fixme: 'Faz 1 - filtre sidebar mobilde tasiyor' },
    { path: '/hesapla', fixme: 'Faz 1 - inline stil grid tasiyor' },
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
