import fs from 'fs'
import path from 'path'

const page = fs.readFileSync(path.join(process.cwd(), 'src/app/notifications/page.tsx'), 'utf8')
const css = fs.readFileSync(path.join(process.cwd(), 'src/app/notifications/page.module.css'), 'utf8')
const mobile = css.match(/@media \(max-width: 768px\) \{[\s\S]*$/)?.[0] ?? ''

describe('notifications mobile route', () => {
    it('api/notifications ile listeleme ve okundu aksiyonlarini baglar', () => {
        expect(page).toMatch(/fetch\('\/api\/notifications'\)/)
        expect(page).toMatch(/fetch\(`\/api\/notifications\/\$\{id\}\/read`/)
        expect(page).toMatch(/fetch\('\/api\/notifications', \{ method: 'PATCH' \}\)/)
        expect(page).toMatch(/getNotificationUrl/)
        expect(page).toMatch(/getNotificationIcon/)
    })

    it('okunmamis sayaci, bos durum ve okundu butonunu render eder', () => {
        expect(page).toMatch(/unreadCount/)
        expect(page).toMatch(/Tümünü okundu yap/)
        expect(page).toMatch(/Bildirim yok/)
        expect(page).toMatch(/Okundu/)
    })

    it('mobil kabuk ve bildirim kartlari liquid glass tokenlarini kullanir', () => {
        expect(mobile).toMatch(/\.notificationsShell\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
        expect(mobile).toMatch(/\.heroCard,\s*\.notificationCard,\s*\.emptyCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
        expect(mobile).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/)
    })

    it('mobil aksiyonlar touch-safe gradient, metrikler mono olmalidir', () => {
        expect(mobile).toMatch(/\.markAllButton,\s*\.markButton\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
        expect(mobile).toMatch(/\.markAllButton,\s*\.markButton\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
        expect(mobile).toMatch(/\.unreadMetric strong\s*\{[^}]*font-family:\s*var\(--m-mono\)/)
    })
})