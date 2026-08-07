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

  it('.menuRow yeni min-height 76px olmalı (eski 56px kart deseni yerine yüzen kart)', () => {
    const baseIndex = css.indexOf('.menuRow {')
    const block = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(block).toMatch(/min-height:\s*76px/)
  })

  it('menü görünürken (.data-mobile-section=false) .tabPanel mobilde şeffaflaşmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-mobile-section="false"\]\s+\.tabPanel\s*\{[^}]*background:\s*none/)
  })

  it('.settingsSignOutBtn mobilde gizli, masaüstünde (temel kural) hâlâ görünür olmalı', () => {
    const baseIndex = css.indexOf('.settingsSignOutBtn {')
    const block = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(block).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.settingsSignOutBtn\s*\{[^}]*display:\s*none/)
  })

  it('.mobileSignOut masaüstünde gizli, mobilde görünür, alt-ekran açıkken tekrar gizli olmalı', () => {
    const baseIndex = css.indexOf('.mobileSignOut {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.mobileSignOut\s*\{[^}]*display:\s*flex/)
    expect(mobileBlock).toMatch(/\.container\[data-mobile-section="true"\]\s+\.mobileSignOut\s*\{[^}]*display:\s*none/)
  })

  it('data-mobile-section="true" iken .heroName ve .completionCard mobilde gizli olmalı (alt-ekran acikken hero/tamamlanma karti arka planda gorunmemeli)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-mobile-section="true"\]\s+\.heroName\s*\{[^}]*display:\s*none/)
    expect(mobileBlock).toMatch(/\.container\[data-mobile-section="true"\]\s+\.completionCard\s*\{[^}]*display:\s*none/)
  })

  it('data-mobile-section="true" iken .profileEditForm da mobilde gizli olmalı (profil duzenleme formu ACIKKEN bir menu kartina dokunulursa alt-ekranin arkasinda gorunmemeli — onceden var olan, bu branch disinda kesfedilen bir bosluk)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-mobile-section="true"\]\s+\.profileEditForm\s*\{[^}]*display:\s*none/)
  })

  it('mobil .nameRow blogunda olu (asla calismayan) display:flex/text-align kurali kalmamali (.nameRow zaten display:none, once gelen kurallar erisilemez)', () => {
    const mobileBlock = css.slice(mediaIndex)
    const nameRowNoneIndex = mobileBlock.search(/\.nameRow\s*\{[^}]*display:\s*none/)
    expect(nameRowNoneIndex).toBeGreaterThan(-1)
    const beforeNoneRule = mobileBlock.slice(0, nameRowNoneIndex)
    expect(beforeNoneRule).not.toMatch(/\.nameRow\s*\{/)
    expect(beforeNoneRule).not.toMatch(/\.nameRow\s+\.displayName/)
    expect(beforeNoneRule).not.toMatch(/\.nameRow\s+\.roleTag/)
  })

  it('.container mobilde m-mesh/m-bg arka planı kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.container\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-mesh\)/)
    expect(match![1]).toMatch(/var\(--m-bg\)/)
  })

  it('.profileCard mobilde cam yüzey (m-glass) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.profileCard\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-glass-bg\)/)
    expect(match![1]).toMatch(/var\(--m-glass-blur\)/)
  })

  it('.menuRow mobilde cam yüzey (m-glass) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.menuRow\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-glass-bg\)/)
    expect(match![1]).toMatch(/var\(--m-glass-blur\)/)
  })

  it('.menuCount mobilde mono/tabular-nums olmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.menuCount\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-mono\)/)
    expect(match![1]).toMatch(/tabular-nums/)
  })

  it('.heroNameText artık Georgia/serif kullanmamalı', () => {
    const baseIndex = css.indexOf('.heroNameText {')
    expect(baseIndex).toBeGreaterThan(-1)
    const block = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(block).not.toMatch(/Georgia/)
    expect(block).not.toMatch(/serif/)
  })

  it('.avatarRing class\'ı hem CSS\'te tanımlı hem page.tsx\'te kullanılmalı', () => {
    expect(css).toMatch(/\.avatarRing\s*\{/)
    const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
    expect(tsx).toMatch(/styles\.avatarRing/)
  })

  it('.verifiedBadge mobilde artık koşulsuz gizli olmamalı (yalnızca section açıkken gizli)', () => {
    const mobileBlock = css.slice(mediaIndex)
    // Koşulsuz "sadece display:none" kuralı kalmamalı — yalnızca
    // .container[data-mobile-section="false"] altında görünür olmalı.
    expect(mobileBlock).toMatch(/\.container\[data-mobile-section="false"\]\s+\.verifiedBadge\s*\{[^}]*display:\s*inline-flex/)
  })

  it('page.tsx heroSubline içinde artık "Doğrulandı" metni geçmemeli (çipe taşındı)', () => {
    const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
    const sublineMatch = tsx.match(/heroSubline[^>]*>([\s\S]*?)<\/span>/)
    expect(sublineMatch).not.toBeNull()
    expect(sublineMatch![1]).not.toMatch(/Doğrulandı/)
  })

  it('masaüstü (media query dışı) .profileCard/.menuRow/.verifiedBadge tanımları değişmemiş olmalı', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    expect(desktopBlock).toMatch(/\.profileCard\s*\{[^}]*background:\s*var\(--panel\)/)
    expect(desktopBlock).toMatch(/\.menuRow\s*\{[^}]*background:\s*var\(--bg-body\)/)
    expect(desktopBlock).toMatch(/\.verifiedBadge\s*\{[^}]*background:\s*rgba\(var\(--green-rgb\)/)
  })
})
