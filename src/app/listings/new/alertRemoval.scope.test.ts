import fs from 'fs'
import path from 'path'

const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('listings/new — window.alert() kaldirildi (2026-08-15)', () => {
    it('handlePublish artik alert() cagirmiyor', () => {
        const fnMatch = tsx.match(/const handlePublish = async \(\) => \{[\s\S]*?\n  \}/)
        expect(fnMatch).not.toBeNull()
        expect(fnMatch![0]).not.toMatch(/alert\(/)
        expect(fnMatch![0]).toMatch(/setPublishError\(/)
    })

    it('publishError state tanimli ve JSX icinde kosullu olarak render ediliyor', () => {
        expect(tsx).toMatch(/const \[publishError, setPublishError\] = useState\(/)
        expect(tsx).toMatch(/\{publishError && \(/)
        expect(tsx).toMatch(/role="alert"/)
    })
})
