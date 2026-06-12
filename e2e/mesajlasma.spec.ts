import { test, expect, type Page } from '@playwright/test'

const MESAJ = `E2E selam ${Date.now()}`

async function login(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill('Test1234!')
    await page.getByRole('button', { name: /Giriş Yap/i }).click()
    await page.waitForURL('/', { timeout: 15_000 })
}

test('user1 mesaj gonderir, user2 inboxta gorur', async ({ page, request }) => {
    await login(page, 'user1@e2e.test')

    // Mesajı API üzerinden gönder (sabit seed id: 'e2e-user-2')
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    const res = await request.post('/api/messages', {
        headers: { cookie: cookieHeader },
        data: { receiverId: 'e2e-user-2', content: MESAJ },
    })
    expect(res.status()).toBe(201)

    // user2 inbox'ta görür
    await page.context().clearCookies()
    await login(page, 'user2@e2e.test')
    await page.goto('/inbox')
    await expect(page.getByText('E2E UserBir').first()).toBeVisible({ timeout: 15_000 })
    await page.getByText('E2E UserBir').first().click()
    await expect(page.getByText(MESAJ)).toBeVisible({ timeout: 15_000 })
})
