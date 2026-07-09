import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'profile.module.css'), 'utf8')

describe('dashboard/profil mobil UX — CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.avatarEditBadge masaüstünde gizli olmalı (media query dışında display:none)', () => {
    const baseIndex = css.indexOf('.avatarEditBadge {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const block = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(block).toMatch(/display:\s*none/)
  })

  it('.avatarEditBadge mobilde görünür olmalı (media query içinde display:flex)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.avatarEditBadge\s*\{[^}]*display:\s*flex/)
  })

  it('.menuList masaüstünde gizli, mobilde görünür olmalı', () => {
    const baseIndex = css.indexOf('.menuList {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.menuList\s*\{[^}]*display:\s*flex/)
  })

  it('.tabs mobilde tamamen gizlenmeli (menü listesi onun yerini alıyor)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.tabs\s*\{[^}]*display:\s*none/)
  })

  it('data-mobile-section="false" iken .tabContent mobilde gizli olmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-mobile-section="false"\]\s+\.tabContent\s*\{[^}]*display:\s*none/)
  })

  it('data-mobile-section="true" iken .menuList mobilde gizli olmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-mobile-section="true"\]\s+\.menuList\s*\{[^}]*display:\s*none/)
  })

  it('.avatarEditBadge dokunma hedefi ≥44px olmalı (görünür rozet .avatarEditBadgeIcon içinde, ayrı)', () => {
    const baseIndex = css.indexOf('.avatarEditBadge {')
    const block = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(block).toMatch(/width:\s*44px/)
    expect(block).toMatch(/height:\s*44px/)
  })

  it('.settingsSignOutBtn dokunma hedefi ≥44px olmalı', () => {
    const baseIndex = css.indexOf('.settingsSignOutBtn {')
    const block = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(block).toMatch(/min-height:\s*44px/)
  })

  it('.pageTitle mobilde gizli olmalı (AppBar zaten başlığı gösteriyor, çift başlık önlenir)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.pageTitle\s*\{[^}]*display:\s*none/)
  })

  it('data-profile-edit="false" iken .profileEditForm mobilde gizli olmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-profile-edit="false"\]\s+\.profileEditForm\s*\{[^}]*display:\s*none/)
  })

  it('.cancelBtn dokunma hedefi ≥44px olmalı ve masaüstünde gizli olmalı (Kaydet ile birebir aynı davranış, desktop pixel-parity)', () => {
    const baseIndex = css.indexOf('.cancelBtn {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.cancelBtn\s*\{[^}]*min-height:\s*44px/)
  })

  it('.heroName masaüstünde gizli, mobilde görünür olmalı', () => {
    const baseIndex = css.indexOf('.heroName {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.heroName\s*\{[^}]*display:\s*flex/)
  })

  it('.completionCard masaüstünde gizli, mobilde varsayılan görünür olmalı', () => {
    const baseIndex = css.indexOf('.completionCard {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.completionCard\s*\{[^}]*display:\s*block/)
  })

  it('data-profile-edit="true" iken .completionCard mobilde gizli olmalı (eski .profileViewBlock hedefinin yerini aldı)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-profile-edit="true"\]\s+\.completionCard\s*\{[^}]*display:\s*none/)
  })

  it('.profileViewBlock ve .editProfileBtn CSS\'i artık dosyada olmamalı (dead code temizlendi)', () => {
    expect(css).not.toMatch(/\.profileViewBlock/)
    expect(css).not.toMatch(/\.editProfileBtn/)
  })
})
