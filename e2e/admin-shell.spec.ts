import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test('admin girişinde müşteri kabuğu (Navbar/Footer/BottomNavbar) DOM\'da yok, AdminTopBar var', async ({ page }) => {
    // /admin rotasının bu test dosyasındaki İLK ziyareti — taze dev server'da
    // soğuk derleme (login + /admin route compile) varsayılan 60s test
    // limitini zorlayabiliyor (bu oturumda /hesapla ve hesap-silme canlı
    // testlerinde de aynı desenle karşılaşıldı, gerçek bir hata değil).
    test.setTimeout(120_000)
    await loginAs(page, 'admin@e2e.test', 'Test1234!')
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // NOT: getByRole('navigation') KULLANILMAZ — admin/layout.tsx'in kendi
    // sidebar'ı da bir <nav> (styles.sidebarNav), bu yüzden role="navigation"
    // sayısı asla 0 olmaz (admin'in kendi navigasyonu her zaman var, doğru
    // davranış). BottomNavbar'a özgü, admin sidebar'ındaki hiçbir label ile
    // ÇAKIŞMAYAN bir link metni ("Pazar") kullanılıyor.
    await expect(page.locator('footer')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Pazar' })).toHaveCount(0) // BottomNavbar-only link
    await expect(page.getByText('ArsaBil').first()).toBeVisible() // AdminTopBar wordmark
    await expect(page.getByRole('link', { name: /Müşteri Paneline Dön/i })).toBeVisible()
})

test('müşteri sayfalarında kabuk normal şekilde görünür', async ({ page }) => {
    await loginAs(page, 'admin@e2e.test', 'Test1234!')
    await page.goto('/marketplace')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('footer')).toBeVisible()
})
