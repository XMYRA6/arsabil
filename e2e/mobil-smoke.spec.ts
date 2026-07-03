import { test, expect, Page } from '@playwright/test'

// Mobil UI spec §5: her faz sonunda faz kapsamındaki sayfalar bu listeye taşınır.
// fixme'li sayfalar bilinen-bozuk envanteridir; ilgili fazda düzeltilip aktive edilir.
const MOBILE_VIEWPORT = { width: 390, height: 844 }

const PAGES: { path: string; fixme?: string }[] = [
    { path: '/' },
    { path: '/login' },
    { path: '/register' },
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

for (const { path, fixme } of PAGES) {
    test(`mobil 390px: ${path} yatay taşma yok`, async ({ page }) => {
        if (fixme) test.fixme(true, fixme)
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await assertNoHorizontalOverflow(page)
        await page.screenshot({
            path: `e2e/screenshots/mobil${path === '/' ? '_home' : path.replace(/\//g, '_')}.png`,
            fullPage: true,
        })
    })
}
