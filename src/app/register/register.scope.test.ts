import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'register.module.css'), 'utf8')
const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('register sayfası mobil CSS kapsam guard', () => {
  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(css.indexOf('@media (max-width: 768px)')).toBeGreaterThan(-1)
  })

  it('page.tsx artık inline style={{}} kullanmamalı', () => {
    expect(tsx).not.toMatch(/style=\{\{/)
  })

  it('page.tsx Card/Input/Button bileşenlerini hâlâ import ediyor olmalı (paylaşılan bileşenlere dokunulmadı)', () => {
    expect(tsx).toMatch(/from "@\/components\/ui\/Card"/)
    expect(tsx).toMatch(/from "@\/components\/ui\/Input"/)
    expect(tsx).toMatch(/from "@\/components\/ui\/Button"/)
  })
})
