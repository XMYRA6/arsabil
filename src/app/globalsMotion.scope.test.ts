import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('hareket temeli (premium gezinme hissi)', () => {
    it('defines motion duration tokens', () => {
        expect(css).toMatch(/--dur-enter:\s*240ms/)
        expect(css).toMatch(/--dur-indicator:\s*320ms/)
        expect(css).toMatch(/--dur-press:\s*120ms/)
    })

    it('defines [data-press]:active scale(0.97) rule', () => {
        expect(css).toMatch(/\[data-press\]\s*\{[^}]*transition:\s*transform var\(--dur-press\) var\(--ease-out\)/)
        expect(css).toMatch(/\[data-press\]:active\s*\{[^}]*transform:\s*scale\(0\.97\)/)
    })

    it('disables [data-press] motion under prefers-reduced-motion', () => {
        const m = /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\[data-press\],\s*\[data-press\]:active\s*\{([^}]*)\}/.exec(css)
        expect(m).not.toBeNull()
        expect(m![1]).toMatch(/transition:\s*none/)
        expect(m![1]).toMatch(/transform:\s*none/)
    })
})
