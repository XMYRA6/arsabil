import fs from 'fs'
import path from 'path'

const page = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/profile/edit/page.tsx'), 'utf8')

describe('dashboard profile edit route', () => {
    it('owner profilini okuyup mevcut profile PATCH endpointine kaydeder', () => {
        expect(page).toMatch(/fetch\(`\/api\/user\/profile\/\$\{session\.user\.id\}`\)/)
        expect(page).toMatch(/fetch\('\/api\/user\/profile'/)
        expect(page).toMatch(/method: 'PATCH'/)
        expect(page).toMatch(/bio: bio \|\| null/)
        expect(page).toMatch(/linkedin: linkedin \|\| null/)
        expect(page).toMatch(/website: website \|\| null/)
    })

    it('Vazgeç profil sayfasına döner, karakter sayacı gösterilir', () => {
        expect(page).toMatch(/href="\/dashboard\/profile"/)
        expect(page).toMatch(/bio\.length\} \/ 300/)
    })
})
