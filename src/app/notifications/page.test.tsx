import fs from 'fs'
import path from 'path'

const page = fs.readFileSync(path.join(process.cwd(), 'src/app/notifications/page.tsx'), 'utf8')

describe('notifications sayfası', () => {
    it('api/notifications ile listeleme ve okundu aksiyonlarini baglar', () => {
        expect(page).toMatch(/fetch\('\/api\/notifications'\)/)
        expect(page).toMatch(/fetch\(`\/api\/notifications\/\$\{id\}\/read`/)
        expect(page).toMatch(/fetch\('\/api\/notifications', \{ method: 'PATCH' \}\)/)
        expect(page).toMatch(/getNotificationUrl/)
    })

    it('okunmamis sayaci, bos durum ve okundu butonunu render eder', () => {
        expect(page).toMatch(/unreadCount/)
        expect(page).toMatch(/Tümünü okundu yap/)
        expect(page).toMatch(/Bildirim yok/)
        expect(page).toMatch(/Okundu/)
    })
})
