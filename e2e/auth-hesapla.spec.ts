import { test, expect } from '@playwright/test'

const EMAIL = `e2e-yeni-${Date.now()}@test.test`

test('kayit -> login -> hesaplama akisi', async ({ page }) => {
    // Kayıt
    await page.goto('/register')
    await page.locator('input[type="text"]').first().fill('E2E Yeni Kullanici')
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.getByRole('button', { name: /Kayıt Ol/i }).click()

    // Kayıt başarılıysa /login'e yönlendirir
    await page.waitForURL(/login/, { timeout: 15_000 })

    // Login
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.getByRole('button', { name: /Giriş Yap/i }).click()

    // window.location.href = "/" ile / 'e yönlendirir
    await page.waitForURL('/', { timeout: 15_000 })

    // Hesaplama sayfasına git
    await page.goto('/hesapla')
    await expect(page.getByText('Hesap Sonuçları').first()).toBeVisible({ timeout: 15_000 })
})
