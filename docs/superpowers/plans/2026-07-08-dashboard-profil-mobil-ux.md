# Dashboard/Profil Mobil UX Yeniden Tasarımı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `dashboard/profile` sayfasının mobil görünümünü, sabit görünür avatar-düzenle rozeti + dikey menü listesi → AppBar'lı geri butonlu alt ekran akışıyla yeniden kurmak; masaüstü sekme paneli yapısına dokunmamak.

**Architecture:** Var olan `tab` state'i (`'portfolio'|'listings'|'favorites'|'settings'`) korunur, yeni bir `mobileSectionOpen: boolean` state eklenir. Aynı `tabContent` JSX'i hem masaüstü sekme paneli hem mobil alt-ekran tarafından paylaşılır — görünürlük JSX koşuluyla değil, `.container`'a eklenen `data-mobile-section` attribute'u üzerinden CSS attribute-selector ile (`@media max-width:768px` içinde) kontrol edilir. Bu, `hesapla` sayfasının `data-revealed` deseniyle birebir aynı tekniktir.

**Tech Stack:** Next.js 16 (App Router, client component), CSS Modules, Jest + React Testing Library (jsdom), Playwright (canlı doğrulama).

## Global Constraints

- Kapsam yalnızca mobil (`@media max-width: 768px`) — masaüstü DOM/CSS'i, "Çıkış Yap" butonunun yeni konumu dışında değişmez (spec §3.5, §5 — kullanıcı onaylı bilinçli istisna).
- Yeni inline `style={{}}` yazılmaz; tüm yeni stiller `profile.module.css`'e token/var(--...) ile eklenir.
- Dokunma hedefleri ≥44×44px (`var(--touch-target)` mevcutsa kullanılır, yoksa literal 44px).
- Paylaşılan (masaüstü+mobil) içerik JSX koşuluyla değil, CSS attribute-selector gate ile gizlenir/gösterilir (spec §3.4).
- Mevcut `AppBar`/`fileInputRef`/`handleAvatarUpload`/favorilerin lazy-load `useEffect`'i davranış olarak değişmez.

---

## Dosya Yapısı

- Modify: `src/components/mobile/AppBar.tsx` — opsiyonel `onBack` prop (state-tabanlı geri dönüş için; route değişmiyor).
- Modify: `src/components/mobile/__tests__/AppBar.test.tsx` — `onBack` için yeni test.
- Modify: `src/app/dashboard/profile/profile.module.css` — avatar rozeti, menü listesi, `data-mobile-section` gate kuralları; bugün eklenen geçici 2x2 grid mobil override'ı kaldırılıp yerine tam gizleme + yeni menü stilleri konur.
- Create: `src/app/dashboard/profile/profileStyles.scope.test.ts` — CSS kapsam guard testi (hesapla'daki `pageStyles.scope.test.ts` emsali).
- Modify: `src/app/dashboard/profile/page.tsx` — `AppBar` entegrasyonu, `mobileSectionOpen` state, avatar rozeti markup'ı, menü listesi markup'ı, "Çıkış Yap"ın Ayarlar sekmesine taşınması.

---

### Task 1: AppBar'a `onBack` prop desteği

**Files:**
- Modify: `src/components/mobile/AppBar.tsx`
- Test: `src/components/mobile/__tests__/AppBar.test.tsx`

**Interfaces:**
- Consumes: yok (bağımsız primitif değişikliği).
- Produces: `AppBar` artık `onBack?: () => void` prop'u kabul ediyor. Verilirse `showBack` tıklamasında `backHref`/`router.back()` yerine **öncelikle** `onBack()` çağrılır. Task 3, `<AppBar onBack={closeSection} />` şeklinde tüketecek.

- [ ] **Step 1: Write the failing test**

`src/components/mobile/__tests__/AppBar.test.tsx` dosyasının sonuna (mevcut `describe` bloğu içine, son `it`'ten sonra) ekle:

```tsx
    it('onBack verilirse onBack() çağırır, router.back()/push çağrılmaz', () => {
        const onBack = jest.fn()
        render(<AppBar title="Başlık" showBack onBack={onBack} backHref="/inbox" />)
        fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
        expect(onBack).toHaveBeenCalledTimes(1)
        expect(back).not.toHaveBeenCalled()
        expect(push).not.toHaveBeenCalled()
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/mobile/__tests__/AppBar.test.tsx --no-coverage`
Expected: FAIL — `Property 'onBack' does not exist on type 'IntrinsicAttributes & AppBarProps'` (TS) veya test `onBack` hiç çağrılmadığı için başarısız.

- [ ] **Step 3: Write minimal implementation**

`src/components/mobile/AppBar.tsx` içinde `AppBarProps` interface'ini ve `handleBack`'i güncelle:

```tsx
interface AppBarProps {
    title: string;
    /** Geri butonunu göster; tıklanınca router.back() (backHref verilirse oraya push) */
    showBack?: boolean;
    backHref?: string;
    /** Verilirse geri tıklamasında backHref/router.back() yerine bu çağrılır (route değişmeyen, state-tabanlı geri dönüşler için — örn. profil alt-ekranından menüye dönüş) */
    onBack?: () => void;
    /** Sağ tarafta gösterilecek opsiyonel aksiyon (ikon butonu vb.) */
    action?: React.ReactNode;
}
```

```tsx
export function AppBar({ title, showBack = false, backHref, onBack, action }: AppBarProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) { onBack(); return; }
        if (backHref) router.push(backHref);
        else router.back();
    };
```

(Fonksiyonun geri kalanı ve JSX aynen kalır.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/mobile/__tests__/AppBar.test.tsx --no-coverage`
Expected: PASS — 6 passed (5 mevcut + 1 yeni).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/AppBar.tsx src/components/mobile/__tests__/AppBar.test.tsx
git commit -m "feat(mobile): AppBar'a state-tabanlı geri dönüş için onBack prop'u ekle"
```

---

### Task 2: Mobil menü listesi + avatar rozeti CSS'i + kapsam guard testi

**Files:**
- Modify: `src/app/dashboard/profile/profile.module.css`
- Test: `src/app/dashboard/profile/profileStyles.scope.test.ts` (yeni)

**Interfaces:**
- Consumes: yok.
- Produces: Task 3'ün `page.tsx`'te kullanacağı CSS module class'ları: `.avatarEditBadge`, `.menuList`, `.menuRow`, `.menuIcon`, `.menuLabel`, `.menuChevron`, `.settingsSignOutBtn`. `.container` üzerinde okunan `data-mobile-section="true"|"false"` attribute'u.

- [ ] **Step 1: Write the failing scope test**

Create `src/app/dashboard/profile/profileStyles.scope.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: FAIL — ilk assertion (`mediaIndex`) hariç çoğu `toBeGreaterThan(-1)`/`toMatch` başarısız (class'lar henüz yok).

- [ ] **Step 3: Implement the CSS changes**

`profile.module.css` içinde `.avatarOverlay` tanımının hemen altına (mevcut `.avatarWrapper:hover .avatarOverlay` bloğundan sonra, `.avatarCircle`'dan önce) ekle:

```css
.avatarEditBadge {
  display: none;
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid var(--panel);
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
}
```

`.tabs` tanımının hemen üstüne (sağ sekme paneli bölümü, `.tabPanel`'den sonra) ekle:

```css
.menuList {
  display: none;
}

.menuRow {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 14px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.menuRow:last-child {
  border-bottom: none;
}

.menuIcon {
  font-size: 1.1rem;
}

.menuLabel {
  flex: 1;
}

.menuChevron {
  color: var(--muted);
  font-size: 1rem;
}
```

`.saveBtn:disabled { ... }` kuralının hemen altına ekle:

```css
.settingsSignOutBtn {
  background: none;
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 10px;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  margin-top: 20px;
}
```

Dosyanın sonundaki mobil `@media (max-width: 768px)` bloğunu bul:

```css
@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .profileCard { position: static; }
  .themeGrid { grid-template-columns: repeat(2, 1fr); }

  .tabs {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
  .tab {
    flex: none;
    padding: 0.75rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid var(--border);
  }
  .tabActive {
    border-color: var(--primary);
    background: var(--bg-body);
  }
}
```

Ve tamamen şununla değiştir (bugün eklenen geçici 2x2 grid `.tabs`/`.tab`/`.tabActive` override'ı, yerini menü listesine bıraktığı için kaldırılıyor):

```css
@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .profileCard { position: static; }
  .themeGrid { grid-template-columns: repeat(2, 1fr); }

  .avatarEditBadge {
    display: flex;
  }

  .tabs {
    display: none;
  }

  .menuList {
    display: flex;
    flex-direction: column;
  }

  .container[data-mobile-section="false"] .tabContent {
    display: none;
  }

  .container[data-mobile-section="true"] .menuList {
    display: none;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/dashboard/profile/profileStyles.scope.test.ts --no-coverage`
Expected: PASS — 7 passed.

- [ ] **Step 5: Run full suite to confirm no regressions**

Run: `npx jest --no-coverage`
Expected: PASS — 174 passed (166 mevcut taban + Task 1'in 1 yeni testi + bu task'ın 7 yeni testi).

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/profile/profile.module.css src/app/dashboard/profile/profileStyles.scope.test.ts
git commit -m "feat(profile): mobil menü listesi + avatar rozeti CSS'i + kapsam guard testi"
```

---

### Task 3: page.tsx — AppBar entegrasyonu, menü/alt-ekran state'i, avatar rozeti, Çıkış Yap taşınması

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`

**Interfaces:**
- Consumes: `AppBar` (`title`, `showBack`, `onBack` — Task 1), CSS class'ları `avatarEditBadge`/`menuList`/`menuRow`/`menuIcon`/`menuLabel`/`menuChevron`/`settingsSignOutBtn`/`data-mobile-section` gate (Task 2).
- Produces: yok (bu, uygulamanın son kullanıcı yüzeyi — sonraki task Playwright ile bunu doğruluyor).

**Not — test yaklaşımı:** Bu sayfa `useSession`+çoklu `fetch` (`/api/user/profile/[id]`, `/api/favorites`, `/api/user/avatar`, `/api/user/profile` PATCH) üzerine kurulu; projede bu ağırlıkta mock gerektiren sayfalar için (bkz. `hesapla`'nın `isResultsRevealed` state machine'i) RTL render testi yazılmıyor, kapsam CSS guard testi (Task 2) + gerçek Playwright doğrulaması (Task 4) ile karşılanıyor — bilinçli, dokümante edilmiş bir tutarlılık kararı, yeni bir istisna değil.

- [ ] **Step 1: AppBar import'u ve yeni state/veri ekle**

`page.tsx` başındaki import bloğuna ekle:

```tsx
import { AppBar } from '@/components/mobile/AppBar'
```

`type Tab = 'portfolio' | 'listings' | 'favorites' | 'settings'` satırının altına ekle:

```tsx
const SECTION_TITLES: Record<Tab, string> = {
    portfolio: 'Portfolyo',
    listings:  'İlanlarım',
    favorites: 'Favorilerim',
    settings:  'Tema & Ayarlar',
}

const MENU_ITEMS: { key: Tab; icon: string; label: string }[] = [
    { key: 'portfolio', icon: '📁', label: 'Portfolyo' },
    { key: 'listings',  icon: '🏗️', label: 'İlanlarım' },
    { key: 'favorites', icon: '❤️', label: 'Favorilerim' },
    { key: 'settings',  icon: '⚙️', label: 'Tema & Ayarlar' },
]
```

`const [loadingFavs, setLoadingFavs] = useState(false)` satırının altına ekle:

```tsx
    const [mobileSectionOpen, setMobileSectionOpen] = useState(false)
```

`const applyTheme = ...` fonksiyonundan hemen önce ekle:

```tsx
    const openSection = (key: Tab) => {
        setTab(key)
        setMobileSectionOpen(true)
    }

    const closeSection = () => setMobileSectionOpen(false)
```

- [ ] **Step 2: Avatar wrapper'a görünür düzenle rozeti ekle**

Mevcut:

```tsx
                <div className={styles.profileCard}>
                    <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
                        {avatarUrl
                            ? <Image fill unoptimized src={avatarUrl} alt="Profil fotoğrafı" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                            : <div className={styles.avatarCircle}>{getInitials()}</div>
                        }
                        <div className={styles.avatarOverlay}>
                            {uploadingAvatar ? '⏳' : '📷'}
                        </div>
                        <input
```

Şununla değiştir:

```tsx
                <div className={styles.profileCard}>
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
                            {uploadingAvatar ? '⏳' : '✏️'}
                        </button>
                        <input
```

- [ ] **Step 3: "Çıkış Yap" butonunu profil kartından kaldır**

Mevcut (profil kartının sonu):

```tsx
                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                        {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>

                    <button
                        onClick={() => signOut()}
                        style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 10, padding: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        Çıkış Yap
                    </button>
                </div>
```

Şununla değiştir (Çıkış Yap butonu kaldırıldı):

```tsx
                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                        {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
```

- [ ] **Step 4: Menü listesini `.tabs` div'inin hemen altına ekle**

Mevcut (`.tabs` bloğunun kapanışı, `.tabContent` başlangıcı):

```tsx
                        ))}
                    </div>

                    <div className={styles.tabContent}>
```

Şununla değiştir:

```tsx
                        ))}
                    </div>

                    <div className={styles.menuList}>
                        {MENU_ITEMS.map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={styles.menuRow}
                                onClick={() => openSection(item.key)}
                            >
                                <span className={styles.menuIcon}>{item.icon}</span>
                                <span className={styles.menuLabel}>{item.label}</span>
                                <span className={styles.menuChevron}>›</span>
                            </button>
                        ))}
                    </div>

                    <div className={styles.tabContent}>
```

- [ ] **Step 5: `.container`'a `data-mobile-section` ekle ve `AppBar`'ı sayfaya yerleştir**

Mevcut (return'ün başı):

```tsx
    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Profilim</h1>
```

Şununla değiştir:

```tsx
    return (
        <>
            <AppBar
                title={mobileSectionOpen ? SECTION_TITLES[tab] : 'Profilim'}
                showBack={mobileSectionOpen}
                onBack={closeSection}
            />
            <div className={styles.container} data-mobile-section={mobileSectionOpen ? 'true' : 'false'}>
                <h1 className={styles.pageTitle}>Profilim</h1>
```

Return'ün sonunu (mevcut kapanış `</div>` + `)`) buna göre kapatmak için, dosyanın en sonundaki:

```tsx
            </div>
        </div>
    )
}
```

Şununla değiştir (yeni bir `</div>` girintisi + fragment kapanışı):

```tsx
            </div>
            </div>
        </>
    )
}
```

**Not:** Girinti düzeltmesi isteğe bağlıdır (Prettier/ESLint varsa otomatik düzelir); önemli olan JSX ağacının doğru kapanmasıdır — `<>`...`<AppBar/>`...`<div className={styles.container}>`...(mevcut tüm içerik)...`</div>`...`</>`.

- [ ] **Step 6: Ayarlar sekmesine "Çıkış Yap" ekle**

Mevcut (`tab === 'settings'` bloğunun sonu, e-posta tercihleri kaydet butonunun kapanışı):

```tsx
                                    <button
                                        onClick={saveEmailPrefs}
                                        disabled={savingPrefs}
                                        style={{
                                            marginTop: 16, padding: '8px 20px',
                                            background: savedPrefs ? 'var(--green)' : 'var(--primary)', color: 'white',
                                            border: 'none', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                            opacity: savingPrefs ? 0.6 : 1, transition: 'background 0.3s',
                                        }}
                                    >
                                        {savingPrefs ? 'Kaydediliyor…' : savedPrefs ? 'Kaydedildi ✓' : 'Kaydet'}
                                    </button>
                                </div>
                            </>
                        )}
```

Şununla değiştir:

```tsx
                                    <button
                                        onClick={saveEmailPrefs}
                                        disabled={savingPrefs}
                                        style={{
                                            marginTop: 16, padding: '8px 20px',
                                            background: savedPrefs ? 'var(--green)' : 'var(--primary)', color: 'white',
                                            border: 'none', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                            opacity: savingPrefs ? 0.6 : 1, transition: 'background 0.3s',
                                        }}
                                    >
                                        {savingPrefs ? 'Kaydediliyor…' : savedPrefs ? 'Kaydedildi ✓' : 'Kaydet'}
                                    </button>
                                </div>

                                <button onClick={() => signOut()} className={styles.settingsSignOutBtn}>
                                    Çıkış Yap
                                </button>
                            </>
                        )}
```

- [ ] **Step 7: Statik doğrulama**

Run: `npx tsc --noEmit`
Expected: 0 hata.

Run: `npx eslint src/app/dashboard/profile/page.tsx`
Expected: 0 ihlal.

Run: `npx jest --no-coverage`
Expected: PASS — 174 passed (bu task yeni test eklemiyor, mevcutları bozmamalı).

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/profile/page.tsx
git commit -m "feat(profile): mobilde AppBar + dikey menü listesi → alt-ekran akışı, avatar düzenle rozeti, Çıkış Yap'ın Ayarlar'a taşınması"
```

---

### Task 4: Gerçek tarayıcı doğrulaması (Playwright) + final kontrol

**Files:** Yok (kod değişikliği içermez, doğrulama task'ı).

**Interfaces:** Yok.

- [ ] **Step 1: Dev ortamını ayağa kaldır (zaten çalışmıyorsa)**

Run: `docker compose -f docker-compose.dev.yml up -d` ve `npm run dev:next` (arka planda). `http://localhost:3000` `Ready` mesajını vermeli.

- [ ] **Step 2: Mobilde login → profil → menü → alt-ekran → geri akışını Playwright ile doğrula**

`/tmp/playwright-profile-flow.js` (veya proje scratchpad dizini) içine yaz ve `playwright-skill`'in `run.js`'i ile çalıştır:

```js
const { chromium } = require('playwright');
const TARGET_URL = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
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
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/profile-01-menu.png' });

  // Avatar rozeti görünür mü (hover'sız)?
  const badgeVisible = await page.locator('[aria-label="Profil fotoğrafını değiştir"]').isVisible();
  console.log('Avatar rozeti görünür:', badgeVisible);

  // Menüden Portfolyo'ya gir
  await page.locator('button:has-text("Portfolyo")').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/profile-02-portfolio-detail.png' });
  const backVisible = await page.getByRole('button', { name: 'Geri' }).isVisible();
  console.log('AppBar geri butonu görünür:', backVisible);

  // Geri dön
  await page.getByRole('button', { name: 'Geri' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/profile-03-back-to-menu.png' });

  // Ayarlar'a gir, Çıkış Yap orada mı?
  await page.locator('button:has-text("Tema & Ayarlar")').first().click();
  await page.waitForTimeout(500);
  const signOutVisible = await page.locator('button:has-text("Çıkış Yap")').isVisible();
  console.log('Çıkış Yap Ayarlar altında görünür:', signOutVisible);
  await page.screenshot({ path: '/tmp/profile-04-settings-signout.png' });

  await browser.close();
})();
```

Expected console output:
```
Avatar rozeti görünür: true
AppBar geri butonu görünür: true
Çıkış Yap Ayarlar altında görünür: true
```

Dört ekran görüntüsünü gözle incele: menü listesi (2 satır de değil, 4 satır tek sütun dikey liste), Portfolyo alt-ekranı (AppBar başlığı "Portfolyo" + geri oku), geri dönünce menü, Ayarlar altında Çıkış Yap.

- [ ] **Step 3: Masaüstü regresyon kontrolü**

Aynı script'e 1440×900 viewport ile bir masaüstü bloğu ekle (veya ayrı script): `/dashboard/profile`'a git, ekran görüntüsü al. Beklenen: sol profil kartı + sağ yatay sekme paneli aynen duruyor (Portfolyo/İlanlarım/❤️ Favorilerim/Tema & Ayarlar sekmeleri yan yana), **tek fark** Ayarlar sekmesi içeriğinin en altında artık "Çıkış Yap" butonu var (üst karttan kalktı).

- [ ] **Step 4: Tam komut paketi**

Run: `npx tsc --noEmit && npx eslint src --quiet && npx jest --no-coverage`
Expected: tsc 0 hata, eslint 0 ihlal, jest 174 passed.

- [ ] **Step 5: Final commit (varsa doğrulama sırasında bulunan küçük düzeltmeler)**

Doğrulama sırasında bir sorun bulunmazsa bu adım atlanır. Bulunursa düzeltme + commit:

```bash
git add -A
git commit -m "fix(profile): Playwright doğrulamasında bulunan [sorun] düzeltmesi"
```
