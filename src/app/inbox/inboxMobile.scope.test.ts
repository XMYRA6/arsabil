import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'inbox.module.css'), 'utf8')
const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))

describe('inbox mobil Liquid Glass Faz 4 liste', () => {
  it('konusma listesi cam kartlar, okunmamis durum ve mono zaman etiketi tasir', () => {
    expect(tsx).toMatch(/styles\.convTime/)
    expect(tsx).toMatch(/styles\.avatarUnread/)
    expect(mobile).toMatch(/\.convItem\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.convItem\.convItemActive\s*\{[^}]*background:\s*var\(--m-fill\)\s*!important/)
    expect(mobile).toMatch(/\.convTime\s*\{[^}]*font-family:\s*var\(--m-mono\)/)
    expect(mobile).toMatch(/\.unreadCountBadge\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
  })

  it('mobil inbox kabugu mesh, cam sidebar ve recessed arama kullanir', () => {
    expect(mobile).toMatch(/\.inboxContainer\s*\{[^}]*background:\s*var\(--m-mesh\)/)
    expect(mobile).toMatch(/\.sidebar\s*\{[^}]*background:\s*var\(--m-glass-bg\)\s*!important/)
    expect(mobile).toMatch(/\.searchInput\s*\{[^}]*background:\s*var\(--m-fill\)/)
  })

  it('bos durum ve yukleniyor mobilde cam not karti olarak stillenir', () => {
    expect(mobile).toMatch(/\.emptyConvList,\s*\.loadingList\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.emptyConvList,\s*\.loadingList\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/)
  })

  it('mobil inbox CSS artik --seal-* token sozlesmesine bagli degil', () => {
    expect(mobile).not.toMatch(/--seal-/)
  })
})
