# Profil Sayfası (Mobil) — Premium Liquid Glass Sistemine Taşıma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dashboard/profile`'ın mobil ana ekranını (hero kartı + gruplu menü listesi), projenin zaten kurulu "Premium Liquid Glass" mobil tasarım sistemine (`--m-*` token'ları) taşımak — masaüstüne dokunmadan.

**Architecture:** Tek dosya çifti (`page.tsx` + `profile.module.css`), tüm değişiklikler `@media (max-width:768px)` içinde self-gating. `MobileScreen` bilinçli olarak kullanılmıyor (bkz. spec — bilinen `AppBar` stacking-context riski). Yeni bir `avatarRing` sarmalayıcı div'i dışında JSX yapısı değişmiyor.

**Tech Stack:** Next.js (App Router), React, CSS Modules, Jest (`--roots "src"`), TypeScript.

## Global Constraints

- Masaüstü görünüm BİREBİR aynı kalmalı — hiçbir kural media query dışına taşmamalı.
- Bilgi mimarisi (4 menü maddesi, drill-down davranışı) değişmiyor, yalnızca görsel yüzey.
- Kapsam dışı (bu planda YOK): drill-down alt ekranlar, hesap silme modalı, `AppBar`.
- `tsc --noEmit` → 0 hata, `npx jest --no-coverage --roots "src"` → tüm suite yeşil.
- Onaylanan mockup: https://claude.ai/code/artifact/32728664-e0bb-4efb-a3cd-3f5be0692289

Spec: `docs/superpowers/specs/2026-08-08-profil-mobil-liquid-glass-design.md`

---

### Task 1: Hero kartı + menü listesini Liquid Glass sistemine taşı

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx` (avatar sarmalayıcı ~satır 288, heroSubline ~satır 325-331)
- Modify: `src/app/dashboard/profile/profile.module.css` (`.container`, `.profileCard`, `.verifiedBadge`, `.completionCard`, `.completionPct`, `.completionFill`, `.menuRow`, `.menuIconBoxBlue/Orange/Red/Gray`, `.menuCount`, `.sectionLabel` — hepsi `@media (max-width:768px)` içinde; yeni `.avatarRing` class'ı eklenir)
- Test: `src/app/dashboard/profile/profileStyles.scope.test.ts` (dosya sonuna yeni testler eklenir)

**Interfaces:** Yok — tek task, dışa açılan arayüz yok.

- [ ] **Step 1: Yeni regresyon-guard testlerini `profileStyles.scope.test.ts` sonuna ekle (kod henüz değişmeden — FAIL etmeli)**

Mevcut dosyanın `describe` bloğu içine (kapanış `})`'den hemen önce) ekle:

```ts
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
```

Bu testler dosyanın tepesindeki `import fs`/`import path`/`css` değişkenlerini zaten kullanıyor (dosyada mevcut) — `fs`/`path` yeniden import edilmesin, sadece yeni `it()` blokları eklenir.

- [ ] **Step 2: Yeni testlerin FAIL ettiğini doğrula (kod henüz değişmedi)**

Run: `npx jest --no-coverage --roots "src" profileStyles.scope.test.ts`
Expected: Yukarıda eklenen ~8 yeni testten en az 6'sı FAIL (m-mesh/m-glass/mono henüz yok, avatarRing yok, Georgia hâlâ var, verifiedBadge hâlâ koşulsuz gizli, heroSubline hâlâ "Doğrulandı" içeriyor). Masaüstü-değişmedi testi zaten PASS olmalı (henüz hiçbir şey değişmedi).

- [ ] **Step 3: `page.tsx`'te avatar bloğunu `avatarRing` ile sarmala**

`src/app/dashboard/profile/page.tsx` içinde şu bloğu:

```tsx
                    <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
                        {avatarUrl
                            ? <Image fill unoptimized src={avatarUrl} alt="Profil fotoğrafı" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                            : <div className={styles.avatarCircle}>{getInitials()}</div>
                        }
                        <div className={styles.avatarOverlay}>
                            {uploadingAvatar ? '⏳' : '📷'}
                        </div>
                        <button
                            type="button"
                            className={styles.avatarEditBadge}
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                            aria-label="Profil fotoğrafını değiştir"
                        >
                            <span className={styles.avatarEditBadgeIcon}>
                                {uploadingAvatar ? '⏳' : '✏️'}
                            </span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleAvatarUpload}
                        />
                    </div>
```

şuna değiştir (aynı içerik, `avatarRing` sarmalayıcısı eklendi, iç içerik BİREBİR aynı):

```tsx
                    <div className={styles.avatarRing}>
                        <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
                            {avatarUrl
                                ? <Image fill unoptimized src={avatarUrl} alt="Profil fotoğrafı" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                                : <div className={styles.avatarCircle}>{getInitials()}</div>
                            }
                            <div className={styles.avatarOverlay}>
                                {uploadingAvatar ? '⏳' : '📷'}
                            </div>
                            <button
                                type="button"
                                className={styles.avatarEditBadge}
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                                aria-label="Profil fotoğrafını değiştir"
                            >
                                <span className={styles.avatarEditBadgeIcon}>
                                    {uploadingAvatar ? '⏳' : '✏️'}
                                </span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                style={{ display: 'none' }}
                                onChange={handleAvatarUpload}
                            />
                        </div>
                    </div>
```

- [ ] **Step 4: `page.tsx`'te `heroSubline`'dan "Doğrulandı" metnini kaldır**

Şu bloğu:

```tsx
                    <div className={styles.heroName}>
                        <span className={styles.heroNameText}>{session.user?.name || 'Kullanıcı'}</span>
                        <span className={styles.heroSubline}>
                            {(session.user as { role?: string })?.role || 'USER'}
                            {profile?.isVerified ? ' · ✓ Doğrulandı' : ''}
                        </span>
                    </div>
```

şuna değiştir:

```tsx
                    <div className={styles.heroName}>
                        <span className={styles.heroNameText}>{session.user?.name || 'Kullanıcı'}</span>
                        <span className={styles.heroSubline}>
                            {(session.user as { role?: string })?.role || 'USER'}
                        </span>
                    </div>
```

- [ ] **Step 5: `profile.module.css`'te `@media (max-width: 768px)` bloğunun İÇİNE tüm mobil-only kuralları ekle (bu arada `.avatarRing`'in TEK tanımı — masaüstünde hiç kural yok, boş/no-op ruleset yazılmıyor, sadece dosyanın hiçbir yerinde masaüstü için stillenmemiş oluyor)**

Mevcut `@media (max-width: 768px) { ... }` bloğu içinde, `.avatarWrapper,\n  .avatarCircle {\n    width: 96px;\n    height: 96px;\n  }` kuralının hemen ALTINA şunu ekle:

```css
  .avatarRing {
    width: 102px;
    height: 102px;
    border-radius: 50%;
    padding: 3px;
    margin: 0 auto;
    background: var(--m-grad-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .container {
    background: var(--m-mesh), var(--m-bg);
    min-height: 100dvh;
  }

  .profileCard {
    background: var(--m-glass-bg);
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-card);
    backdrop-filter: var(--m-glass-blur);
    -webkit-backdrop-filter: var(--m-glass-blur);
    box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
  }

  .verifiedBadge {
    display: none;
  }

  .container[data-mobile-section="false"] .verifiedBadge {
    display: inline-flex;
    background: rgba(16, 185, 129, 0.14);
    color: #067a56;
    border: none;
    margin: 2px auto 0;
  }

  .completionCard {
    background: none;
    border: none;
    border-radius: 0;
    padding: 10px 0 0;
    border-top: 1px solid rgba(11, 32, 54, 0.08);
    margin-top: 4px;
  }

  .completionPct {
    font-family: var(--m-mono);
    font-variant-numeric: tabular-nums;
    color: #1560d0;
  }

  .completionFill {
    background: var(--m-grad-btn);
  }

  .menuRow {
    background: var(--m-glass-bg);
    border: 1px solid var(--m-glass-border);
    border-radius: var(--m-r-card);
    backdrop-filter: var(--m-glass-blur);
    -webkit-backdrop-filter: var(--m-glass-blur);
    box-shadow: var(--m-sh-card-sm), inset 0 1px 0 #fff;
  }

  .menuIconBoxBlue { background: linear-gradient(135deg, #4f9bff, var(--primary)); }
  .menuIconBoxOrange { background: linear-gradient(135deg, #ffb648, var(--orange)); }
  .menuIconBoxRed { background: linear-gradient(135deg, #ff8189, var(--red)); }
  .menuIconBoxGray { background: linear-gradient(135deg, #8fa1ba, #64748b); }

  .menuCount {
    font-family: var(--m-mono);
    font-variant-numeric: tabular-nums;
  }

  .sectionLabel {
    color: #4c5d78;
  }
```

**ÖNEMLİ:** Bu blok, mevcut `@media (max-width: 768px) { ... }`'in içindeki mevcut kuralların ARASINA/SONUNA eklenir — mevcut hiçbir kural (`.layout`, `.pageTitle`, `.tabs`, `.menuList`, `.container[data-mobile-section=...]` vb.) silinmez veya değiştirilmez. Yalnızca yukarıdaki YENİ kurallar eklenir. `.verifiedBadge { display: none; }` — dikkat: bu satır zaten YOKSA (mevcut CSS'te `.verifiedBadge { display: none; }` satırı zaten aynı içerikle mevcut, spec'te "silinir, yerine ... eklenir" deniyor) önce mevcut `.verifiedBadge { display: none; }` satırını (media query içindeki, satır ~557-559 civarı) SİL, sonra yukarıdaki iki `.verifiedBadge` kuralını (koşulsuz `display:none` + `[data-mobile-section="false"]` override) o satırın yerine ekle — net sonuç: media query içinde `.verifiedBadge` artık İKİ kural içeriyor (koşulsuz gizle + section-false'ta göster), eskisi gibi TEK koşulsuz gizleme kuralı değil.

- [ ] **Step 6: `.heroNameText`'ten `font-family: Georgia, ...` satırını kaldır, `font-weight`'i 700 yap**

Şu bloğu:

```css
.heroNameText {
  font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text);
}
```

şuna değiştir:

```css
.heroNameText {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}
```

- [ ] **Step 7: Yeni testlerin PASS ettiğini doğrula**

Run: `npx jest --no-coverage --roots "src" profileStyles.scope.test.ts`
Expected: Dosyadaki TÜM testler (eski + yeni) PASS.

- [ ] **Step 8: `tsc` ve tam jest suite'ini çalıştır**

Run: `npx tsc --noEmit`
Expected: 0 hata.

Run: `npx jest --no-coverage --roots "src"`
Expected: Tüm suite yeşil.

- [ ] **Step 9: Commit**

```bash
git add src/app/dashboard/profile/page.tsx src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/profileStyles.scope.test.ts
git commit -m "$(cat <<'EOF'
feat(profil): mobil hero+menu Premium Liquid Glass sistemine tasindi

Sayfa 2026-07-28'de kurulan mobil cam sistemine hic tasinmamisti (duz
--panel/--border token'lari kaliyordu). Hero karti + menu satirlari
--m-* cam token'larina gecti, avatar gradyan halka aldi, serif isim
kaldirildi, dogrulanmis rozeti ayri bir cip olarak hero'da gorunur
hale getirildi. Masaustu tamamen dokunulmadan kaldi.
EOF
)"
```

