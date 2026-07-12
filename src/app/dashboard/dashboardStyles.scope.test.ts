import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'dashboard.module.css'), 'utf8')
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8')

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

describe('dashboard/projects + dashboard/reports mobil mühür kimliği token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(surface|border)/)
  })

  it('--seal-surface hem dark hem light tema bloğunda, .listingCard/.reportCard için tanımlı olmalı', () => {
    expect(css).toMatch(/\[data-theme="dark"\]\s*\.listingCard,\s*\n?\s*\[data-theme="dark"\]\s*\.reportCard\s*\{[^}]*--seal-surface:/)
    expect(css).toMatch(/\[data-theme="light"\]\s*\.listingCard,\s*\n?\s*\[data-theme="light"\]\s*\.reportCard\s*\{[^}]*--seal-surface:/)
  })

  it('.listingCard/.reportCard mobilde --seal-surface kullanmalı, masaüstü tanımları var(--stat-bg) olarak kalmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    const desktopSection = css.slice(0, mediaIndex)
    const mobileSection = css.slice(mediaIndex)
    expect(mobileSection).toMatch(/\.listingCard,\s*\n?\s*\.reportCard\s*\{[^}]*background:\s*var\(--seal-surface\)/)
    expect(desktopSection).toMatch(/\.reportCard\s*\{[^}]*background:\s*var\(--stat-bg\)/)
    expect(desktopSection).toMatch(/\.listingCard\s*\{[^}]*background:\s*var\(--stat-bg\)/)
  })

  it('.statusActive/.statusClosed mobilde seal token kullanmamalı (semantik renk korunur)', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    const mobileSection = css.slice(mediaIndex)
    expect(mobileSection).not.toMatch(/\.statusActive[^}]*seal-/)
    expect(mobileSection).not.toMatch(/\.statusClosed[^}]*seal-/)
  })

  it('.scenarioMiniValue/.metaValue mobilde tabular-nums olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    const mobileSection = css.slice(mediaIndex)
    expect(mobileSection).toMatch(/\.scenarioMiniValue,\s*\n?\s*\.metaValue\s*\{[^}]*font-variant-numeric:\s*tabular-nums/)
  })

  it('yalnızca TEK bir @media (max-width: 768px) bloğu olmalı (pozisyonel guard testlerinin varsayımı)', () => {
    const matches = css.match(/@media \(max-width: 768px\)/g) || []
    expect(matches.length).toBe(1)
  })
})
