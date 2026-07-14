# Admin Panel — Mobil UX Düzeltmeleri + Mühür Kimliği (Faz 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 7 admin sayfasında (Genel Bakış, Kullanıcılar, İlan Yönetimi, Teklifler, Analitik, Motor Ayarları, İlçe Fiyatları) mobil görünümdeki gerçek kullanılabilirlik bug'larını (tablo aksiyonlarının keşfedilemeyen yatay kaydırmada kaybolması, sabit çok-kolonlu grid'ler, sidebar kaydırma ipucu eksikliği) gidermek ve Mühür Lacivert görsel kimliğini (cam yüzey + pirinç vurgu) admin paneline taşımak.

**Architecture:** Faz 0'da inşa edilip hiç kullanılmamış `DataCard`/`CardList` primitifi (`src/components/mobile/DataCard.tsx`), 4 tablolu sayfada (Kullanıcılar/İlan Yönetimi/Teklifler/İlçe Fiyatları) mobil-only self-gating CSS ile (`.tableWrap`/`.mobileCardList` çifti, `@media` içinde `display` swap) masaüstü tabloya paralel render edilir — JS tabanlı `isMobile` kontrolü yok, saf CSS. Paylaşılan `admin.module.css`'e tek seferlik bir "Faz 4 temeli" eklenir (cam yüzey token'ları, pirinç vurgu, scroll-fade), bu değişiklik `statBox`/`settingsCard`/`toolbar`/`navItemActive`/`segmentTabActive` gibi zaten paylaşılan sınıflar üzerinden 7 sayfaya otomatik yayılır. Sadece DataCard dönüşümü gerektiren 4 sayfa ve grid-fix gerektiren Analitik sayfası ayrı task alır; Genel Bakış hiç dokunulmaz, Motor Ayarları ve İlçe Fiyatları'ndaki birincil butonlar küçük bir `className` eklemesiyle pirince geçer.

**Tech Stack:** Next.js 16 (App Router, `"use client"`), React 19, TypeScript, CSS Modules, Jest + React Testing Library, Playwright (final doğrulama).

## Global Constraints

- Masaüstü görünüm/layout hiçbir sayfada değişmez — **tek istisna:** `.navItemActive`/`.segmentTabActive`/admin birincil butonları rengi `var(--primary)`'den `var(--admin-accent)` (#C9A15A) değişir, bu hem masaüstü hem mobilde geçerlidir (kullanıcı kararı, brainstorming 2026-07-14).
- Cam yüzey (`--seal-surface`+`blur(24px)`) ve `DataCard` dönüşümü **yalnızca mobil**, admin'in kendi mevcut breakpoint'i `@media (max-width: 900px)` içinde (diğer sayfaların 768px'inden farklı — admin.module.css'in mevcut breakpoint'i korunur, değiştirilmez).
- `globals.css`'e yeni `--seal-*` token eklenmez — hepsi `admin.module.css`'in kendi mobil bloğuna scope'lanır.
- Semantik renkler (rol rozetleri, durum badge'leri: Aktif/Askıda/Onaylı/Bekliyor/Red, yeşil/kırmızı/turuncu) hiç değişmez.
- Her CSS değişikliği bir scope-guard jest testiyle kilitlenir (dosya içeriğini regex ile doğrulayan, `dashboardStyles.scope.test.ts` deseninin aynısı).
- Admin sayfa bileşenleri (`AdminUsers`, `AdminListings` vb.) `useSession` çağırmaz, sadece `fetch` kullanır — testlerde ağır `next-auth` mock'lamaya gerek yok, `global.fetch` mock'lamak yeterli.
- Tüm yeni para/yüzde/sayı değerleri (DataCard `fields`'a geçirilenler) `styles.tabularNums` class'ıyla sarmalanır.

---

## Task 1: `admin.module.css` Temeli — Pirinç Vurgu + Mobil Cam Yüzey + Scroll-Fade

**Files:**
- Modify: `src/app/admin/admin.module.css`
- Test: `src/app/admin/admin.scope.test.ts` (yeni)

**Interfaces:**
- Consumes: mevcut `.adminShell` içindeki `--admin-accent: #C9A15A` (L13), mevcut `@media (max-width: 900px)` bloğu (L405-430).
- Produces: `.tabularNums` (sayı/para değerleri için, sonraki tüm task'lar kullanır), `.dataCardGlass` (DataCard'a `className` olarak geçirilecek, Task 2+ kullanır), `.mobileCardList`/`.tableWrap` self-gating çifti (Task 3-6 kullanır), `.adminPrimaryBtn` (Task 6+8 kullanır).

- [ ] **Step 1: Scope-guard testini yaz (henüz karşılanmayan beklentiler)**

`src/app/admin/admin.scope.test.ts`:

```ts
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'admin.module.css'), 'utf8')
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8')

describe('admin.module.css — Faz 4 pirinç vurgu (masaüstü + mobil, admin geneli)', () => {
  it('.navItemActive artık --admin-accent kullanmalı, --primary DEĞİL', () => {
    const block = css.slice(css.indexOf('.navItemActive {'), css.indexOf('.navItemActive {') + 300)
    expect(block).toMatch(/background:\s*var\(--admin-accent\)/)
    expect(block).not.toMatch(/background:\s*var\(--primary\)/)
  })

  it('.segmentTabActive artık --admin-accent kullanmalı, --primary DEĞİL', () => {
    const idx = css.indexOf('.segmentTabActive {', css.indexOf('/* Segment Tabs'))
    const block = css.slice(idx, idx + 200)
    expect(block).toMatch(/background:\s*var\(--admin-accent\)/)
    expect(block).not.toMatch(/background:\s*var\(--primary\)/)
  })

  it('.adminPrimaryBtn admin-accent tabanlı bir arka plan tanımlamalı', () => {
    expect(css).toMatch(/\.adminPrimaryBtn\s*\{[^}]*#C9A15A/)
  })
})

describe('admin.module.css — Faz 4 mobil cam yüzey token kapsamı', () => {
  it('--seal-surface globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-surface/)
  })

  it('Faz 4 mobil bloğu MEVCUT @media (max-width: 900px) düzen bloğu içinde tanımlı olmalı (yeni bir üçüncü blok DEĞİL)', () => {
    const markerIdx = css.indexOf('/* Faz 4')
    expect(markerIdx).toBeGreaterThan(-1)
    const firstMediaIdx = css.indexOf('@media (max-width: 900px)')
    const secondMediaIdx = css.indexOf('@media (max-width: 900px)', firstMediaIdx + 1)
    expect(markerIdx).toBeGreaterThan(firstMediaIdx)
    // profitLevel grid bloğundan (ikinci 900px bloğu) önce gelmeli — aynı (ilk) blok içinde
    expect(markerIdx).toBeLessThan(secondMediaIdx)
  })

  it('--seal-surface hem dark hem light tema bloğunda .adminShell için tanımlı olmalı', () => {
    expect(css).toMatch(/\[data-theme="dark"\]\s*\.adminShell\s*\{[^}]*--seal-surface:/)
    expect(css).toMatch(/\[data-theme="light"\]\s*\.adminShell\s*\{[^}]*--seal-surface:/)
  })

  it('.statBox/.settingsCard/.toolbar mobilde --seal-surface + blur(24px) kullanmalı', () => {
    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.statBox,\s*\n?\s*\.settingsCard,\s*\n?\s*\.toolbar\s*\{[^}]*background:\s*var\(--seal-surface\)/)
    expect(mobileBlock).toMatch(/backdrop-filter:\s*blur\(24px\)/)
  })

  it('.dataCardGlass mobilde !important ile seal-surface uygulamalı (kaynak sırası bağımsız override garantisi)', () => {
    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.dataCardGlass\s*\{[^}]*background:\s*var\(--seal-surface\)\s*!important/)
  })

  it('.sidebar mobilde sağ kenar scroll-fade mask uygulamalı (marketplace .topBar deseninin aynısı)', () => {
    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.sidebar\s*\{[^}]*mask-image:\s*linear-gradient\(to right/)
  })

  it('.mobileCardList masaüstünde gizli, mobilde görünür olmalı; .tableWrap tersi', () => {
    const desktopIdx = css.indexOf('.mobileCardList {')
    expect(desktopIdx).toBeGreaterThan(-1)
    const desktopBlock = css.slice(desktopIdx, css.indexOf('}', desktopIdx))
    expect(desktopBlock).toMatch(/display:\s*none/)

    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.mobileCardList\s*\{[^}]*display:\s*block/)
    expect(mobileBlock).toMatch(/\.tableWrap\s*\{[^}]*display:\s*none/)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/admin/admin.scope.test.ts --no-coverage`
Expected: FAIL (çoğu `expect` henüz karşılanmıyor — `.navItemActive` hâlâ `--primary` kullanıyor, `.adminPrimaryBtn`/`.dataCardGlass`/`.mobileCardList`/seal token'ları hiç yok).

- [ ] **Step 3: `admin.module.css`'i güncelle**

`.navItemActive` (mevcut L84-88) değiştir:

```css
.navItemActive {
    background: var(--admin-accent) !important;
    color: #0F2A43 !important;
    box-shadow: 0 4px 14px rgba(201, 161, 90, 0.35);
}
```

`.segmentTabActive` (mevcut L378-382) değiştir:

```css
.segmentTabActive {
    background: var(--admin-accent);
    color: #0F2A43;
    font-weight: 700;
}
```

Dosyanın sonuna (mevcut `.profitLevelRow`/`.profitLevelHeader` responsive bloğundan SONRA, dosya sonu) ekle:

```css
/* Admin birincil buton — pirinç vurgu (masaüstü + mobil, admin geneli) */
.adminPrimaryBtn {
    background: linear-gradient(135deg, #C9A15A 0%, #B08A45 100%) !important;
    color: #0F2A43 !important;
    box-shadow: 0 8px 24px rgba(201, 161, 90, 0.35), inset 0 1px 0 rgba(255, 255, 255, .25) !important;
}

.adminPrimaryBtn:hover:not(:disabled) {
    box-shadow: 0 12px 32px rgba(201, 161, 90, 0.35), inset 0 1px 0 rgba(255, 255, 255, .25) !important;
    filter: brightness(1.05) !important;
}

/* Sayı/para değerleri — DataCard fields içinde kullanılır */
.tabularNums {
    font-variant-numeric: tabular-nums;
}

/* DataCard/CardList sayfaları — masaüstünde tablo görünür, kart listesi gizli (self-gating, JS kontrolü yok) */
.mobileCardList {
    display: none;
}
```

Mevcut `.tableWrap` (L228-232) tanımının SONUNA (aynı seçici içine, yeni bir satır olarak) hiçbir şey eklenmez — `display:none` override'ı SADECE mobil media query'sinde tanımlanacak (aşağıda).

Mevcut `@media (max-width: 900px)` bloğunu (L405-430) şu şekilde genişlet — `.sidebar` kuralını ve blok sonunu değiştir:

```css
@media (max-width: 900px) {
    .adminShell {
        grid-template-columns: 1fr;
    }

    .sidebar {
        flex-direction: row;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        -webkit-mask-image: linear-gradient(to right, black calc(100% - 28px), transparent 100%);
        mask-image: linear-gradient(to right, black calc(100% - 28px), transparent 100%);
    }

    .sidebar::-webkit-scrollbar {
        display: none;
    }

    .sidebarNav {
        flex-direction: row;
        padding: 0.5rem;
    }

    .sidebarHeader {
        display: none;
    }

    .navItem {
        white-space: nowrap;
        font-size: 0.85rem;
        padding: 0.6rem 0.75rem;
    }

    /* Faz 4 — Mühür kimliği: mobil cam yüzey (bkz. docs/superpowers/specs/2026-07-14-admin-panel-mobil-muhur-kimlik-design.md) */
    [data-theme="dark"] .adminShell {
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-border: rgba(201, 161, 90, 0.25);
    }

    [data-theme="light"] .adminShell {
        --seal-surface: var(--shell-bg);
        --seal-border: var(--shell-border);
    }

    .statBox,
    .settingsCard,
    .toolbar {
        background: var(--seal-surface);
        border-color: var(--seal-border);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .dataCardGlass {
        background: var(--seal-surface) !important;
        border-color: var(--seal-border) !important;
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .tableWrap {
        display: none;
    }

    .mobileCardList {
        display: block;
    }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/admin/admin.scope.test.ts --no-coverage`
Expected: PASS (tüm testler yeşil)

- [ ] **Step 5: Tam admin.module.css'i tsc/eslint ile doğrula**

Run: `npx tsc --noEmit && npx eslint src/app/admin/admin.module.css --no-eslintrc -c .eslintrc.json 2>/dev/null; npx eslint src/app/admin`
Expected: 0 hata (CSS dosyaları eslint kapsamında değilse ikinci komut no-op döner, önemli olan `npx eslint src/app/admin` üzerinden ilgili `.tsx` dosyalarının hâlâ 0 uyarı vermesi — bu task hiçbir `.tsx` değiştirmediği için zaten temiz olmalı)

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/admin.module.css src/app/admin/admin.scope.test.ts
git commit -m "feat(admin): pirinç vurgu + mobil cam yüzey token temeli (Faz 4 task 1)"
```

---

## Task 2: `DataCard`'a Admin Cam Varyantı için `className` Prop'u

**Files:**
- Modify: `src/components/mobile/DataCard.tsx`
- Modify: `src/components/mobile/__tests__/DataCard.test.tsx`

**Interfaces:**
- Consumes: Task 1'in ürettiği `styles.dataCardGlass` (admin.module.css'te tanımlı, `admin/*/page.tsx` dosyaları import edip DataCard'a geçirecek).
- Produces: `DataCard` artık opsiyonel `className?: string` prop'u kabul ediyor; Task 3-6 bunu `className={styles.dataCardGlass}` olarak kullanacak.

- [ ] **Step 1: Başarısız testi yaz**

`src/components/mobile/__tests__/DataCard.test.tsx` dosyasına, mevcut `describe('DataCard', ...)` bloğunun İÇİNE (son `it` bloğundan sonra, kapanış `})` öncesine) ekle:

```ts
    it('className prop\'u verilirse kök <li>\'ye eklenir (varsayılan .card sınıfının yanına)', () => {
        const { container } = render(
            <CardList>
                <DataCard title="İlan D" className="customGlass" />
            </CardList>
        )
        const li = container.querySelector('li')
        expect(li?.className).toContain('customGlass')
    })
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/components/mobile/__tests__/DataCard.test.tsx --no-coverage`
Expected: FAIL — `className` prop'u `DataCardProps`'ta yok, `li`'ye hiç eklenmiyor (TypeScript derleme hatası veya `toContain` başarısızlığı).

- [ ] **Step 3: `DataCard.tsx`'i güncelle**

`DataCardProps` interface'ine ekle (mevcut `href?: string;` satırından sonra):

```ts
    /** Ek CSS class'ı — kök <li>'ye eklenir, `styles.card`'ın YANINA (üzerine yazmaz) */
    className?: string;
```

Fonksiyon imzasını güncelle:

```ts
export function DataCard({ title, subtitle, fields = [], actions, href, className }: DataCardProps) {
```

`return` bloğundaki `<li className={styles.card}>` satırını değiştir:

```tsx
    return (
        <li className={`${styles.card}${className ? ` ${className}` : ''}`}>
            {href ? <Link href={href} className={styles.link}>{body}</Link> : body}
            {actions && <div className={styles.actions}>{actions}</div>}
        </li>
    );
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/components/mobile/__tests__/DataCard.test.tsx --no-coverage`
Expected: PASS (5 önceki + 1 yeni = 6 test yeşil)

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/DataCard.tsx src/components/mobile/__tests__/DataCard.test.tsx
git commit -m "feat(mobile): DataCard'a opsiyonel className prop'u eklendi (admin cam varyantı için)"
```

---

## Task 3: Kullanıcılar Sayfası — Mobil `DataCard` Görünümü

**Files:**
- Modify: `src/app/admin/users/page.tsx`
- Test: `src/app/admin/users/AdminUsers.test.tsx` (yeni)

**Interfaces:**
- Consumes: `styles.mobileCardList`/`styles.dataCardGlass`/`styles.tabularNums` (Task 1), `DataCard`/`CardList` + `className` prop (Task 2). Sayfanın kendi mevcut state/handler'ları (`filteredUsers`, `handleRoleChange`, `handleBan`, `handleVerified`, `handlePlan`, `formatDate`, `getRoleStyle`, `ROLES`) — HİÇBİRİ değişmiyor.
- Produces: Masaüstü tablo dalı (`.tableWrap`) hiç değişmeden kalır; yeni mobil dal aynı veriyi `DataCard` ile render eder.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/admin/users/AdminUsers.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminUsers from './page'

const mockUser = {
    id: 'user-1',
    name: 'Ayşe Yılmaz',
    email: 'ayse@test.com',
    role: 'USER',
    plan: 'FREE',
    isVerified: false,
    isBanned: false,
    createdAt: '2026-01-15T00:00:00.000Z',
    _count: { reports: 2, listings: 1, offers: 0 },
}

beforeEach(() => {
    global.fetch = jest.fn((url: string, opts?: RequestInit) => {
        if (!opts || opts.method === undefined) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ users: [mockUser] }),
            }) as unknown as Promise<Response>
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
        }) as unknown as Promise<Response>
    }) as jest.Mock
})

describe('AdminUsers — mobil DataCard görünümü', () => {
    it('kullanıcı adı hem masaüstü tabloda hem mobil kartta render edilir (2 kopya)', async () => {
        render(<AdminUsers />)
        await waitFor(() => expect(screen.getAllByText('Ayşe Yılmaz')).toHaveLength(2))
        expect(screen.getAllByText('ayse@test.com').length).toBeGreaterThan(0)
    })

    it('mobil karttaki askıya al butonu tıklanınca PATCH isteği isBanned:true ile atılır', async () => {
        window.confirm = jest.fn(() => true)
        render(<AdminUsers />)
        await waitFor(() => expect(screen.getAllByText('Ayşe Yılmaz').length).toBeGreaterThan(0))

        const banButtons = screen.getAllByTitle('Askıya Al')
        fireEvent.click(banButtons[banButtons.length - 1])

        await waitFor(() => {
            const calls = (global.fetch as jest.Mock).mock.calls
            const patchCall = calls.find(c => c[1]?.method === 'PATCH' && JSON.parse(c[1].body).isBanned === true)
            expect(patchCall).toBeDefined()
        })
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/admin/users/AdminUsers.test.tsx --no-coverage`
Expected: FAIL — mobil `DataCard` dalı henüz yok. İlk test `getAllByText('Ayşe Yılmaz')`'da yalnızca 1 eşleşme (masaüstü tablo) bulduğu için `toHaveLength(2)` başarısız olur. İkinci test `getAllByTitle('Askıya Al')`'da yalnızca 1 buton bulur (masaüstü tablonunki) — bu tek başına test'i kırmaz (buton zaten var ve tıklanabilir), asıl kanıt ilk testin FAIL olmasıdır; ikinci test bu aşamada yanlışlıkla PASS edebilir, bu kabul edilebilir (mobil dal eklendikten sonra ikinci butonu da kapsayacak şekilde genişler).

- [ ] **Step 3: `admin/users/page.tsx`'i güncelle**

Import satırına ekle (mevcut `import styles from '../admin.module.css';` altına):

```ts
import { DataCard, CardList } from '@/components/mobile/DataCard';
```

`.tableWrap` bloğunu kapatan `</div>` satırından hemen SONRA (return içindeki JSX'te, `{loading ? (...) : (<div className={styles.tableWrap}>...</div>)}` bloğunun dışına, aynı seviyeye) yeni bir kardeş blok ekle:

```tsx
            {!loading && (
                <div className={styles.mobileCardList}>
                    <CardList>
                        {filteredUsers.map(user => (
                            <DataCard
                                key={user.id}
                                className={styles.dataCardGlass}
                                title={user.name || '—'}
                                subtitle={user.email || '—'}
                                fields={[
                                    {
                                        label: 'Rol',
                                        value: (
                                            <span className={styles.roleBadge} style={getRoleStyle(user.role)}>
                                                {ROLES.find(r => r.value === user.role)?.label || user.role}
                                            </span>
                                        ),
                                    },
                                    {
                                        label: 'Durum',
                                        value: user.isBanned ? '🚫 Askıda' : '✅ Aktif',
                                    },
                                    {
                                        label: 'Doğrulandı',
                                        value: (
                                            <div
                                                onClick={() => handleVerified(user.id, !user.isVerified)}
                                                style={{
                                                    width: 36, height: 18, borderRadius: 9,
                                                    background: user.isVerified ? 'var(--green)' : '#30363d',
                                                    position: 'relative', cursor: 'pointer',
                                                }}
                                            >
                                                <div style={{
                                                    width: 14, height: 14, background: 'white', borderRadius: '50%',
                                                    position: 'absolute', top: 2,
                                                    left: user.isVerified ? 20 : 2,
                                                }} />
                                            </div>
                                        ),
                                    },
                                    {
                                        label: 'Plan',
                                        value: (
                                            <select
                                                value={user.plan ?? 'FREE'}
                                                onChange={e => handlePlan(user.id, e.target.value)}
                                                className={styles.roleSelect}
                                                style={{ fontSize: '0.78rem', height: 28 }}
                                            >
                                                <option value="FREE">FREE</option>
                                                <option value="PRO">PRO</option>
                                            </select>
                                        ),
                                    },
                                    {
                                        label: 'Rapor / İlan / Teklif',
                                        value: (
                                            <span className={styles.tabularNums}>
                                                {user._count.reports} / {user._count.listings} / {user._count.offers}
                                            </span>
                                        ),
                                    },
                                    { label: 'Kayıt', value: formatDate(user.createdAt) },
                                ]}
                                actions={
                                    <>
                                        <select
                                            className={styles.roleSelect}
                                            value={user.role}
                                            onChange={e => handleRoleChange(user.id, e.target.value)}
                                            style={{ fontSize: '0.78rem', height: 32, flex: 1 }}
                                        >
                                            {ROLES.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleBan(user.id, !user.isBanned)}
                                            title={user.isBanned ? 'Askıyı Kaldır' : 'Askıya Al'}
                                            className={styles.iconBtn}
                                            style={{
                                                background: user.isBanned ? 'rgba(var(--green-rgb),.1)' : 'rgba(var(--red-rgb),.1)',
                                                color: user.isBanned ? 'var(--green)' : 'var(--red)',
                                            }}
                                        >
                                            {user.isBanned ? '✓' : '⛔'}
                                        </button>
                                    </>
                                }
                            />
                        ))}
                    </CardList>
                </div>
            )}
```

Bu blok, mevcut `{loading ? (...) : (<div className={styles.tableWrap}>...)}` bloğunun kapanışından hemen sonra, `</>`'den önce gelir.

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/admin/users/AdminUsers.test.tsx --no-coverage`
Expected: PASS (2/2)

- [ ] **Step 5: Tam paket doğrulama**

Run: `npx tsc --noEmit && npx eslint src/app/admin/users/page.tsx`
Expected: 0 hata

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/users/page.tsx src/app/admin/users/AdminUsers.test.tsx
git commit -m "feat(admin): Kullanıcılar sayfasına mobil DataCard görünümü eklendi"
```

---

## Task 4: İlan Yönetimi Sayfası — Mobil `DataCard` Görünümü

**Files:**
- Modify: `src/app/admin/listings/page.tsx`
- Test: `src/app/admin/listings/AdminListings.test.tsx` (yeni)

**Interfaces:**
- Consumes: Task 1/2'nin ürettiği `styles.mobileCardList`/`styles.dataCardGlass`/`styles.tabularNums`, `DataCard`/`CardList`. Sayfanın mevcut `filtered`, `approveAction`, `toggleActive`, `deleteListing`, `formatDate`, `formatPrice` fonksiyonları.
- Produces: Mobil `DataCard` dalı, masaüstü tablo dalı dokunulmadan kalır.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/admin/listings/AdminListings.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminListings from './page'

const mockListing = {
    id: 'listing-1',
    title: 'Test Arsa İlanı',
    city: 'İstanbul',
    district: 'Kadıköy',
    isActive: false,
    status: 'PENDING',
    createdAt: '2026-01-15T00:00:00.000Z',
    user: { name: 'Mehmet Öz', email: 'mehmet@test.com' },
    report: { title: 'Rapor', minApartmentPrice: 5000000, landShareRatio: 0.33, totalApartments: 8 },
    _count: { offers: 2 },
}

beforeEach(() => {
    global.fetch = jest.fn((_url: string, opts?: RequestInit) => {
        if (!opts) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ listings: [mockListing] }) }) as unknown as Promise<Response>
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) as unknown as Promise<Response>
    }) as jest.Mock
})

describe('AdminListings — mobil DataCard görünümü', () => {
    it('mobil kart listesinde ilan başlığı ve sahibi görünür (tablo + kart = 2 kopya)', async () => {
        render(<AdminListings />)
        await waitFor(() => expect(screen.getAllByText('Test Arsa İlanı')).toHaveLength(2))
        expect(screen.getAllByText('Mehmet Öz').length).toBeGreaterThan(0)
    })

    it('mobil karttaki Onayla butonu tıklanınca PATCH isteği action:approve ile atılır', async () => {
        render(<AdminListings />)
        await waitFor(() => expect(screen.getAllByText('Test Arsa İlanı')).toHaveLength(2))

        const approveButtons = screen.getAllByText('✅ Onayla')
        fireEvent.click(approveButtons[approveButtons.length - 1])

        await waitFor(() => {
            const calls = (global.fetch as jest.Mock).mock.calls
            const patchCall = calls.find(c => c[1]?.method === 'PATCH' && JSON.parse(c[1].body).action === 'approve')
            expect(patchCall).toBeDefined()
        })
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/admin/listings/AdminListings.test.tsx --no-coverage`
Expected: FAIL — `getAllByText('Test Arsa İlanı')` sadece 1 eşleşme buluyor (mobil kart yok), `toHaveLength(2)` başarısız.

- [ ] **Step 3: `admin/listings/page.tsx`'i güncelle**

Import ekle:

```ts
import { DataCard, CardList } from '@/components/mobile/DataCard';
```

`.tableWrap` bloğunun (loading/empty/dolu üç dallı `{loading ? (...) : filtered.length === 0 ? (...) : (<div className={styles.tableWrap}>...)}`) kapanışından hemen sonra:

```tsx
            {!loading && filtered.length > 0 && (
                <div className={styles.mobileCardList}>
                    <CardList>
                        {filtered.map(listing => (
                            <DataCard
                                key={listing.id}
                                className={styles.dataCardGlass}
                                title={listing.title || listing.report?.title || 'İlan #' + listing.id.slice(0, 6)}
                                subtitle={listing.user?.name || listing.user?.email || '—'}
                                fields={[
                                    {
                                        label: 'Konum',
                                        value: listing.district ? `${listing.district}, ${listing.city}` : listing.city || '—',
                                    },
                                    {
                                        label: 'Fiyat',
                                        value: <span className={styles.tabularNums}>{formatPrice(listing.report?.minApartmentPrice || 0)} TL</span>,
                                    },
                                    { label: 'Teklif', value: <span className={styles.tabularNums}>{listing._count.offers}</span> },
                                    {
                                        label: 'Durum',
                                        value: listing.status === 'PENDING' ? '⏳ Bekliyor' : listing.isActive ? 'Aktif' : 'Pasif',
                                    },
                                    { label: 'Tarih', value: formatDate(listing.createdAt) },
                                ]}
                                actions={
                                    listing.status === 'PENDING' ? (
                                        <>
                                            <button onClick={() => approveAction(listing.id, 'approve')} className={styles.iconBtn} style={{ color: 'var(--green)' }} title="Onayla">✅ Onayla</button>
                                            <button onClick={() => approveAction(listing.id, 'reject')} className={styles.iconBtn} style={{ color: 'var(--red)' }} title="Reddet">❌ Reddet</button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => toggleActive(listing.id, !listing.isActive)}
                                                title={listing.isActive ? 'Pasife Al' : 'Aktif Et'}
                                                className={styles.iconBtn}
                                                style={{ color: listing.isActive ? 'var(--orange)' : 'var(--green)' }}
                                            >
                                                {listing.isActive ? '⏸️ Pasife Al' : '▶️ Aktif Et'}
                                            </button>
                                            <button onClick={() => deleteListing(listing.id)} title="Sil" className={styles.iconBtn} style={{ color: 'var(--red)' }}>🗑️ Sil</button>
                                        </>
                                    )
                                }
                            />
                        ))}
                    </CardList>
                </div>
            )}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/admin/listings/AdminListings.test.tsx --no-coverage`
Expected: PASS (2/2)

- [ ] **Step 5: Tam paket doğrulama**

Run: `npx tsc --noEmit && npx eslint src/app/admin/listings/page.tsx`
Expected: 0 hata

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/listings/page.tsx src/app/admin/listings/AdminListings.test.tsx
git commit -m "feat(admin): İlan Yönetimi sayfasına mobil DataCard görünümü eklendi"
```

---

## Task 5: Teklifler Sayfası — Mobil `DataCard` Görünümü (Salt-Okunur)

**Files:**
- Modify: `src/app/admin/offers/page.tsx`
- Test: `src/app/admin/offers/AdminOffers.test.tsx` (yeni)

**Interfaces:**
- Consumes: Task 1/2 ürünleri. Sayfanın mevcut `filtered`, `formatDate`, `statusLabel` fonksiyonları — bu sayfada mutasyon YOK, `actions` slotu kullanılmaz.
- Produces: Mobil `DataCard` dalı, masaüstü tablo dokunulmadan kalır.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/admin/offers/AdminOffers.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminOffers from './page'

const mockOffer = {
    id: 'offer-1',
    offeredShare: 0.25,
    message: 'Teklifimi değerlendirin',
    status: 'PENDING',
    createdAt: '2026-01-15T00:00:00.000Z',
    bidder: { name: 'Zeynep Kaya', email: 'zeynep@test.com' },
    listing: { id: 'listing-1', city: 'İstanbul', district: 'Beşiktaş', report: { title: 'Rapor A' } },
}

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ offers: [mockOffer] }) })
    ) as unknown as jest.Mock
})

describe('AdminOffers — mobil DataCard görünümü', () => {
    it('mobil kart listesinde teklif veren ve arsa payı görünür (tablo + kart = 2 kopya)', async () => {
        render(<AdminOffers />)
        await waitFor(() => expect(screen.getAllByText('Zeynep Kaya')).toHaveLength(2))
        expect(screen.getAllByText('%25').length).toBeGreaterThan(0)
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/admin/offers/AdminOffers.test.tsx --no-coverage`
Expected: FAIL — `toHaveLength(2)` başarısız (sadece 1, mobil kart yok).

- [ ] **Step 3: `admin/offers/page.tsx`'i güncelle**

Import ekle:

```ts
import { DataCard, CardList } from '@/components/mobile/DataCard';
```

`.tableWrap` bloğunun kapanışından sonra:

```tsx
            {!loading && filtered.length > 0 && (
                <div className={styles.mobileCardList}>
                    <CardList>
                        {filtered.map(offer => (
                            <DataCard
                                key={offer.id}
                                className={styles.dataCardGlass}
                                title={offer.bidder?.name || offer.bidder?.email || '—'}
                                subtitle={offer.listing?.report?.title || '—'}
                                fields={[
                                    {
                                        label: 'Konum',
                                        value: offer.listing?.district ? `${offer.listing.district}, ${offer.listing.city}` : offer.listing?.city || '—',
                                    },
                                    {
                                        label: 'Arsa Payı',
                                        value: <span className={styles.tabularNums}>%{Math.round(offer.offeredShare * 100)}</span>,
                                    },
                                    { label: 'Mesaj', value: offer.message || '—' },
                                    { label: 'Durum', value: statusLabel(offer.status) },
                                    { label: 'Tarih', value: formatDate(offer.createdAt) },
                                ]}
                            />
                        ))}
                    </CardList>
                </div>
            )}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/admin/offers/AdminOffers.test.tsx --no-coverage`
Expected: PASS (1/1)

- [ ] **Step 5: Tam paket doğrulama**

Run: `npx tsc --noEmit && npx eslint src/app/admin/offers/page.tsx`
Expected: 0 hata

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/offers/page.tsx src/app/admin/offers/AdminOffers.test.tsx
git commit -m "feat(admin): Teklifler sayfasına mobil DataCard görünümü eklendi"
```

---

## Task 6: İlçe Fiyatları Sayfası — Mobil `DataCard` Görünümü + Pirinç Butonlar

**Files:**
- Modify: `src/app/admin/district-prices/page.tsx`
- Test: `src/app/admin/district-prices/AdminDistrictPrices.test.tsx` (yeni)

**Interfaces:**
- Consumes: Task 1/2 ürünleri (`styles.dataCardGlass`, `styles.adminPrimaryBtn`, `DataCard`/`CardList`). Sayfanın mevcut `filtered`, `openEdit`, `handleDelete`, `deleteId`, `setDeleteId` state/fonksiyonları.
- Produces: Mobil `DataCard` dalı (bu sayfadaki mevcut sayfa-geneli yatay taşma bug'ı, tablo mobilde artık hiç render edilmediği için örtük olarak kapanır). İki `<Button variant="primary">` çağrısı (`+ Yeni Ekle`, modal `Kaydet`) `className={styles.adminPrimaryBtn}` alır.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/admin/district-prices/AdminDistrictPrices.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminDistrictPrices from './page'

const mockPrice = {
    id: 'dp-1', il: 'İstanbul', ilce: 'Kadıköy',
    avgSalesPricePerM2: 95000, avgUnitConstructionPrice: 14500,
}

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([mockPrice]) })
    ) as unknown as jest.Mock
})

describe('AdminDistrictPrices — mobil DataCard görünümü', () => {
    it('mobil kart listesinde il/ilçe görünür (tablo + kart = 2 kopya)', async () => {
        render(<AdminDistrictPrices />)
        await waitFor(() => expect(screen.getAllByText('Kadıköy')).toHaveLength(2))
    })

    it('"+ Yeni Ekle" butonu adminPrimaryBtn class\'ını taşır', async () => {
        render(<AdminDistrictPrices />)
        await waitFor(() => screen.getByText('+ Yeni Ekle'))
        expect(screen.getByText('+ Yeni Ekle').className).toMatch(/adminPrimaryBtn/)
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/admin/district-prices/AdminDistrictPrices.test.tsx --no-coverage`
Expected: FAIL — mobil kart yok (`toHaveLength(2)` → 1), `adminPrimaryBtn` class'ı henüz Button'a geçirilmemiş.

- [ ] **Step 3: `admin/district-prices/page.tsx`'i güncelle**

Import ekle:

```ts
import { DataCard, CardList } from '@/components/mobile/DataCard';
```

`<Button variant="primary" onClick={openAdd}>` (L224) → `className={styles.adminPrimaryBtn}` ekle:

```tsx
          <Button variant="primary" onClick={openAdd} className={styles.adminPrimaryBtn}>
            + Yeni Ekle
          </Button>
```

`<Button variant="primary" onClick={handleSave} disabled={saving}>` (L489) → aynı şekilde:

```tsx
              <Button variant="primary" onClick={handleSave} disabled={saving} className={styles.adminPrimaryBtn}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
```

`.tableWrap` bloğunun kapanışından (`</div>` — tablonun sarmalayıcısı, `</table>` sonrası) hemen sonra, `{modal.open && (...)}` bloğundan ÖNCE:

```tsx
        {!loading && filtered.length > 0 && (
          <div className={styles.mobileCardList}>
            <CardList>
              {filtered.map((p) => (
                <DataCard
                  key={p.id}
                  className={styles.dataCardGlass}
                  title={`${p.il} — ${p.ilce}`}
                  fields={[
                    { label: 'Piyasa (TL/m²)', value: <span className={styles.tabularNums}>{p.avgSalesPricePerM2.toLocaleString('tr-TR')}</span> },
                    { label: 'İnşaat (TL/m²)', value: <span className={styles.tabularNums}>{p.avgUnitConstructionPrice.toLocaleString('tr-TR')}</span> },
                  ]}
                  actions={
                    <>
                      <button onClick={() => openEdit(p)} className={styles.iconBtn} title="Düzenle">✏️ Düzenle</button>
                      {deleteId === p.id ? (
                        <>
                          <button onClick={() => handleDelete(p.id)} className={styles.iconBtn} style={{ color: 'var(--red)' }}>Evet, sil</button>
                          <button onClick={() => setDeleteId(null)} className={styles.iconBtn}>İptal</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteId(p.id)} className={styles.iconBtn} style={{ color: 'var(--red)' }} title="Sil">🗑️ Sil</button>
                      )}
                    </>
                  }
                />
              ))}
            </CardList>
          </div>
        )}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/admin/district-prices/AdminDistrictPrices.test.tsx --no-coverage`
Expected: PASS (2/2)

- [ ] **Step 5: Tam paket doğrulama**

Run: `npx tsc --noEmit && npx eslint src/app/admin/district-prices/page.tsx`
Expected: 0 hata

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/district-prices/page.tsx src/app/admin/district-prices/AdminDistrictPrices.test.tsx
git commit -m "feat(admin): İlçe Fiyatları sayfasına mobil DataCard görünümü + pirinç butonlar eklendi"
```

---

## Task 7: Analitik Sayfası — Sabit Grid'lerin Mobilde Tek Kolona İnmesi

**Files:**
- Modify: `src/app/admin/analytics/page.tsx`
- Modify: `src/app/admin/admin.module.css`
- Test: `src/app/admin/admin.scope.test.ts` (genişletilir)

**Interfaces:**
- Consumes: Task 1'in mobil `@media (max-width: 900px)` bloğu.
- Produces: `.funnelGrid` (3 kolon → mobilde 1), `.distributionGrid` (2 kolon → mobilde 1) — `analytics/page.tsx` artık inline `style={{gridTemplateColumns:...}}` yerine bu class'ları kullanır.

- [ ] **Step 1: Başarısız testi yaz**

`admin.scope.test.ts`'e yeni bir `describe` ekle (dosya sonuna):

```ts
describe('admin.module.css — Analitik grid fix (Faz 4 task 7)', () => {
  it('.funnelGrid masaüstünde 3 kolon, mobilde 1 kolon olmalı', () => {
    const desktopIdx = css.indexOf('.funnelGrid {')
    expect(desktopIdx).toBeGreaterThan(-1)
    const desktopBlock = css.slice(desktopIdx, css.indexOf('}', desktopIdx))
    expect(desktopBlock).toMatch(/grid-template-columns:\s*repeat\(3,\s*1fr\)/)

    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.funnelGrid,\s*\n?\s*\.distributionGrid\s*\{[^}]*grid-template-columns:\s*1fr/)
  })

  it('.distributionGrid masaüstünde 2 kolon olmalı', () => {
    const desktopIdx = css.indexOf('.distributionGrid {')
    expect(desktopIdx).toBeGreaterThan(-1)
    const desktopBlock = css.slice(desktopIdx, css.indexOf('}', desktopIdx))
    expect(desktopBlock).toMatch(/grid-template-columns:\s*1fr 1fr/)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/admin/admin.scope.test.ts --no-coverage`
Expected: FAIL — `.funnelGrid`/`.distributionGrid` henüz `admin.module.css`'te tanımlı değil.

- [ ] **Step 3: `admin.module.css`'e class'ları ekle**

Dosya sonuna (Task 1'de eklenen `.mobileCardList`'ten sonra, mobil `@media` bloğunun DIŞINA):

```css
.funnelGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

.distributionGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
```

Mevcut mobil `@media (max-width: 900px)` bloğunun içine (Task 1'de eklenen `.mobileCardList`/`.tableWrap` kurallarından sonra) ekle:

```css
    .funnelGrid,
    .distributionGrid {
        grid-template-columns: 1fr;
    }
```

- [ ] **Step 4: `analytics/page.tsx`'i güncelle**

"Dönüşüm Hunisi" grid sarmalayıcısını (L75) değiştir:

```tsx
                <div className={styles.funnelGrid}>
```

(önceki: `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>`)

"Rol Dağılımı"/"İl Dağılımı" sarmalayıcısını (L95) değiştir:

```tsx
            <div className={styles.distributionGrid}>
```

(önceki: `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>`)

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/admin/admin.scope.test.ts --no-coverage`
Expected: PASS (tüm testler)

- [ ] **Step 6: Tam paket doğrulama**

Run: `npx tsc --noEmit && npx eslint src/app/admin/analytics/page.tsx`
Expected: 0 hata

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/admin.module.css src/app/admin/analytics/page.tsx src/app/admin/admin.scope.test.ts
git commit -m "fix(admin): Analitik sayfasındaki sabit grid'ler mobilde tek kolona indi"
```

---

## Task 8: Motor Ayarları Sayfası — Pirinç Birincil Butonlar

**Files:**
- Modify: `src/app/admin/settings/page.tsx`

**Interfaces:**
- Consumes: Task 1'in `styles.adminPrimaryBtn`'i.
- Produces: 3 "Kaydet" butonu (`Kâr Katsayılarını Kaydet`, `Risk Katsayılarını Kaydet`, `Genel Ayarları Kaydet`) artık pirinç. Sayfanın geri kalanı (form layout, `.profitLevelRow` grid'i) hiç değişmiyor — zaten sağlıklı.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/admin/settings/AdminSettings.test.tsx` (yeni):

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminSettings from './page'

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    ) as unknown as jest.Mock
})

describe('AdminSettings — pirinç birincil butonlar (Faz 4 task 8)', () => {
    it('"Genel Ayarları Kaydet" butonu adminPrimaryBtn class\'ını taşır', async () => {
        render(<AdminSettings />)
        await waitFor(() => screen.getByText('💾 Genel Ayarları Kaydet'))
        expect(screen.getByText('💾 Genel Ayarları Kaydet').className).toMatch(/adminPrimaryBtn/)
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/admin/settings/AdminSettings.test.tsx --no-coverage`
Expected: FAIL — `Button`'a henüz `className` geçirilmiyor.

- [ ] **Step 3: `admin/settings/page.tsx`'i güncelle**

Üç `<Button variant="primary" ...>` çağrısına `className={styles.adminPrimaryBtn}` ekle:

```tsx
                            <Button variant="primary" onClick={handleSaveProfitLevels} disabled={loading} className={styles.adminPrimaryBtn}>
                                {loading ? 'Kaydediliyor...' : '💾 Kâr Katsayılarını Kaydet'}
                            </Button>
```

```tsx
                            <Button variant="primary" onClick={handleSaveRiskLevels} disabled={loading} className={styles.adminPrimaryBtn}>
                                {loading ? 'Kaydediliyor...' : '💾 Risk Katsayılarını Kaydet'}
                            </Button>
```

```tsx
            <Button variant="primary" onClick={handleSave} disabled={loading} className={styles.adminPrimaryBtn}>
                {loading ? 'Kaydediliyor...' : '💾 Genel Ayarları Kaydet'}
            </Button>
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/admin/settings/AdminSettings.test.tsx --no-coverage`
Expected: PASS (1/1)

- [ ] **Step 5: Tam paket doğrulama**

Run: `npx tsc --noEmit && npx eslint src/app/admin/settings/page.tsx`
Expected: 0 hata

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/settings/page.tsx src/app/admin/settings/AdminSettings.test.tsx
git commit -m "feat(admin): Motor Ayarları birincil butonları pirince geçti"
```

---

## Task 9: Final Doğrulama — Tam Komut Paketi + Gerçek Playwright (7 Sayfa × Tema × Viewport)

**Files:** Yok (yalnızca doğrulama)

**Interfaces:**
- Consumes: Task 1-8'in tüm ürünleri.
- Produces: Kapanış raporu (bu task'ın kendisi kod üretmez, mevcut implementasyonu uçtan uca doğrular).

- [ ] **Step 1: Tam statik komut paketi**

Run: `npx tsc --noEmit && npx eslint . && npx jest --no-coverage`
Expected: tsc 0 hata, eslint 0 uyarı, jest tam yeşil (mevcut 295 + Task 1-8'de eklenen ~14 yeni test)

- [ ] **Step 2: Docker + dev server'ın ayakta olduğunu doğrula (değilse başlat)**

Run: `docker ps --format "{{.Names}}"` — `arsabil_postgres_dev` listede değilse: `npm run dev:db`, ardından `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` 200 dönmüyorsa arka planda `npm run dev:next` başlat ve `Ready in` log satırını bekle.

- [ ] **Step 3: Gerçek Playwright doğrulaması yaz ve çalıştır**

Bu oturumda kullanılan script deseni (`admin-screenshots.js`) temel alınarak, `admin@arsabil.com`/`admin123` ile giriş yapıp 7 sayfayı **hem `data-theme` toggle sonrası (light) hem varsayılan (dark)**, **hem 1440×900 hem 390×844** viewport'ta ekran görüntüsü al. Her mobil ekran görüntüsünde:
  - Kullanıcılar/İlan Yönetimi/Teklifler/İlçe Fiyatları'nda `DataCard` listesinin göründüğünü, `<table>`'ın görünmediğini doğrula (`await page.locator('table').isVisible()` → `false`, `await page.locator('ul li').first().isVisible()` → `true`).
  - Analitik'te "Rol Dağılımı" ve "İl Dağılımı" kartlarının bounding box genişliğinin viewport genişliğinin en az %80'i olduğunu doğrula (`boundingBox().width > 390*0.8`) — tek kolona indiğinin kanıtı.
  - Sayfanın `document.documentElement.scrollWidth`'in `window.innerWidth`'e eşit (±2px) olduğunu doğrula (native yatay taşma kalmadığının kanıtı) — özellikle `district-prices`.

Expected: tüm assertion'lar PASS, hiçbir sayfada `scrollWidth > innerWidth + 2`.

- [ ] **Step 4: Masaüstü regresyon kontrolü**

Aynı script 1440×900 viewport'ta: her 7 sayfada `<table>`'ın hâlâ göründüğünü (`isVisible() → true`), `.mobileCardList`'in gizli olduğunu (`isVisible() → false`), sidebar'ın dikey (yatay değil) kaldığını doğrula.

Expected: tüm assertion'lar PASS — masaüstünde hiçbir davranış değişmedi.

- [ ] **Step 5: Kullanıcıya rapor**

Ekran görüntülerini (scratchpad'e kaydedilenleri) incele, mobil/masaüstü/light/dark karşılaştırmasını özetle, kalan bilinen sınırlamaları (varsa) raporla.

---

## Self-Review Notları

- **Spec kapsaması:** Spec'teki 7 sayfa (Genel Bakış/Kullanıcılar/İlan Yönetimi/Teklifler/Analitik/Motor Ayarları/İlçe Fiyatları) + admin.module.css temeli — hepsi task'lara eşleniyor. Genel Bakış'a ayrı task açılmadı çünkü Task 1'in paylaşılan `.statBox`/`.settingsCard`/`.toolbar` cam yüzeyi otomatik yayılıyor (spec'te bu netleştirildi: "Sadece stat kartlarına cam yüzey... Layout/markup değişmiyor" — kod değişikliği gerektirmiyor).
- **Placeholder taraması:** Tüm adımlarda tam kod var, "TODO"/"benzer şekilde" yok — Task 5/6/8'de tekrarlayan JSX kalıpları (Task 3/4'le aynı desen) yine de tam yazıldı, kısaltılmadı.
- **Tip/isim tutarlılığı:** `styles.dataCardGlass`/`styles.mobileCardList`/`styles.tabularNums`/`styles.adminPrimaryBtn` Task 1'de tanımlanıp Task 2-8'de aynı isimlerle tutarlı kullanıldı. `DataCard`'ın `className` prop'u Task 2'de tanımlanıp Task 3-6'da aynı imzayla kullanıldı.
- **Test stratejisi tutarlılığı:** Global Constraints'teki "ağır next-auth mock'lamaya gerek yok" varsayımı Task 3-8'in tüm testlerinde doğrulandı — hiçbiri `useSession`/`getServerSession` mock'lamıyor, sadece `global.fetch`.

