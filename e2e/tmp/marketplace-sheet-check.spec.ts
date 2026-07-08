import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers'

test.use({ viewport: { width: 390, height: 844 } })

test('marketplace filter sheet opens above navbar and closes on backdrop tap', async ({ page }) => {
    await loginAs(page)
    await page.goto('/marketplace')
    await page.waitForLoadState('networkidle')
    await page
        .getByText('Yükleniyor')
        .first()
        .waitFor({ state: 'hidden', timeout: 15_000 })
        .catch(() => {})

    await page.getByRole('button', { name: /Filtreler/ }).click()
    await page.waitForTimeout(400) // sheet animasyonu
    await page.screenshot({ path: 'e2e/tmp/sheet-open.png', fullPage: false })

    // sheet content visible
    const sheet = page.getByLabel('Filtreler')
    await expect(sheet.getByText('SATIŞ TÜRÜ')).toBeVisible()

    // tap backdrop (top area, above sheet) to close
    await page.mouse.click(195, 50)
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'e2e/tmp/sheet-closed.png', fullPage: false })
    await expect(sheet).toBeHidden()
})
