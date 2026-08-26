import fs from 'fs'
import path from 'path'

const adminCss = fs.readFileSync(path.join(__dirname, 'admin.module.css'), 'utf8')
const districtPage = fs.readFileSync(path.join(__dirname, 'district-prices/page.tsx'), 'utf8')
const settingsPage = fs.readFileSync(path.join(__dirname, 'settings/page.tsx'), 'utf8')

function mobile768Block() {
  const marker = '@media (max-width: 768px)'
  const blocks: string[] = []
  let start = adminCss.indexOf(marker)
  while (start !== -1) {
    const next = adminCss.indexOf('@media', start + marker.length)
    blocks.push(adminCss.slice(start, next === -1 ? undefined : next))
    start = adminCss.indexOf(marker, start + marker.length)
  }
  expect(blocks.length).toBeGreaterThan(0)
  return blocks.join('\n')
}

describe('Admin Faz 8 Task 2 — mobile data card/table contract', () => {
  it('district-prices keeps desktop table and provides mobile DataCard list with all price fields', () => {
    expect(districtPage).toMatch(/className=\{styles\.tableWrap\}/)
    expect(districtPage).toMatch(/className=\{styles\.mobileCardList\}/)
    expect(districtPage).toMatch(/<CardList>/)
    expect(districtPage).toMatch(/<DataCard[\s\S]*title=\{`\$\{p\.il\} — \$\{p\.ilce\}`\}/)
    expect(districtPage).toMatch(/Piyasa \(TL\/m²\)/)
    expect(districtPage).toMatch(/İnşaat \(TL\/m²\)/)
    expect(districtPage).toMatch(/Arsa \(TL\/m²\)/)
  })

  it('settings page keeps editable profit/risk rows; mobile CSS must not hide order/default controls', () => {
    expect(settingsPage).toMatch(/className=\{styles\.profitLevelHeader\}/)
    expect(settingsPage).toMatch(/className=\{styles\.profitLevelRow\}/)
    expect(settingsPage).toMatch(/title="Yukarı"/)
    expect(settingsPage).toMatch(/title="Varsayılan yap"/)

    const mobile = mobile768Block()
    expect(mobile).toMatch(/\.profitLevelHeader\s*\{[^}]*display:\s*none/)
    expect(mobile).toMatch(/\.profitLevelRow\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.profitLevelRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(86px,\s*auto\)/)
    expect(mobile).toMatch(/\.profitLevelRow\s*>\s*\*:nth-child\(3\),\s*\.profitLevelRow\s*>\s*\*:nth-child\(4\)\s*\{[^}]*display:\s*flex/)
  })

  it('mobile admin forms and row controls meet touch target sizing', () => {
    const mobile = mobile768Block()
    expect(mobile).toMatch(/\.formGroup input,\s*\n?\s*\.formGroup select\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    expect(mobile).toMatch(/\.profitLevelRow input\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    expect(mobile).toMatch(/\.iconBtn,\s*\n?\s*\.deleteBtn,\s*\n?\s*\.defaultBadge\s*\{[^}]*min-width:\s*var\(--touch-target\)/)
    expect(mobile).toMatch(/\.adminPrimaryBtn\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
  })

  it('mobile district toolbar can wrap without forcing horizontal overflow', () => {
    const mobile = mobile768Block()
    expect(mobile).toMatch(/\.toolbar\s*\{[^}]*flex-direction:\s*column/)
    expect(mobile).toMatch(/\.searchBox\s*\{[^}]*max-width:\s*none/)
    expect(mobile).toMatch(/\.tableWrap\s*\{[^}]*display:\s*none/)
    expect(mobile).toMatch(/\.mobileCardList\s*\{[^}]*display:\s*block/)
  })
})