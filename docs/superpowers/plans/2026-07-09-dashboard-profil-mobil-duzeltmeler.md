# Dashboard/Profil — Canlı Test Sonrası Mobil Düzeltmeler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Canlı testte bulunan 3 gerçek sorunu düzeltmek: çift "Profilim" başlığı, `dashboard/layout`'un `backdrop-filter`'ının `AppBar`'ın sticky konumlandırmasını kırması, ve Hakkında/LinkedIn/Website'in her zaman düzenlenebilir form olarak durması (Instagram tarzı görünüm/düzenleme ayrımına geçilecek).

**Architecture:** İlk iki sorun saf CSS düzeltmesi (JS/JSX değişikliği yok). Üçüncü sorun, önceki planda kurulan `data-mobile-section` CSS attribute-selector-gate deseninin birebir tekrarı: yeni bir `isEditingProfile` state + `data-profile-edit="true"|"false"` attribute'u, görünüm bloğu ve düzenleme formu ikisi de her zaman render edilir, görünürlük CSS ile kontrol edilir.

**Tech Stack:** Next.js 16 (App Router, client component), CSS Modules, Jest (fs+regex tabanlı CSS kapsam guard testleri), Playwright (canlı doğrulama).

## Global Constraints

- Kapsam yalnızca mobil (`@media max-width: 768px`) — masaüstü, `dashboard.module.css`'teki backdrop-filter kaldırma (bilinçli, kullanıcı onaylı, TÜM `/dashboard/*` sayfalarını etkiler) dışında hiç değişmez.
- `.pageTitle` masaüstünde KALMALI (sadece mobilde gizlenir) — `AppBar` masaüstünde `display:none` olduğu için `pageTitle` masaüstünün TEK başlık kaynağı.
- Yeni inline `style={{}}` yazılmaz.
- Dokunma hedefleri ≥44×44px.
- Paylaşılan (masaüstü+mobil) içerik JSX koşuluyla değil, CSS attribute-selector gate ile gizlenir/gösterilir (spec §3.3, önceki planın `data-mobile-section` deseniyle birebir aynı teknik).
- İptal, state'i `profile?.bio ?? ''` gibi son-kaydedilmiş kaynak nesneden resetler — boş string'e değil.

---

## Dosya Yapısı

- Modify: `src/app/dashboard/profile/profile.module.css` — `.pageTitle` mobil gizleme, `.nameRow`/`.editProfileBtn`/`.profileViewBlock`/`.viewField`/`.viewLabel`/`.viewValue`/`.viewLink`/`.cancelBtn` yeni class'lar + `data-profile-edit` gate kuralları.
- Modify: `src/app/dashboard/profile/profileStyles.scope.test.ts` — yeni guard testleri.
- Modify: `src/app/dashboard/dashboard.module.css` — yeni `@media (max-width: 768px)` bloğu, `.mainContent`'in backdrop-filter'ı kaldırılıyor.
- Create: `src/app/dashboard/dashboardStyles.scope.test.ts` — CSS kapsam guard testi (aynı desen, yeni dosya).
- Modify: `src/app/dashboard/profile/page.tsx` — `isEditingProfile` state, görünüm/düzenleme JSX ayrımı, `data-profile-edit` attribute.

---

### Task 1: Çift başlık + AppBar sticky düzeltmesi (saf CSS)

**Files:**
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/dashboard/profile/profileStyles.scope.test.ts`
- Modify: `src/app/dashboard/dashboard.module.css`
- Create: `src/app/dashboard/dashboardStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces: yok (JS/JSX'e dokunmuyor, `page.tsx` zaten `<h1 className={styles.pageTitle}>` ve `<AppBar title="Profilim".../>` ikisini de render ediyor, sadece CSS görünürlüğü değişiyor).

- [ ] **Step 1: Write the failing scope tests**

`src/app/dashboard/profile/profileStyles.scope.test.ts` dosyasının mevcut `describe` bloğunun içine (son `it`'ten sonra, kapanış `})`'dan önce) ekle:

```ts
  it('.pageTitle mobilde gizli olmalı (AppBar zaten başlığı gösteriyor, çift başlık önlenir)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.pageTitle\s*\{[^}]*display:\s*none/)
  })
```

Create `src/app/dashboard/dashboardStyles.scope.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts src/app/dashboard/dashboardStyles.scope.test.ts --no-coverage`
Expected: FAIL — `.pageTitle` mobil kuralı yok, `dashboardStyles.scope.test.ts` `.mainContent` backdrop-filter mobil override'ı bulamıyor (media query hiç yok).

- [ ] **Step 3: Implement — profile.module.css `.pageTitle` mobil gizleme**

`profile.module.css`'in sonundaki `@media (max-width: 768px)` bloğunun İÇİNE (mevcut `.avatarEditBadge { display: flex; }` satırından hemen önce veya bloğun herhangi bir yerine) ekle:

```css
  .pageTitle {
    display: none;
  }
```

- [ ] **Step 4: Implement — dashboard.module.css backdrop-filter mobil kaldırma**

`dashboard.module.css` dosyasının en sonuna (mevcut `@media (max-width: 900px) { .dashShell {...} .sidebar {...} }` bloğunun kapanışından SONRA, dosyanın sonuna) ekle:

```css

/* AppBar sticky düzeltmesi — backdrop-filter yeni bir containing block oluşturup
   position:sticky'yi kırıyor (mainContent'in kendisi hiç kaymıyor, pencere kayıyor,
   AppBar viewport dışına çıkıyor). AppBar yalnızca ≤768px'te göründüğü için düzeltme
   de bu eşikte; mevcut 900px bloğu (sidebar çöküşü) farklı bir amaç, karıştırılmaz. */
@media (max-width: 768px) {
  .mainContent {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts src/app/dashboard/dashboardStyles.scope.test.ts --no-coverage`
Expected: PASS — profileStyles: 10 passed (7 mevcut Task2 + 2 Task2-fix-round + 1 yeni). dashboardStyles: 2 passed.

- [ ] **Step 6: Run full suite to confirm no regressions**

Run: `npx jest --no-coverage`
Expected: PASS — 179 passed (176 mevcut taban + 1 yeni profileStyles testi + 2 yeni dashboardStyles testi).

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/profileStyles.scope.test.ts src/app/dashboard/dashboard.module.css src/app/dashboard/dashboardStyles.scope.test.ts
git commit -m "fix(profile): çift Profilim başlığını ve AppBar'ın backdrop-filter yüzünden kırılan sticky konumlandırmasını düzelt"
```

---

### Task 2: Görünüm/Düzenleme ayrımı (Instagram tarzı, yalnızca mobil)

**Files:**
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/dashboard/profile/profileStyles.scope.test.ts`
- Modify: `src/app/dashboard/profile/page.tsx`

**Interfaces:**
- Consumes: Task 1'in düzelttiği `.pageTitle`/`.mainContent` kurallarıyla hiçbir etkileşimi yok (bağımsız).
- Produces: yok (bu, uygulamanın son kullanıcı yüzeyi — Task 3 Playwright ile doğruluyor).

**Not — test yaklaşımı:** `page.tsx` değişiklikleri için (önceki plandaki Task 3'te olduğu gibi) RTL render testi yazılmıyor — bu sayfa `useSession`+çoklu `fetch` üzerine kurulu, projenin kabul edilmiş konvansiyonu CSS guard testi + gerçek Playwright doğrulaması (Task 3). CSS tarafı için TDD uygulanır (test önce yazılır).

- [ ] **Step 1: Write the failing scope tests**

`src/app/dashboard/profile/profileStyles.scope.test.ts`'in `describe` bloğuna ekle:

```ts
  it('.profileViewBlock masaüstünde gizli, mobilde varsayılan görünür olmalı', () => {
    const baseIndex = css.indexOf('.profileViewBlock {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.profileViewBlock\s*\{[^}]*display:\s*block/)
  })

  it('data-profile-edit="true" iken .profileViewBlock mobilde gizli olmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-profile-edit="true"\]\s+\.profileViewBlock\s*\{[^}]*display:\s*none/)
  })

  it('data-profile-edit="false" iken .profileEditForm mobilde gizli olmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\[data-profile-edit="false"\]\s+\.profileEditForm\s*\{[^}]*display:\s*none/)
  })

  it('.editProfileBtn dokunma hedefi ≥44px olmalı ve masaüstünde gizli olmalı', () => {
    const baseIndex = css.indexOf('.editProfileBtn {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    const mobileMatch = mobileBlock.match(/\.editProfileBtn\s*\{[^}]*\}/)
    expect(mobileMatch).not.toBeNull()
    expect(mobileMatch![0]).toMatch(/width:\s*44px/)
    expect(mobileMatch![0]).toMatch(/height:\s*44px/)
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: FAIL — 5 yeni test başarısız (class'lar henüz yok), Task 1'in testleri dahil önceki testler PASS kalmalı.

- [ ] **Step 3: Implement the CSS**

`profile.module.css`'te `.roleTag` tanımının hemen altına, `.verifiedBadge`'den önce ekle:

```css
.nameRow {
  display: block;
}

.editProfileBtn {
  display: none;
}
```

`.themeColor` tanımının hemen altına (dosyanın mobil media query'sinden önceki son class) ekle:

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

.cancelBtn {
  display: none;
}
```

Dosyanın sonundaki `@media (max-width: 768px)` bloğunun İÇİNE ekle (Task 1'in `.pageTitle` kuralıyla aynı blok):

```css
  .nameRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
  }

  .nameRow .displayName,
  .nameRow .roleTag {
    text-align: left;
  }

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

  .cancelBtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    width: 100%;
    margin-top: 8px;
    background: none;
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: PASS — 15 passed (10 önceki + 5 yeni).

- [ ] **Step 5: Implement page.tsx — state ve handler'lar**

`const [mobileSectionOpen, setMobileSectionOpen] = useState(false)` satırının altına ekle:

```tsx
    const [isEditingProfile, setIsEditingProfile] = useState(false)
```

`const closeSection = () => setMobileSectionOpen(false)` satırının altına ekle:

```tsx

    const startEditingProfile = () => setIsEditingProfile(true)

    const cancelEditingProfile = () => {
        setBio(profile?.bio ?? '')
        setLinkedin(profile?.linkedin ?? '')
        setWebsite(profile?.website ?? '')
        setIsEditingProfile(false)
    }
```

Mevcut `handleSave` fonksiyonunu:

```tsx
    const handleSave = async () => {
        setSaving(true)
        const res = await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: bio || null, linkedin: linkedin || null, website: website || null }),
        })
        if (res.ok) {
            const updated = await res.json()
            setProfile(prev => prev ? { ...prev, ...updated } : prev)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
        setSaving(false)
    }
```

Şununla değiştir (tek satır eklendi: başarılı kayıttan sonra düzenleme modundan çıkılır):

```tsx
    const handleSave = async () => {
        setSaving(true)
        const res = await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: bio || null, linkedin: linkedin || null, website: website || null }),
        })
        if (res.ok) {
            const updated = await res.json()
            setProfile(prev => prev ? { ...prev, ...updated } : prev)
            setSaved(true)
            setIsEditingProfile(false)
            setTimeout(() => setSaved(false), 2000)
        }
        setSaving(false)
    }
```

- [ ] **Step 6: Implement page.tsx — `.container`'a `data-profile-edit` ekle**

Mevcut:

```tsx
            <div className={styles.container} data-mobile-section={mobileSectionOpen ? 'true' : 'false'}>
                <h1 className={styles.pageTitle}>Profilim</h1>
```

Şununla değiştir:

```tsx
            <div
                className={styles.container}
                data-mobile-section={mobileSectionOpen ? 'true' : 'false'}
                data-profile-edit={isEditingProfile ? 'true' : 'false'}
            >
                <h1 className={styles.pageTitle}>Profilim</h1>
```

- [ ] **Step 7: Implement page.tsx — isim/rol/kalem satırı + görünüm/düzenleme blokları**

Mevcut (avatar wrapper'ın kapanışından `saveBtn`'in kapanışına kadar, profileCard'ın geri kalanı):

```tsx
                    <h2 className={styles.displayName}>{session.user?.name || 'Kullanıcı'}</h2>
                    <p className={styles.roleTag}>{(session.user as { role?: string })?.role || 'USER'}</p>

                    {profile?.isVerified && (
                        <div className={styles.verifiedBadge}>✓ Doğrulandı</div>
                    )}

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Hakkında</label>
                        <textarea
                            className={styles.textarea}
                            placeholder="Kendinizi tanıtın..."
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            maxLength={300}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>LinkedIn</label>
                        <input
                            className={styles.input}
                            placeholder="https://linkedin.com/in/..."
                            value={linkedin}
                            onChange={e => setLinkedin(e.target.value)}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Website</label>
                        <input
                            className={styles.input}
                            placeholder="https://..."
                            value={website}
                            onChange={e => setWebsite(e.target.value)}
                        />
                    </div>

                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                        {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
```

Şununla değiştir:

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

                    <div className={styles.profileEditForm}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Hakkında</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Kendinizi tanıtın..."
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                maxLength={300}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>LinkedIn</label>
                            <input
                                className={styles.input}
                                placeholder="https://linkedin.com/in/..."
                                value={linkedin}
                                onChange={e => setLinkedin(e.target.value)}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Website</label>
                            <input
                                className={styles.input}
                                placeholder="https://..."
                                value={website}
                                onChange={e => setWebsite(e.target.value)}
                            />
                        </div>

                        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                            {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button type="button" className={styles.cancelBtn} onClick={cancelEditingProfile}>
                            İptal
                        </button>
                    </div>
                </div>
```

**Not:** `.profileEditForm` için `profile.module.css`'te YENİ bir CSS kuralı YAZILMAZ — bu sarmalayıcı `<div>`'in hiç stil tanımı yok (base `display:block`, media query içinde sadece `data-profile-edit="false"` iken `display:none` olur, Step 3'te zaten eklendi). Bu bilinçli: sarmalayıcının kendisi görünmez bir gruplama div'i, masaüstünde davranışı sıfır fark yaratmaz.

- [ ] **Step 8: Statik doğrulama**

Run: `npx tsc --noEmit`
Expected: 0 hata.

Run: `npx eslint src/app/dashboard/profile/page.tsx src/app/dashboard/profile/profile.module.css`
Expected: 0 ihlal (not: eslint CSS dosyalarını genelde kontrol etmez, sadece `.tsx` için gerçek bir kontrol; komut CSS argümanını sessizce yok sayarsa sorun değil).

Run: `npx jest --no-coverage`
Expected: PASS — 184 passed (179 Task 1 sonrası + 5 Task 2 yeni).

- [ ] **Step 9: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/profileStyles.scope.test.ts src/app/dashboard/profile/page.tsx
git commit -m "feat(profile): Instagram tarzı görünüm/düzenleme ayrımı — Hakkında/LinkedIn/Website mobilde varsayılan salt-okunur, kalem ile düzenleme moduna geçiliyor"
```

---

### Task 3: Gerçek tarayıcı doğrulaması (Playwright) + final kontrol

**Files:** Yok (kod değişikliği içermez, doğrulama task'ı).

**Interfaces:** Yok.

- [ ] **Step 1: Dev ortamının ayakta olduğunu doğrula**

`http://localhost:3000/login` bir HTTP 200 dönmeli (zaten çalışıyor olması beklenir, değilse `docker compose -f docker-compose.dev.yml up -d` + `npm run dev:next` arka planda başlatılır).

- [ ] **Step 2: Mobilde scroll sırasında AppBar'ın viewport'ta kaldığını doğrula**

Aşağıdaki script'i `playwright-skill`'in `run.js`'i ile çalıştır (proje scratchpad dizinine yaz):

```js
const { chromium } = require('playwright');
const TARGET_URL = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 30 });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', 'manualcheck@local.test');
  await page.fill('input[type="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await page.goto(`${TARGET_URL}/dashboard/profile`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Tek başlık kontrolü
  const profilimCount = await page.locator('text=Profilim').count();
  console.log('"Profilim" metni kaç kez görünüyor (1 olmalı — sadece AppBar):', profilimCount);

  // Scroll + AppBar visibility kontrolü
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  const appBarBox = await page.locator('header').first().boundingBox();
  console.log('Scroll sonrası AppBar y-koordinatı (>= 0 olmalı, ekranda kalmalı):', appBarBox?.y);

  await page.screenshot({ path: 'profile-fix-01-scrolled.png' });

  await browser.close();
})();
```

Expected console output: `"Profilim" metni kaç kez görünüyor: 1`, `Scroll sonrası AppBar y-koordinatı: 0` (veya 0'a çok yakın pozitif bir değer — `safe-top` padding'i nedeniyle tam 0 olmayabilir, ama kesinlikle NEGATİF olmamalı).

- [ ] **Step 3: Görünüm/Düzenleme akışını doğrula**

Aynı oturumda (script'e ekle), profil sayfasındayken:

```js
  // Görünüm modu kontrolü
  const kaydetVisibleBeforeEdit = await page.locator('button:visible:has-text("Kaydet")').count();
  console.log('Düzenleme moduna girmeden önce görünür "Kaydet" buton sayısı (0 olmalı):', kaydetVisibleBeforeEdit);

  // Kaleme bas
  await page.locator('[aria-label="Profili düzenle"]').click();
  await page.waitForTimeout(300);
  const kaydetVisibleAfterEdit = await page.locator('button:visible:has-text("Kaydet")').count();
  console.log('Düzenleme modunda görünür "Kaydet" buton sayısı (1 olmalı):', kaydetVisibleAfterEdit);
  const iptalVisible = await page.locator('button:visible:has-text("İptal")').isVisible();
  console.log('İptal butonu görünür:', iptalVisible);

  // İptal ile geri dön
  await page.locator('button:visible:has-text("İptal")').click();
  await page.waitForTimeout(300);
  const kaydetVisibleAfterCancel = await page.locator('button:visible:has-text("Kaydet")').count();
  console.log('İptal sonrası görünür "Kaydet" buton sayısı (0 olmalı):', kaydetVisibleAfterCancel);

  await page.screenshot({ path: 'profile-fix-02-view-edit-toggle.png' });
```

Expected: `0` → `1` (kalem sonrası) → `İptal butonu görünür: true` → `0` (iptal sonrası, görünüm moduna dönüldü).

- [ ] **Step 4: Masaüstü regresyon kontrolü**

Aynı akışı 1440×900 viewport'ta tekrarla: `/dashboard/profile`'a git, ekran görüntüsü al. Beklenen: sol profil kartında Hakkında/LinkedIn/Website formu HER ZAMAN açık (kalem ikonu yok, görünüm bloğu yok — ikisi de `display:none` masaüstünde), "İptal" butonu görünmüyor, "Profilim" başlığı `pageTitle`'dan (h1) geliyor (AppBar zaten masaüstünde yok). `/dashboard/reports` ve `/dashboard/projects` sayfalarında `.mainContent`'in blur/backdrop-filter'ının masaüstünde aynen durduğunu (bilerek sadece mobilde kaldırıldı) bir ekran görüntüsüyle doğrula.

- [ ] **Step 5: Diğer /dashboard sayfalarında mobil backdrop-filter kaldırmanın görsel etkisini kontrol et**

`/dashboard`, `/dashboard/reports`, `/dashboard/projects` sayfalarını 390×844'te ekran görüntüle — sidebar zaten mobilde `display:none` olduğu için görsel fark minimal olmalı, ama gözle bir kontrol yapılır (beklenmedik bir bozulma yoksa devam edilir).

- [ ] **Step 6: Tam komut paketi**

Run: `npx tsc --noEmit && npx eslint src --quiet && npx jest --no-coverage`
Expected: tsc 0 hata, eslint 0 ihlal, jest 184 passed.

- [ ] **Step 7: Final commit (varsa doğrulama sırasında bulunan küçük düzeltmeler)**

Doğrulama sırasında bir sorun bulunmazsa bu adım atlanır. Bulunursa düzeltme + commit:

```bash
git add -A
git commit -m "fix(profile): Playwright doğrulamasında bulunan [sorun] düzeltmesi"
```
