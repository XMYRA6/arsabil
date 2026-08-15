import fs from 'fs'
import path from 'path'

const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('dashboard/profile — window.alert() kaldirildi (2026-08-15)', () => {
    it('handleExportData artik alert() cagirmiyor', () => {
        const fnMatch = tsx.match(/const handleExportData = async \(\) => \{[\s\S]*?\n    \}/)
        expect(fnMatch).not.toBeNull()
        expect(fnMatch![0]).not.toMatch(/alert\(/)
        expect(fnMatch![0]).toMatch(/setExportError\(/)
    })

    it('exportError state tanimli ve JSX icinde kosullu olarak render ediliyor', () => {
        expect(tsx).toMatch(/const \[exportError, setExportError\] = useState\(/)
        expect(tsx).toMatch(/\{exportError && \(/)
    })
})
