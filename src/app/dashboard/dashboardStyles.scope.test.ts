import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'dashboard.module.css'), 'utf8')

describe('dashboard layout — mobil AppBar sticky düzeltmesi CSS kapsam guard', () => {
  it('.mainContent backdrop-filter kaldırma kuralı @media (max-width: 768px) içinde tanımlı olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    expect(mediaIndex).toBeGreaterThan(-1)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.mainContent\s*\{[^}]*backdrop-filter:\s*none/)
  })

  it('.mainContent temel (masaüstü) tanımı backdrop-filter: blur(16px) olarak kalmalı', () => {
    const baseIndex = css.indexOf('.mainContent {')
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const block = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(block).toMatch(/backdrop-filter:\s*blur\(16px\)/)
  })

  it('.mainContent temel (masaüstü) tanımı overflow-y: auto olarak kalmalı', () => {
    const baseIndex = css.indexOf('.mainContent {')
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    const block = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(block).toMatch(/overflow-y:\s*auto/)
  })

  it('.mainContent overflow mobilde visible olmalı (asıl sticky düzeltmesi — overflow-y:auto, sticky\'nin scroll container referansını mainContent\'e sabitliyordu, mainContent kendisi hiç kaymadığı için sticky hiç devreye girmiyordu)', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.mainContent\s*\{[^}]*overflow:\s*visible/)
  })
})
