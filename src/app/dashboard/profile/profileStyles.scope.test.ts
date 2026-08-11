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

  it('mobilde .menuLabel/.heroNameText/.heroSubline/.menuSubtitle tema-bağımlı var(--text)/var(--muted) KULLANMAMALI (koyu temada okunmaz olur — --m-* light-only glass yüzeyler üzerinde --m-ink/--m-body kullanılmalı)', () => {
    const mobileBlock = css.slice(mediaIndex)

    const menuLabelMatch = mobileBlock.match(/\.menuLabel\s*\{([^}]*)\}/)
    expect(menuLabelMatch).not.toBeNull()
    expect(menuLabelMatch![1]).not.toMatch(/var\(--text\)/)
    expect(menuLabelMatch![1]).not.toMatch(/var\(--muted\)/)
    expect(menuLabelMatch![1]).toMatch(/var\(--m-ink\)/)

    const heroNameTextMatch = mobileBlock.match(/\.heroNameText\s*\{([^}]*)\}/)
    expect(heroNameTextMatch).not.toBeNull()
    expect(heroNameTextMatch![1]).not.toMatch(/var\(--text\)/)
    expect(heroNameTextMatch![1]).not.toMatch(/var\(--muted\)/)
    expect(heroNameTextMatch![1]).toMatch(/var\(--m-ink\)/)

    const heroSublineMatch = mobileBlock.match(/\.heroSubline\s*\{([^}]*)\}/)
    expect(heroSublineMatch).not.toBeNull()
    expect(heroSublineMatch![1]).not.toMatch(/var\(--text\)/)
    expect(heroSublineMatch![1]).not.toMatch(/var\(--muted\)/)
    expect(heroSublineMatch![1]).toMatch(/var\(--m-body\)/)

    const menuSubtitleMatch = mobileBlock.match(/\.menuSubtitle\s*\{([^}]*)\}/)
    expect(menuSubtitleMatch).not.toBeNull()
    expect(menuSubtitleMatch![1]).not.toMatch(/var\(--text\)/)
    expect(menuSubtitleMatch![1]).not.toMatch(/var\(--muted\)/)
    expect(menuSubtitleMatch![1]).toMatch(/var\(--m-body\)/)
  })

  it('data-mobile-section="true" iken .tabPanel mobilde cam yüzey (m-glass) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.container\[data-mobile-section="true"\]\s+\.tabPanel\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-glass-bg\)/)
    expect(match![1]).toMatch(/var\(--m-glass-blur\)/)
  })

  it('.listRow mobil bloğunda var(--m-glass-border) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.listRow\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-glass-border\)/)
  })

  it('.listTitle/.listMeta/.emptyNote mobilde var(--m-ink)/var(--m-body) kullanmalı, var(--text)/var(--muted) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)

    const listTitleMatch = mobileBlock.match(/\.listTitle\s*\{([^}]*)\}/)
    expect(listTitleMatch).not.toBeNull()
    expect(listTitleMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(listTitleMatch![1]).not.toMatch(/var\(--text\)/)

    const listMetaMatch = mobileBlock.match(/\.listMeta\s*\{([^}]*)\}/)
    expect(listMetaMatch).not.toBeNull()
    expect(listMetaMatch![1]).toMatch(/var\(--m-body\)/)
    expect(listMetaMatch![1]).not.toMatch(/var\(--muted\)/)

    const emptyNoteMatch = mobileBlock.match(/\.emptyNote\s*\{([^}]*)\}/)
    expect(emptyNoteMatch).not.toBeNull()
    expect(emptyNoteMatch![1]).toMatch(/var\(--m-body\)/)
    expect(emptyNoteMatch![1]).not.toMatch(/var\(--muted\)/)
  })

  it('.favRow/.favIcon mobil bloğunda cam yüzey (m-glass) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const favRowMatch = mobileBlock.match(/\.favRow\s*\{([^}]*)\}/)
    expect(favRowMatch).not.toBeNull()
    expect(favRowMatch![1]).toMatch(/var\(--m-glass-border\)/)

    const favIconMatch = mobileBlock.match(/\.favIcon\s*\{([^}]*)\}/)
    expect(favIconMatch).not.toBeNull()
    expect(favIconMatch![1]).toMatch(/var\(--m-grad-btn\)/)
  })

  it('.favTitle/.favMeta/.favSectionTitle/.favEmpty mobilde var(--m-ink)/var(--m-body) kullanmalı, var(--text)/var(--muted)/var(--card-title) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)

    const favTitleMatch = mobileBlock.match(/\.favTitle\s*\{([^}]*)\}/)
    expect(favTitleMatch).not.toBeNull()
    expect(favTitleMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(favTitleMatch![1]).not.toMatch(/var\(--card-title\)/)

    const favMetaMatch = mobileBlock.match(/\.favMeta\s*\{([^}]*)\}/)
    expect(favMetaMatch).not.toBeNull()
    expect(favMetaMatch![1]).toMatch(/var\(--m-body\)/)
    expect(favMetaMatch![1]).not.toMatch(/var\(--muted\)/)

    const favSectionTitleMatch = mobileBlock.match(/\.favSectionTitle\s*\{([^}]*)\}/)
    expect(favSectionTitleMatch).not.toBeNull()
    expect(favSectionTitleMatch![1]).toMatch(/var\(--m-ink\)/)

    const favEmptyMatch = mobileBlock.match(/\.favEmpty\s*\{([^}]*)\}/)
    expect(favEmptyMatch).not.toBeNull()
    expect(favEmptyMatch![1]).toMatch(/var\(--m-body\)/)
  })

  it('masaüstü (media query dışı) .favRow tanımı mevcut inline değerlerin birebir karşılığı olmalı (pixel-parity)', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    expect(desktopBlock).toMatch(/\.favRow\s*\{[^}]*background:\s*var\(--bg\)/)
  })

  it('page.tsx favorites bloğunda artık style={{ deseni geçmemeli', () => {
    const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
    const favStart = tsx.indexOf("tab === 'favorites' &&")
    const favEnd = tsx.indexOf("tab === 'settings' &&")
    expect(favStart).toBeGreaterThan(-1)
    expect(favEnd).toBeGreaterThan(favStart)
    const favBlock = tsx.slice(favStart, favEnd)
    expect(favBlock).not.toMatch(/style=\{\{/)
    expect(favBlock).toMatch(/styles\.favRow/)
  })

  it('.toggleSwitchOn/.btnPrimarySmall mobilde var(--m-grad-btn) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const toggleMatch = mobileBlock.match(/\.toggleSwitchOn\s*\{([^}]*)\}/)
    expect(toggleMatch).not.toBeNull()
    expect(toggleMatch![1]).toMatch(/var\(--m-grad-btn\)/)

    const btnMatch = mobileBlock.match(/\.btnPrimarySmall\s*\{([^}]*)\}/)
    expect(btnMatch).not.toBeNull()
    expect(btnMatch![1]).toMatch(/var\(--m-grad-btn\)/)
  })

  it('.btnDangerSmall mobilde var(--m-danger) kullanmalı, #ef4444 KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.btnDangerSmall\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-danger\)/)
    expect(match![1]).not.toMatch(/#ef4444/)
  })

  it('.settingsSectionTitle/.toggleLabel mobilde var(--m-ink) kullanmalı, var(--text)/var(--card-title) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)

    const titleMatch = mobileBlock.match(/\.settingsSectionTitle\s*\{([^}]*)\}/)
    expect(titleMatch).not.toBeNull()
    expect(titleMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(titleMatch![1]).not.toMatch(/var\(--card-title\)/)

    const labelMatch = mobileBlock.match(/\.toggleLabel\s*\{([^}]*)\}/)
    expect(labelMatch).not.toBeNull()
    expect(labelMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(labelMatch![1]).not.toMatch(/var\(--text\)/)
  })

  it('masaüstü (media query dışı) .btnDangerSmall tanımı hâlâ #ef4444 kullanmalı (pixel-parity)', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    const match = desktopBlock.match(/\.btnDangerSmall\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/#ef4444/)
  })

  it('page.tsx settings bloğunda artık toggle/silme butonu style={{ deseni geçmemeli', () => {
    const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
    const settingsStart = tsx.indexOf("tab === 'settings' &&")
    const settingsEnd = tsx.indexOf('{showDeleteModal &&')
    expect(settingsStart).toBeGreaterThan(-1)
    expect(settingsEnd).toBeGreaterThan(settingsStart)
    const settingsBlock = tsx.slice(settingsStart, settingsEnd)
    expect(settingsBlock).toMatch(/styles\.toggleSwitch/)
    expect(settingsBlock).toMatch(/styles\.btnDangerSmall/)
    expect(settingsBlock).not.toMatch(/color:\s*'#ef4444'/)
  })

  it('.deleteModalCard mobilde cam yüzey (m-glass) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.deleteModalCard\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-glass-border\)/)
    expect(match![1]).toMatch(/var\(--m-glass-blur\)/)
  })

  it('.deleteModalConfirm mobilde var(--m-danger) kullanmalı, #ef4444 KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.deleteModalConfirm\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-danger\)/)
    expect(match![1]).not.toMatch(/#ef4444/)
  })

  it('.deleteModalTitle/.deleteModalBody mobilde var(--m-ink)/var(--m-body) kullanmalı, var(--card-title)/var(--muted) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)

    const titleMatch = mobileBlock.match(/\.deleteModalTitle\s*\{([^}]*)\}/)
    expect(titleMatch).not.toBeNull()
    expect(titleMatch![1]).toMatch(/var\(--m-ink\)/)
    expect(titleMatch![1]).not.toMatch(/var\(--card-title\)/)

    const bodyMatch = mobileBlock.match(/\.deleteModalBody\s*\{([^}]*)\}/)
    expect(bodyMatch).not.toBeNull()
    expect(bodyMatch![1]).toMatch(/var\(--m-body\)/)
    expect(bodyMatch![1]).not.toMatch(/var\(--muted\)/)
  })

  it('masaüstü (media query dışı) .deleteModalConfirm/.deleteModalCard tanımları mevcut inline değerlerin birebir karşılığı olmalı (pixel-parity)', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    expect(desktopBlock).toMatch(/\.deleteModalConfirm\s*\{[^}]*#ef4444/)
    expect(desktopBlock).toMatch(/\.deleteModalCard\s*\{[^}]*background:\s*var\(--panel\)/)
  })

  it('page.tsx silme modalı bloğunda artık style={{ deseni geçmemeli (dinamik opacity haric)', () => {
    const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
    const modalStart = tsx.indexOf('{showDeleteModal &&')
    const modalEnd = tsx.indexOf('<div className={styles.mobileSignOut}>')
    expect(modalStart).toBeGreaterThan(-1)
    expect(modalEnd).toBeGreaterThan(modalStart)
    const modalBlock = tsx.slice(modalStart, modalEnd)
    expect(modalBlock).toMatch(/styles\.deleteModalOverlay/)
    expect(modalBlock).toMatch(/styles\.deleteModalConfirm/)
    expect(modalBlock).not.toMatch(/background:\s*'#ef4444'/)
  })
})
