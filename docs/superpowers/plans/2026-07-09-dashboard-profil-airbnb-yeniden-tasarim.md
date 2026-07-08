# Dashboard/Profil — Airbnb Tarzı Yapısal Yeniden Tasarım Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Onaylanmış Airbnb-tarzı mockup'ı gerçek koda dökmek: büyük avatar+serif isim hero, gerçek veriden hesaplanan tamamlanma kartı, yüzen iki-satırlı menü kartları, Çıkış Yap'ın ana ekranın altına taşınması.

**Architecture:** Mevcut `data-mobile-section`/`data-profile-edit` CSS attribute-selector-gate deseni (önceki planlardan) birebir tekrar kullanılır — yeni gate icat edilmez, sadece hedef selector'lar değişir (`.profileViewBlock`→`.completionCard`). Yeni tüm mobil-only elemanlar (`.heroName`, `.completionCard`, `.mobileSignOut`) base `display:none`, mobil media query içinde açılır — masaüstü JSX/CSS akışı hiç değişmez.

**Tech Stack:** Next.js 16 (App Router, client component), CSS Modules, Jest (fs+regex CSS kapsam guard testleri), Playwright.

## Global Constraints

- Kapsam yalnızca mobil (`@media max-width: 768px`) — masaüstü (`profileCard`/`tabPanel`/`tabs`/`settingsSignOutBtn`) hiç değişmez.
- Yeni inline `style={{}}` yazılmaz — **istisna:** `.completionFill`'in genişliği (`width: ${completionPct}%`) gerçekten dinamik/hesaplanmış bir değer, statik bir class ile ifade edilemez; bu dosyada zaten aynı gerekçeyle örnekleri var (e-posta toggle switch'lerinin `left`/`background` inline stilleri, satır ~459-473). Reviewer'a bu istisna açıkça bildirilecek.
- Dokunma hedefleri ≥44×44px.
- `completionPct` formülü: `[avatarUrl, profile?.bio, profile?.linkedin, profile?.website]` dizisinde truthy olanların sayısı / 4 * 100, yuvarlanmış. Test kullanıcısı (tüm alanlar boş, özel avatar yok) için **%0 çıkması doğru ve beklenen** — mockup'taki %40 sadece illüstrasyondu.
- Favorilerim kartında sayaç YOK (mevcut lazy-load-on-open davranışı korunuyor, yeni fetch eklenmiyor).
- `.profileViewBlock`/`.viewField`/`.viewLabel`/`.viewValue`/`.viewLink` CSS'i ve `.editProfileBtn` (kalem butonu) JSX'i tamamen kaldırılır (dead code — ikisi de zaten yalnızca mobil-only'ydi, masaüstü hiç kullanmıyordu).

---

## Dosya Yapısı

- Modify: `src/app/dashboard/profile/page.tsx` — hero/completion state+JSX, menü kartı yeniden yapılandırma, mobil sign-out JSX.
- Modify: `src/app/dashboard/profile/profile.module.css` — yeni class'lar, eski `profileViewBlock`/`editProfileBtn` kaldırma, `tabPanel` koşullu şeffaflık.
- Modify: `src/app/dashboard/profile/profileStyles.scope.test.ts` — yeni guard testleri, eskimiş `profileViewBlock` testlerinin güncellenmesi.

---

### Task 1: Hero (avatar + serif isim) + Tamamlanma Kartı

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/dashboard/profile/profileStyles.scope.test.ts`

**Interfaces:**
- Consumes: mevcut `avatarUrl`/`profile`/`isEditingProfile`/`startEditingProfile` state'leri (değişmiyor).
- Produces: `completionPct: number` (bileşen içinde hesaplanan, render-time değer — yeni bir state değil). Task 2/3 bu task'a bağımlı değil, paralel okunabilir ama JSX konumları çakışmasın diye önce bu uygulanmalı.

- [ ] **Step 1: Write the failing scope tests**

`profileStyles.scope.test.ts`'in `describe` bloğuna ekle (dosyanın en altına, kapanış `})`'dan önce):

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: FAIL — yeni class'lar yok, `.profileViewBlock`/`.editProfileBtn` hâlâ dosyada (son test de fail eder).

- [ ] **Step 3: CSS — `.profileViewBlock`/`.editProfileBtn` kaldırma, `.heroName`/`.completionCard` ekleme**

`profile.module.css`'te şu bloğu (temel `.editProfileBtn` tanımı):

```css
.editProfileBtn {
  display: none;
}
```

tamamen SİL.

Şu bloğu (temel `.profileViewBlock` + `.viewField`/`.viewLabel`/`.viewValue`/`.viewLink`, `.themeColor`'dan sonra `.cancelBtn`'den önce):

```css
.profileViewBlock {
  display: none;
}

.viewField {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.viewLabel {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.viewValue {
  font-size: 0.85rem;
  color: var(--text);
  margin: 0;
  white-space: pre-wrap;
}

.viewLink {
  font-size: 0.85rem;
  color: var(--primary);
  text-decoration: none;
  word-break: break-all;
}
```

Şununla DEĞİŞTİR:

```css
.heroName {
  display: none;
}

.heroNameText {
  font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text);
}

.heroSubline {
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 600;
}

.completionCard {
  display: none;
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
}

.completionTop {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.completionTitle {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.completionPct {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--primary);
}

.completionTrack {
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
  margin-bottom: 10px;
}

.completionFill {
  height: 100%;
  border-radius: 3px;
  background: var(--primary);
}

.completionCta {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}
```

Dosyanın sonundaki mobil `@media (max-width: 768px)` bloğunda, şu satırları (avatar sonrası `.editProfileBtn` mobil kuralı, `.profileViewBlock` mobil kuralları):

```css
  .editProfileBtn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: none;
    border: 1px solid var(--border);
    font-size: 1rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .profileViewBlock {
    display: block;
  }

  .container[data-profile-edit="true"] .profileViewBlock {
    display: none;
  }

  .container[data-profile-edit="false"] .profileEditForm {
    display: none;
  }
```

Şununla DEĞİŞTİR:

```css
  .avatarWrapper,
  .avatarCircle {
    width: 96px;
    height: 96px;
  }

  .nameRow {
    display: none;
  }

  .verifiedBadge {
    display: none;
  }

  .heroName {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 2px;
    margin-top: 4px;
  }

  .completionCard {
    display: block;
  }

  .container[data-profile-edit="true"] .completionCard {
    display: none;
  }

  .container[data-profile-edit="false"] .profileEditForm {
    display: none;
  }
```

(Not: `.nameRow`'un kendisi ve `.nameRow .displayName`/`.nameRow .roleTag` metin-hizalama kuralı dosyada başka bir yerde — o kurallara dokunulmuyor, yalnızca `.nameRow`'un mobildeki `display:flex` değeri yukarıdaki gibi `display:none`'a çevriliyor.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: PASS — tüm testler (yeniler dahil) geçmeli.

- [ ] **Step 5: page.tsx — `completionPct` hesaplaması**

`const getInitials = () => { ... }` fonksiyonunun kapanışından hemen sonra (`if (!session || !mounted) return null` satırından önce) ekle:

```tsx
    const completionChecks = [!!avatarUrl, !!profile?.bio, !!profile?.linkedin, !!profile?.website]
    const completionPct = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100)
```

- [ ] **Step 6: page.tsx — avatar sonrası JSX'i hero + completion card ile değiştir**

Mevcut (avatar `<input>` kapanışından `.profileViewBlock`'un kapanışına kadar — `.profileEditForm`'dan HEMEN önceki her şey):

```tsx
                    <div className={styles.nameRow}>
                        <div>
                            <h2 className={styles.displayName}>{session.user?.name || 'Kullanıcı'}</h2>
                            <p className={styles.roleTag}>{(session.user as { role?: string })?.role || 'USER'}</p>
                        </div>
                        <button
                            type="button"
                            className={styles.editProfileBtn}
                            onClick={startEditingProfile}
                            aria-label="Profili düzenle"
                        >
                            ✏️
                        </button>
                    </div>

                    {profile?.isVerified && (
                        <div className={styles.verifiedBadge}>✓ Doğrulandı</div>
                    )}

                    <div className={styles.profileViewBlock}>
                        <div className={styles.viewField}>
                            <span className={styles.viewLabel}>Hakkında</span>
                            <p className={styles.viewValue}>{profile?.bio || 'Henüz bilgi eklenmedi'}</p>
                        </div>
                        <div className={styles.viewField}>
                            <span className={styles.viewLabel}>LinkedIn</span>
                            {profile?.linkedin
                                ? <a href={profile.linkedin} target="_blank" rel="noreferrer" className={styles.viewLink}>{profile.linkedin}</a>
                                : <p className={styles.viewValue}>Henüz bilgi eklenmedi</p>
                            }
                        </div>
                        <div className={styles.viewField}>
                            <span className={styles.viewLabel}>Website</span>
                            {profile?.website
                                ? <a href={profile.website} target="_blank" rel="noreferrer" className={styles.viewLink}>{profile.website}</a>
                                : <p className={styles.viewValue}>Henüz bilgi eklenmedi</p>
                            }
                        </div>
                    </div>
```

Şununla DEĞİŞTİR:

```tsx
                    <div className={styles.nameRow}>
                        <div>
                            <h2 className={styles.displayName}>{session.user?.name || 'Kullanıcı'}</h2>
                            <p className={styles.roleTag}>{(session.user as { role?: string })?.role || 'USER'}</p>
                        </div>
                    </div>

                    {profile?.isVerified && (
                        <div className={styles.verifiedBadge}>✓ Doğrulandı</div>
                    )}

                    <div className={styles.heroName}>
                        <span className={styles.heroNameText}>{session.user?.name || 'Kullanıcı'}</span>
                        <span className={styles.heroSubline}>
                            {(session.user as { role?: string })?.role || 'USER'}
                            {profile?.isVerified ? ' · ✓ Doğrulandı' : ''}
                        </span>
                    </div>

                    <div className={styles.completionCard}>
                        <div className={styles.completionTop}>
                            <span className={styles.completionTitle}>
                                {completionPct === 100 ? 'Profilin tamam' : `Profilin %${completionPct} tamamlandı`}
                            </span>
                            {completionPct < 100 && <span className={styles.completionPct}>{completionPct}%</span>}
                        </div>
                        {completionPct < 100 && (
                            <div className={styles.completionTrack}>
                                <div className={styles.completionFill} style={{ width: `${completionPct}%` }} />
                            </div>
                        )}
                        <button type="button" className={styles.completionCta} onClick={startEditingProfile}>
                            {completionPct === 100 ? 'Profili düzenle' : 'Profili tamamla'} →
                        </button>
                    </div>
```

- [ ] **Step 7: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/app/dashboard/profile/page.tsx` → 0 ihlal.
Run: `npx jest --no-coverage` → 190 passed (186 mevcut taban + 4 yeni).

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/profileStyles.scope.test.ts src/app/dashboard/profile/page.tsx
git commit -m "feat(profile): Airbnb tarzı hero (büyük avatar+serif isim) ve gerçek veriden tamamlanma kartı"
```

---

### Task 2: Menü Kartları (yüzen 2-satırlı kartlar + gruplama + tabPanel koşullu şeffaflık)

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/dashboard/profile/profileStyles.scope.test.ts`

**Interfaces:**
- Consumes: Task 1'in `data-profile-edit` gate'ine dokunmuyor, bağımsız.
- Produces: yok.

- [ ] **Step 1: Write the failing scope tests**

`profileStyles.scope.test.ts`'e ekle:

```ts
  it('.menuRow yeni min-height 76px olmalı (eski 56px kart deseni yerine yüzen kart)', () => {
    const baseIndex = css.indexOf('.menuRow {')
    const block = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(block).toMatch(/min-height:\s*76px/)
  })

  it('menü görünürken (.data-mobile-section=false) .tabPanel mobilde şeffaflaşmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-mobile-section="false"\]\s+\.tabPanel\s*\{[^}]*background:\s*none/)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: FAIL.

- [ ] **Step 3: CSS — menuRow'u yüzen karta çevir, sectionLabel/menuRowBody/menuSubtitle/menuCount ekle, tabPanel koşullu şeffaflık**

Mevcut `.menuList`/`.menuRow`/`.menuIconBox`/renk varyantları/`.menuLabel`/`.menuChevron` bloğu (Task 1 öncesi commit'te zaten `56px`/renkli-kutu haldeydi):

```css
.menuList {
  display: none;
}

.menuRow {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.menuRow:last-child {
  border-bottom: none;
}

.menuIconBox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  flex-shrink: 0;
}

.menuIconBoxBlue { background: var(--primary); }
.menuIconBoxOrange { background: var(--orange); }
.menuIconBoxRed { background: var(--red); }
.menuIconBoxGray { background: #64748b; }

.menuLabel {
  flex: 1;
}

.menuChevron {
  color: var(--muted);
  font-size: 1.1rem;
}
```

Şununla DEĞİŞTİR:

```css
.menuList {
  display: none;
  flex-direction: column;
  gap: 10px;
}

.sectionLabel {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin: 4px 0 2px;
}

.sectionLabel:not(:first-child) {
  margin-top: 14px;
}

.menuRow {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 76px;
  padding: 14px 16px;
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-radius: 18px;
  color: var(--text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.menuIconBox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  flex-shrink: 0;
}

.menuIconBoxBlue { background: var(--primary); }
.menuIconBoxOrange { background: var(--orange); }
.menuIconBoxRed { background: var(--red); }
.menuIconBoxGray { background: #64748b; }

.menuRowBody {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menuLabel {
  font-size: 0.95rem;
  font-weight: 700;
}

.menuSubtitle {
  font-size: 0.78rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menuCount {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
  flex-shrink: 0;
}

.menuChevron {
  color: var(--muted);
  font-size: 1.1rem;
  flex-shrink: 0;
}
```

(`.menuIconBox`'un boyutu 30px'ten 44px'e çıktı — `ICON_PROPS` içindeki SVG'lerin kendisi 17×17 kalıyor, sadece çevresindeki renkli kutu büyüyor, Task 3'te ayrıca dokunulmuyor.)

Dosyanın sonundaki mobil `@media` bloğuna ekle (`.container[data-mobile-section="true"] .menuList { display: none; }` satırından hemen sonra):

```css
  .container[data-mobile-section="false"] .tabPanel {
    background: none;
    border: none;
    box-shadow: none;
    padding: 0;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: PASS.

- [ ] **Step 5: page.tsx — `MENU_ITEMS`'a subtitle ekle, `menuCount` helper, iki-gruplu render**

Mevcut:

```tsx
const MENU_ITEMS: { key: Tab; icon: ReactNode; colorClass: string; label: string }[] = [
    { key: 'portfolio', icon: <FolderIcon />,   colorClass: styles.menuIconBoxBlue,   label: 'Portfolyo' },
    { key: 'listings',  icon: <BuildingIcon />, colorClass: styles.menuIconBoxOrange, label: 'İlanlarım' },
    { key: 'favorites', icon: <HeartIcon />,    colorClass: styles.menuIconBoxRed,    label: 'Favorilerim' },
    { key: 'settings',  icon: <GearIcon />,     colorClass: styles.menuIconBoxGray,   label: 'Tema & Ayarlar' },
]
```

Şununla DEĞİŞTİR:

```tsx
const MENU_ITEMS: { key: Tab; icon: ReactNode; colorClass: string; label: string; subtitle: string }[] = [
    { key: 'portfolio', icon: <FolderIcon />,   colorClass: styles.menuIconBoxBlue,   label: 'Portfolyo',       subtitle: 'Hesapladığın fizibilite raporları' },
    { key: 'listings',  icon: <BuildingIcon />, colorClass: styles.menuIconBoxOrange, label: 'İlanlarım',       subtitle: 'Yayınladığın ve taslak ilanların' },
    { key: 'favorites', icon: <HeartIcon />,    colorClass: styles.menuIconBoxRed,    label: 'Favorilerim',     subtitle: 'Kaydettiğin ilanlar' },
    { key: 'settings',  icon: <GearIcon />,     colorClass: styles.menuIconBoxGray,   label: 'Tema & Ayarlar',  subtitle: 'Görünüm, bildirimler ve hesap' },
]
```

`const closeSection = () => setMobileSectionOpen(false)` satırının altına ekle:

```tsx

    const menuCount = (key: Tab): number | null => {
        if (key === 'portfolio') return profile?.reports?.length ?? 0
        if (key === 'listings') return profile?.listings?.length ?? 0
        return null
    }
```

- [ ] **Step 6: page.tsx — menu render bloğunu iki gruba ayır**

Mevcut:

```tsx
                    <div className={styles.menuList}>
                        {MENU_ITEMS.map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={styles.menuRow}
                                onClick={() => openSection(item.key)}
                            >
                                <span className={`${styles.menuIconBox} ${item.colorClass}`}>{item.icon}</span>
                                <span className={styles.menuLabel}>{item.label}</span>
                                <span className={styles.menuChevron}>›</span>
                            </button>
                        ))}
                    </div>
```

Şununla DEĞİŞTİR:

```tsx
                    <div className={styles.menuList}>
                        <p className={styles.sectionLabel}>Hesabım</p>
                        {MENU_ITEMS.filter(item => item.key !== 'settings').map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={styles.menuRow}
                                onClick={() => openSection(item.key)}
                            >
                                <span className={`${styles.menuIconBox} ${item.colorClass}`}>{item.icon}</span>
                                <span className={styles.menuRowBody}>
                                    <span className={styles.menuLabel}>{item.label}</span>
                                    <span className={styles.menuSubtitle}>{item.subtitle}</span>
                                </span>
                                {menuCount(item.key) !== null && <span className={styles.menuCount}>{menuCount(item.key)}</span>}
                                <span className={styles.menuChevron}>›</span>
                            </button>
                        ))}
                        <p className={styles.sectionLabel}>Tercihler</p>
                        {MENU_ITEMS.filter(item => item.key === 'settings').map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={styles.menuRow}
                                onClick={() => openSection(item.key)}
                            >
                                <span className={`${styles.menuIconBox} ${item.colorClass}`}>{item.icon}</span>
                                <span className={styles.menuRowBody}>
                                    <span className={styles.menuLabel}>{item.label}</span>
                                    <span className={styles.menuSubtitle}>{item.subtitle}</span>
                                </span>
                                <span className={styles.menuChevron}>›</span>
                            </button>
                        ))}
                    </div>
```

- [ ] **Step 7: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/app/dashboard/profile/page.tsx` → 0 ihlal.
Run: `npx jest --no-coverage` → 192 passed (190 Task 1 sonrası + 2 yeni).

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/profileStyles.scope.test.ts src/app/dashboard/profile/page.tsx
git commit -m "feat(profile): menü satırlarını yüzen 2-satırlı kartlara çevir (alt-satır+sayaç+gruplama), menü görünürken tabPanel şeffaflaşıyor"
```

---

### Task 3: Çıkış Yap'ı ana ekranın altına taşı

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/dashboard/profile/profileStyles.scope.test.ts`

**Interfaces:**
- Consumes: mevcut `signOut` import'u (değişmiyor), `mobileSectionOpen` state.
- Produces: yok.

- [ ] **Step 1: Write the failing scope tests**

`profileStyles.scope.test.ts`'e ekle:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: FAIL.

- [ ] **Step 3: CSS — `.mobileSignOut`/`.mobileSignOutBtn` ekle, mobilde `.settingsSignOutBtn` gizle**

`.settingsSignOutBtn` temel tanımının hemen altına (bkz. `/* Sağ sekme paneli */` yorumundan önce) ekle:

```css
.mobileSignOut {
  display: none;
}

.mobileSignOutBtn {
  background: none;
  border: none;
  color: var(--red);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  padding: 12px;
  min-height: 44px;
}
```

Dosyanın sonundaki mobil `@media` bloğuna ekle:

```css
  .settingsSignOutBtn {
    display: none;
  }

  .mobileSignOut {
    display: flex;
    justify-content: center;
    margin-top: 24px;
  }

  .container[data-mobile-section="true"] .mobileSignOut {
    display: none;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: PASS.

- [ ] **Step 5: page.tsx — mobil sign-out JSX'i ekle**

Dosyanın sonundaki kapanışı bul:

```tsx
                    </div>
                </div>
            </div>
            </div>
        </>
    )
}
```

Şununla DEĞİŞTİR (yeni bir `.mobileSignOut` bloğu `.layout` kapanışından sonra, `.container` kapanışından önce eklendi):

```tsx
                    </div>
                </div>
            </div>

            <div className={styles.mobileSignOut}>
                <button type="button" className={styles.mobileSignOutBtn} onClick={() => signOut()}>
                    Çıkış Yap
                </button>
            </div>
            </div>
        </>
    )
}
```

- [ ] **Step 6: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/app/dashboard/profile/page.tsx` → 0 ihlal.
Run: `npx jest --no-coverage` → 194 passed (192 Task 2 sonrası + 2 yeni).

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/profileStyles.scope.test.ts src/app/dashboard/profile/page.tsx
git commit -m "feat(profile): Çıkış Yap'ı ana mobil ekranın altına taşı (Airbnb deseni), Ayarlar'dan mobilde gizlendi"
```

---

### Task 4: Gerçek tarayıcı doğrulaması + final kontrol

**Files:** Yok (doğrulama task'ı).

**Interfaces:** Yok.

- [ ] **Step 1: Dev ortamının ayakta olduğunu doğrula**

`http://localhost:3000/login` HTTP 200 dönmeli.

- [ ] **Step 2: Mobil akışı Playwright ile doğrula (login: manualcheck@local.test / Test1234!, viewport 390×844)**

Kontrol edilecekler (gerçek tarayıcı oturumu, ekran görüntüleriyle):
1. `/dashboard/profile`'a git — 96px avatar, serif isim, rol+doğrulama alt satırı, tamamlanma kartı (**%0** beklenir — bu test kullanıcısı için doğru) görünüyor mu?
2. Tamamlanma kartındaki "Profili tamamla" butonuna dokun → Hakkında/LinkedIn/Website formu açılıyor mu (mevcut Kaydet/İptal akışı)? İptal'e bas → tamamlanma kartına dönüyor mu?
3. "Hesabım" ve "Tercihler" etiketleri altında 4 yüzen kart (Portfolyo/İlanlarım/Favorilerim/Ayarlar) görünüyor mu, Portfolyo/İlanlarım'da sayaç (`0`) var mı, Favorilerim'de sayaç YOK mu?
4. Portfolyo kartına dokun → AppBar+geri butonu açılıyor mu, arka planda artık hero/tamamlanma-kartı/menü kartları GÖRÜNMÜYOR mu (mevcut `data-mobile-section` davranışı)?
5. Geri dön → menü tekrar görünüyor mu?
6. Sayfanın en altına kaydır → "Çıkış Yap" görünüyor mu (kırmızı, sade)? Ayarlar alt-ekranını aç → İÇİNDE Çıkış Yap YOK mu (mobilde gizlendi)?

- [ ] **Step 3: Masaüstü regresyon (1440×900)**

Kontrol: sol profil kartı BİREBİR ÖNCEKİ GİBİ (form her zaman açık, hero/tamamlanma-kartı/heroName hiç görünmüyor), sağ panelde yatay sekme çubuğu aynen duruyor (yüzen kartlar YOK), Ayarlar sekmesinde Çıkış Yap hâlâ orada duruyor (mobil-only kaldırma masaüstünü etkilemedi).

- [ ] **Step 4: Tam komut paketi**

Run: `npx tsc --noEmit && npx eslint src --quiet && npx jest --no-coverage`
Expected: tsc 0, eslint 0, jest 194 passed.

- [ ] **Step 5: Final commit (varsa doğrulama sırasında bulunan düzeltmeler)**

Sorun yoksa atlanır. Bulunursa düzeltme + commit.
