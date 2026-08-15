import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('profesyonel tema tokenlari', () => {
  it('light ve dark temalarda accent tokenlari var', () => {
    expect(css).toMatch(/\[data-theme="light"\][\s\S]*--accent\s*:/)
    expect(css).toMatch(/\[data-theme="dark"\][\s\S]*--accent\s*:/)
    expect(css).toMatch(/--accent-2\s*:/)
  })

  it('spacing, shadow ve typography tokenlari tanimli', () => {
    for (const token of ['--space-1', '--space-5', '--space-9', '--shadow-xl', '--shadow-hover', '--font-display', '--leading-normal', '--tracking-normal']) {
      expect(css).toContain(token)
    }
  })

  it('compat tokenlari korunur', () => {
    for (const token of ['--primary', '--primary-rgb', '--panel', '--border', '--shadow2']) {
      expect(css).toContain(token)
    }
  })
})
