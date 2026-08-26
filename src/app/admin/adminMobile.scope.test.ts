import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'admin.module.css'), 'utf8')
const layout = fs.readFileSync(path.join(__dirname, 'layout.tsx'), 'utf8')

function mobile768Block() {
  const marker = '@media (max-width: 768px)'
  const start = css.indexOf(marker)
  expect(start).toBeGreaterThan(-1)
  const next = css.indexOf('@media', start + marker.length)
  return css.slice(start, next === -1 ? undefined : next)
}

describe('Admin Faz 8 Task 1 — mobile shell contract', () => {
  it('layout exposes mobile admin shell landmarks for CSS-only responsive behavior', () => {
    expect(layout).toMatch(/<aside[^>]*className=\{styles\.sidebar\}/)
    expect(layout).toMatch(/<nav[^>]*className=\{styles\.sidebarNav\}/)
    expect(layout).toMatch(/<main[^>]*className=\{styles\.mainContent\}/)
  })

  it('768px mobile shell keeps desktop grid out and adds safe-area aware padding', () => {
    const mobile = mobile768Block()
    expect(mobile).toMatch(/\.adminShell\s*\{[^}]*display:\s*flex/)
    expect(mobile).toMatch(/\.adminShell\s*\{[^}]*padding:\s*calc\(var\(--mobile-safe-top\)[^;]*\)/)
    expect(mobile).toMatch(/\.adminShell\s*\{[^}]*min-height:\s*calc\(100dvh - var\(--topbar-height\)/)
  })

  it('mobile sidebar becomes a sticky horizontal admin rail with scroll fade', () => {
    const mobile = mobile768Block()
    expect(mobile).toMatch(/\.sidebar\s*\{[^}]*position:\s*sticky/)
    expect(mobile).toMatch(/\.sidebar\s*\{[^}]*top:\s*var\(--topbar-height\)/)
    expect(mobile).toMatch(/\.sidebar\s*\{[^}]*overflow-x:\s*auto/)
    expect(mobile).toMatch(/\.sidebar\s*\{[^}]*mask-image:\s*linear-gradient\(to right/)
  })

  it('mobile nav items are touch-safe, icon+label, and active state uses admin accent', () => {
    const mobile = mobile768Block()
    expect(mobile).toMatch(/\.navItem\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    expect(mobile).toMatch(/\.navItem\s*\{[^}]*white-space:\s*nowrap/)
    expect(mobile).toMatch(/\.navItemActive\s*\{[^}]*background:\s*linear-gradient\([^}]*var\(--admin-accent\)/)
  })

  it('mobile main content is unframed and reserves bottom safe-area space', () => {
    const mobile = mobile768Block()
    expect(mobile).toMatch(/\.mainContent\s*\{[^}]*background:\s*transparent/)
    expect(mobile).toMatch(/\.mainContent\s*\{[^}]*border:\s*0/)
    expect(mobile).toMatch(/\.mainContent\s*\{[^}]*padding-bottom:\s*calc\(var\(--bottomnav-height\) \+ var\(--mobile-safe-bottom\)/)
  })
})