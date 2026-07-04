import { Page } from '@playwright/test'

// global-setup.ts tarafından seed edilen kullanıcıyla UI üzerinden giriş yapar.
// Login sonrası uygulama window.location.href = "/" ile anasayfaya yönlendirir.
export async function loginAs(
    page: Page,
    email = 'user1@e2e.test',
    password = 'Test1234!'
) {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole('button', { name: /Giriş Yap/i }).click()
    // Dev server ilk derlemede "load" eventi gecikebiliyor; dcl yeterli.
    await page.waitForURL('/', { timeout: 30_000, waitUntil: 'domcontentloaded' })
}
