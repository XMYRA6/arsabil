import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'login.module.css'), 'utf8')
const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('login sayfası mobil CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.panel masaüstünde 2 kolon, mobilde 1 kolon olmalı', () => {
    const baseIndex = css.indexOf('.panel {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/grid-template-columns:\s*1fr 1fr/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.panel\s*\{[^}]*grid-template-columns:\s*1fr;/)
  })

  it('.input mobilde --input-height-mobile ve 16px font-size kullanmalı (iOS zoom önleme)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.input\s*\{[^}]*height:\s*var\(--input-height-mobile\)/)
    expect(mobileBlock).toMatch(/\.input\s*\{[^}]*font-size:\s*16px/)
  })

  it('page.tsx artık dangerouslySetInnerHTML kullanmamalı (stil enjeksiyon hack\'i kaldırıldı)', () => {
    expect(tsx).not.toMatch(/dangerouslySetInnerHTML/)
  })

  it('page.tsx artık JS ile stil mutasyonu yapmamalı (gerçek :focus/:hover CSS\'e taşındı)', () => {
    expect(tsx).not.toMatch(/\.target\.style/)
    expect(tsx).not.toMatch(/currentTarget\.style/)
  })

  it('page.tsx artık inline style={{}} kullanmamalı', () => {
    expect(tsx).not.toMatch(/style=\{\{/)
  })
})
