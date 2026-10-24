import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/styles/tokens-arazi.css'), 'utf8')

/** `selector { ... }` gövdesini döndürür (ilk eşleşme). */
function block(selector: string): string {
  const i = css.indexOf(selector + ' {')
  expect(i).toBeGreaterThan(-1)
  const open = css.indexOf('{', i)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}
const val = (b: string, name: string) => new RegExp(`${name}\s*:\s*([^;]+);`).exec(b)?.[1].trim().toLowerCase()

describe('Arazi paleti: açık tema', () => {
  const b = block('[data-theme="light"]')
  it.each([
    ['--ink', '#2f3b34'], ['--ink-secondary', '#565e55'], ['--line', '#ddd6c6'],
    ['--surface', '#ffffff'], ['--surface-2', '#ece7dc'], ['--canvas', '#f4f1ea'],
    ['--amber', '#e5a52b'], ['--amber-text', '#8a5a00'], ['--amber-soft', '#f6e7c4'],
    ['--blue', '#1f6feb'], ['--blue-on', '#ffffff'], ['--blue-soft', '#dce8fb'],
    ['--sage', '#6f8f72'], ['--ok', '#2e8b57'], ['--bad', '#c4553b'],
  ])('%s = %s', (name, hex) => expect(val(b, name)).toBe(hex))

  it('eski token adları yeni palete eşlenir', () => {
    expect(val(b, '--bg')).toBe('var(--canvas)')
    expect(val(b, '--panel')).toBe('var(--surface)')
    expect(val(b, '--panel-2')).toBe('var(--surface-2)')
    expect(val(b, '--text')).toBe('var(--ink)')
    expect(val(b, '--muted')).toBe('var(--ink-secondary)')
    expect(val(b, '--border')).toBe('var(--line)')
  })
  it('açık temada siyah yok', () => expect(b).not.toMatch(/#000(000)?\b|#14181f|\bblack\b/i))
})

describe('Arazi paleti: koyu tema', () => {
  const b = block('[data-theme="dark"]')
  it.each([
    ['--ink', '#f3f1ec'], ['--ink-secondary', '#9aa3b2'], ['--line', '#26324a'],
    ['--surface', '#16233b'], ['--surface-2', '#1b2a47'], ['--canvas', '#0f1a2e'],
    ['--amber', '#f2b84b'], ['--amber-text', '#f2b84b'], ['--amber-soft', '#3a3320'],
    ['--blue', '#4c8dff'], ['--blue-on', '#0b1220'], ['--blue-soft', '#1c3258'],
    ['--sage', '#7fa383'], ['--ok', '#4cc38a'], ['--bad', '#f08a72'],
  ])('%s = %s', (name, hex) => expect(val(b, name)).toBe(hex))
})

describe('Ortak token katmanı', () => {
  it('düğme/çip katmanları ve gölge tanımlı', () => {
    for (const t of ['--radius-pill', '--radius-card', '--radius-field', '--shadow-card', '--ease-out', '--ease-in-out', '--dur-press', '--dur-ui']) {
      expect(css).toContain(t)
    }
  })
  it('hareket tokenları öğretilen değerlerle birebir', () => {
    expect(css).toContain('cubic-bezier(0.23, 1, 0.32, 1)')
    expect(css).toContain('cubic-bezier(0.77, 0, 0.175, 1)')
  })
})
