import { test, expect, type Page } from '@playwright/test'

const BASLIK = `E2E Arsa ${Date.now()}`

async function login(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.getByRole('button', { name: /Giriş Yap/i }).click()
    await page.waitForURL('/', { timeout: 15_000 })
}

test('ilan olustur -> admin onayla -> marketplace gorunur', async ({ page }) => {
    // user1 ilan oluşturur
    await login(page, 'user1@e2e.test')
    await page.goto('/listings/new')

    // Adım 1: İl seç
    await page.locator('select').first().selectOption('İstanbul')
    await page.getByRole('button', { name: /İleri/i }).click()

    // Adım 2: Başlık ve arsa alanı doldur
    await page.getByPlaceholder(/Kadıköy|başlık/i).fill(BASLIK)
    await page.getByPlaceholder('450', { exact: true }).fill('300')
    await page.getByRole('button', { name: /İleri/i }).click()

    // Adım 3: Fotoğraf (atla)
    await page.getByRole('button', { name: /İleri/i }).click()

    // Adım 4: Fizibilite (atla)
    await page.getByRole('button', { name: /İleri/i }).click()

    // Adım 5: Yayınla
    await page.getByRole('button', { name: /İlanı Yayınla/i }).click()
    // Başarılı publish sonrası /listing/[id] URL'sine yönlendirir
    await page.waitForURL(/\/listing\//, { timeout: 20_000 })

    // admin onaylar
    await page.context().clearCookies()
    await login(page, 'admin@e2e.test')
    await page.goto('/admin/listings')
    await expect(page.getByText(BASLIK).first()).toBeVisible({ timeout: 20_000 })
    await page.getByTitle('Onayla').first().click()
    await expect(page.getByText(/onaylandı/i).first()).toBeVisible({ timeout: 10_000 })

    // marketplace'te görünür
    await page.context().clearCookies()
    await login(page, 'user2@e2e.test')
    await page.goto('/marketplace')
    await expect(page.getByText(BASLIK).first()).toBeVisible({ timeout: 15_000 })
})
