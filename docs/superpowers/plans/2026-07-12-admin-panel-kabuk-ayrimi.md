# Admin Panel — Kabuk Ayrımı ve Giriş Deneyimi Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin panelini (`/admin/*`) müşteri kabuğundan (Navbar/Footer/BottomNavbar) tamamen ayırıp kendi üst barına (AdminTopBar) sahip, ayrı bir ürün gibi hissettiren bir yapıya kavuşturmak; müşteri arayüzünden admin'e geçiş noktasını (dropdown/mobil menü) "tehlike" çağrışımından kurtarıp profesyonel bir "ayrıcalık" hissine dönüştürmek.

**Architecture:** `BottomNavbar`'ın zaten `/login`/`/register`'da kendini gizlediği self-gating pathname deseni genişletiliyor — yeni bir `SiteChrome` client bileşeni `Navbar`/`main`/`Footer`/`BottomNavbar`'ı sarar ve `/admin` altındaysa hiçbirini render etmez. `AdminTopBar`, mevcut Mühür Lacivert renk değerlerini (`#0F2A43`/`#C9A15A`) kendi CSS Module'üne scope'lanmış `--admin-ink`/`--admin-accent` custom property'leriyle kullanır (globals.css'e sızmaz, projenin `--seal-*` konvansiyonunun bir devamı).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, CSS Modules, NextAuth v4 (`useSession`), Jest + ts-jest (RTL testleri `/** @jest-environment jsdom */` docblock gerektirir), Playwright.

## Global Constraints

- 7 admin sayfasının (Genel Bakış/İlan Yönetimi/Teklifler/Analitik/Kullanıcılar/Motor Ayarları/İlçe Fiyatları) İÇERİĞİ bu planın kapsamı DIŞINDA — yalnızca kabuk (Navbar/Footer/BottomNavbar/AdminTopBar/sidebar çerçevesi) ve giriş noktası değişir.
- Admin masaüstü-öncelikli bir araç kabul edilir — mobilde kırılmaz ama özel bir mobil kabuk (çekmece/bottom-sheet) tasarlanmaz.
- `admin/layout.tsx`'in mevcut yetki kontrolü (`session.user.role !== 'ADMIN'` → `/dashboard`'a yönlendirme, `status === 'loading'` sırasında "Yükleniyor...") DEĞİŞMEZ, dokunulmaz.
- Yeni renk token'ları (`--admin-ink`, `--admin-accent`) her dosyanın kendi CSS Module'üne scope'lanır, `globals.css`'e asla eklenmez.
- Müşteri sayfalarının (`/`, `/marketplace`, `/dashboard` vb.) davranışı ve görünümü BİREBİR aynı kalır — `SiteChrome`'un müşteri dalı, mevcut `layout.tsx`'teki JSX'in birebir taşınmasıdır, yeniden tasarım değildir.
- Her yeni bileşen için en az bir Jest testi.

---

## Task 1: `SiteChrome` Bileşeni — Kök Layout'un Pathname-Bazlı Kabuğu

**Files:**
- Create: `src/components/layout/SiteChrome.tsx`
- Create: `src/components/layout/__tests__/SiteChrome.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `Navbar` (`./Navbar`), `Footer` (`./Footer`), `BottomNavbar` (`./BottomNavbar`) — mevcut, değişmeden.
- Produces: `SiteChrome({ children }: { children: React.ReactNode })` — Task 3'ün `admin/layout.tsx`'i bu sarmalayıcının `/admin` altında hiçbir şey render etmediğini varsayar (kendi tam kabuğunu kurar).

- [ ] **Step 1: Testi yaz (RED)**

`src/components/layout/__tests__/SiteChrome.test.tsx`:
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

let mockPathname = '/'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))
jest.mock('../Navbar', () => ({ Navbar: () => <div data-testid="navbar" /> }))
jest.mock('../Footer', () => ({ Footer: () => <div data-testid="footer" /> }))
jest.mock('../BottomNavbar', () => ({ BottomNavbar: () => <div data-testid="bottom-navbar" /> }))

import { SiteChrome } from '../SiteChrome'

describe('SiteChrome', () => {
    beforeEach(() => {
        mockPathname = '/'
    })

    it('müşteri sayfalarında Navbar/Footer/BottomNavbar render eder', () => {
        mockPathname = '/marketplace'
        render(<SiteChrome><div>içerik</div></SiteChrome>)
        expect(screen.getByTestId('navbar')).toBeInTheDocument()
        expect(screen.getByTestId('footer')).toBeInTheDocument()
        expect(screen.getByTestId('bottom-navbar')).toBeInTheDocument()
        expect(screen.getByText('içerik')).toBeInTheDocument()
    })

    it('/admin altında Navbar/Footer/BottomNavbar render etmez, yalnızca children döner', () => {
        mockPathname = '/admin'
        render(<SiteChrome><div>admin içerik</div></SiteChrome>)
        expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
        expect(screen.queryByTestId('footer')).not.toBeInTheDocument()
        expect(screen.queryByTestId('bottom-navbar')).not.toBeInTheDocument()
        expect(screen.getByText('admin içerik')).toBeInTheDocument()
    })

    it('/admin/listings gibi alt route\'larda da kabuğu gizler', () => {
        mockPathname = '/admin/listings'
        render(<SiteChrome><div>x</div></SiteChrome>)
        expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

```bash
npx jest SiteChrome.test.tsx --no-coverage
```
Beklenen: FAIL — `../SiteChrome` modülü bulunamıyor.

- [ ] **Step 3: `src/components/layout/SiteChrome.tsx`'i yaz**

```tsx
"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { BottomNavbar } from './BottomNavbar';

export function SiteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith('/admin');

    if (isAdmin) {
        return <>{children}</>;
    }

    return (
        <>
            <Navbar />
            <main style={{ minHeight: "calc(100vh - 70px)", paddingBottom: "var(--mobile-nav-pb, 0px)" }}>
                {children}
            </main>
            <div className="desktop-footer">
                <Footer />
            </div>
            <BottomNavbar />
        </>
    );
}
```

- [ ] **Step 4: Testi tekrar çalıştır — GREEN**

```bash
npx jest SiteChrome.test.tsx --no-coverage
```
Beklenen: 3/3 PASS.

- [ ] **Step 5: `src/app/layout.tsx`'i güncelle**

Mevcut:
```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNavbar } from "@/components/layout/BottomNavbar";
import { Footer } from "@/components/layout/Footer";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Toaster } from "react-hot-toast";
```
Şuna değiştir (`Navbar`/`BottomNavbar`/`Footer` importları `SiteChrome` ile değişir):
```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Toaster } from "react-hot-toast";
```
Mevcut body içeriği:
```tsx
        <AuthProvider>
          <Toaster position="bottom-right" />
          <ServiceWorkerRegister />
          <InstallPrompt />
          <Navbar />
          <main style={{ minHeight: "calc(100vh - 70px)", paddingBottom: "var(--mobile-nav-pb, 0px)" }}>
            {children}
          </main>
          <div className="desktop-footer">
            <Footer />
          </div>
          <BottomNavbar />
        </AuthProvider>
```
Şuna değiştir:
```tsx
        <AuthProvider>
          <Toaster position="bottom-right" />
          <ServiceWorkerRegister />
          <InstallPrompt />
          <SiteChrome>{children}</SiteChrome>
        </AuthProvider>
```

- [ ] **Step 6: Doğrula**

```bash
npx tsc --noEmit
npx jest --no-coverage
npx eslint src/components/layout/SiteChrome.tsx src/app/layout.tsx
```
Beklenen: tsc 0 hata, tüm testler PASS, eslint 0 ihlal.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/SiteChrome.tsx src/components/layout/__tests__/SiteChrome.test.tsx src/app/layout.tsx
git commit -m "feat(layout): SiteChrome ile /admin müşteri kabuğundan (Navbar/Footer/BottomNavbar) ayrıldı

BottomNavbar'ın /login,/register'da kendini gizlediği self-gating pathname
deseni genişletildi. /admin altındaki route'larda artık hiçbir müşteri
kabuk bileşeni render edilmiyor — admin/layout.tsx kendi tam kabuğunu
kuracak (Task 3). Müşteri sayfalarının JSX'i birebir taşındı, davranış
değişmedi."
```

---

## Task 2: `AdminTopBar` Bileşeni

**Files:**
- Create: `src/components/layout/AdminTopBar.tsx`
- Create: `src/components/layout/AdminTopBar.module.css`
- Create: `src/components/layout/__tests__/AdminTopBar.test.tsx`

**Interfaces:**
- Consumes: `useSession` (`next-auth/react`, mevcut desen — `Navbar.tsx`'in kullandığı aynı hook), `ThemeToggle` (`@/components/ui/ThemeToggle`, mevcut, props almaz, kendi kendine yeterli).
- Produces: `AdminTopBar()` — Task 3'ün `admin/layout.tsx`'i bunu `<AdminTopBar />` olarak, sidebar'ın ÜSTÜNDE render eder.

- [ ] **Step 1: Testi yaz (RED)**

`src/components/layout/__tests__/AdminTopBar.test.tsx` — `BottomNavbar.test.tsx`'teki kanıtlanmış `let mockX` + `beforeEach`'te sıfırlama deseni kullanılıyor (jest.resetModules/doMock KARMAŞIKLIĞINA gerek yok, mevcut kod tabanında zaten bu desen var):
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

let mockSession: { user: { name: string; role: string } } | null = null
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: mockSession }) }))

import { AdminTopBar } from '../AdminTopBar'

describe('AdminTopBar', () => {
    beforeEach(() => {
        mockSession = { user: { name: 'Test Yönetici', role: 'ADMIN' } }
    })

    it('wordmark, admin adı, ADMIN rozeti ve geri-dön linkini render eder', () => {
        render(<AdminTopBar />)
        // "ArsaBil" metni JSX'te bir <span> içinde başka bir <span>'le ("— Yönetim")
        // birlikte yer alıyor — tam string eşleşmesi (getByText('ArsaBil')) iç içe
        // node'lar yüzünden tutmayabilir, bu yüzden regex kullanılıyor.
        expect(screen.getByText(/ArsaBil/)).toBeInTheDocument()
        expect(screen.getByText('Test Yönetici')).toBeInTheDocument()
        expect(screen.getByText('ADMIN')).toBeInTheDocument()
        const backLink = screen.getByRole('link', { name: /Müşteri Paneline Dön/i })
        expect(backLink).toHaveAttribute('href', '/dashboard')
    })

    it('oturum yoksa (session.user.name yok) "Yönetici" varsayılanını gösterir', () => {
        mockSession = null
        render(<AdminTopBar />)
        expect(screen.getByText('Yönetici')).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

```bash
npx jest AdminTopBar.test.tsx --no-coverage
```
Beklenen: FAIL — `../AdminTopBar` modülü bulunamıyor.

- [ ] **Step 3: `AdminTopBar.module.css` oluştur**

```css
.topBar {
    --admin-ink: #0F2A43;
    --admin-accent: #C9A15A;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1.5rem;
    background: var(--admin-ink);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.sealDot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--admin-accent);
    flex-shrink: 0;
}

.wordmark {
    font-size: 1.05rem;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: 0.01em;
}

.wordmarkMuted {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
}

.right {
    display: flex;
    align-items: center;
    gap: 14px;
}

.adminName {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
}

.badge {
    padding: 0.2rem 0.55rem;
    border-radius: 99px;
    font-size: 0.65rem;
    font-weight: 800;
    background: rgba(201, 161, 90, 0.18);
    color: var(--admin-accent);
    border: 1px solid rgba(201, 161, 90, 0.35);
    letter-spacing: 0.5px;
}

.backLink {
    font-size: 0.82rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    padding: 0.4rem 0.7rem;
    border-radius: 8px;
    transition: background 0.15s;
}

.backLink:hover {
    background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 768px) {
    .adminName,
    .wordmarkMuted {
        display: none;
    }
}
```

- [ ] **Step 4: `AdminTopBar.tsx` oluştur**

```tsx
"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import styles from './AdminTopBar.module.css';

export function AdminTopBar() {
    const { data: session } = useSession();

    return (
        <header className={styles.topBar}>
            <div className={styles.left}>
                <span className={styles.sealDot} aria-hidden="true" />
                <span className={styles.wordmark}>
                    ArsaBil <span className={styles.wordmarkMuted}>— Yönetim</span>
                </span>
            </div>
            <div className={styles.right}>
                <span className={styles.adminName}>{session?.user?.name || 'Yönetici'}</span>
                <span className={styles.badge}>ADMIN</span>
                <ThemeToggle />
                <Link href="/dashboard" className={styles.backLink}>← Müşteri Paneline Dön</Link>
            </div>
        </header>
    );
}
```

- [ ] **Step 5: Testi tekrar çalıştır — GREEN**

```bash
npx jest AdminTopBar.test.tsx --no-coverage
npx tsc --noEmit
npx eslint src/components/layout/AdminTopBar.tsx
```
Beklenen: 2/2 PASS, tsc 0 hata, eslint 0 ihlal.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/AdminTopBar.tsx src/components/layout/AdminTopBar.module.css src/components/layout/__tests__/AdminTopBar.test.tsx
git commit -m "feat(admin): AdminTopBar bileşeni eklendi

Sabit koyu Mühür Lacivert (#0F2A43) arka plan + pirinç sarısı (#C9A15A)
vurgu — light/dark temadan bağımsız, 'farklı bir moddasın' sinyali.
Token'lar (--admin-ink/--admin-accent) yalnızca bu CSS Module'e scope'lu,
globals.css'e sızmıyor. ThemeToggle doğrudan yeniden kullanıldı (zaten
bağımsız, kendi state'ini yönetiyor)."
```

---

## Task 3: `admin/layout.tsx` Entegrasyonu — AdminTopBar + Eski Geri-Dön Linkinin Kaldırılması

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/admin.module.css`

**Interfaces:**
- Consumes: `AdminTopBar` (Task 2, `@/components/layout/AdminTopBar`).
- Produces: yok.

- [ ] **Step 1: `admin/layout.tsx`'i güncelle**

Mevcut import bloğu:
```tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './admin.module.css';
```
Şuna değiştir (`AdminTopBar` importu eklenir):
```tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminTopBar } from '@/components/layout/AdminTopBar';
import styles from './admin.module.css';
```
Mevcut return bloğu:
```tsx
    return (
        <div className={styles.adminShell}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2>Admin Panel</h2>
                    <span className={styles.badge}>ADMIN</span>
                </div>
                <nav className={styles.sidebarNav}>
                    {navItems.map(item => {
                        const isActive = item.href === '/admin'
                            ? pathname === '/admin'
                            : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className={styles.sidebarFooter}>
                    <Link href="/" className={styles.backLink}>← Hesap Makinesine Dön</Link>
                </div>
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
```
Şuna değiştir (`sidebarFooter` kaldırıldı — geri-dön linki artık `AdminTopBar`'da; `AdminTopBar` `adminShell`'in dışına, en üste eklendi):
```tsx
    return (
        <>
            <AdminTopBar />
            <div className={styles.adminShell}>
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>Admin Panel</h2>
                        <span className={styles.badge}>ADMIN</span>
                    </div>
                    <nav className={styles.sidebarNav}>
                        {navItems.map(item => {
                            const isActive = item.href === '/admin'
                                ? pathname === '/admin'
                                : pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                                >
                                    <span>{item.icon}</span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>
                <main className={styles.mainContent}>
                    {children}
                </main>
            </div>
        </>
    );
```
(`navItems` tanımı, `useEffect`/yetki kontrolü, `loading` erken dönüşü DEĞİŞMEDEN kalır — yalnızca return bloğu güncellendi.)

- [ ] **Step 2: `admin.module.css`'i güncelle**

Mevcut `.adminShell` ve `.badge`:
```css
.adminShell {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    min-height: calc(100dvh - 100px);
    max-width: 1400px;
    margin: 0 auto;
    padding: 14px;
    gap: 14px;
}
```
```css
.badge {
    padding: 0.25rem 0.6rem;
    border-radius: 99px;
    font-size: 0.7rem;
    font-weight: 800;
    background: rgba(var(--primary-rgb), 0.12);
    color: var(--primary);
    border: 1px solid rgba(var(--primary-rgb), 0.2);
    letter-spacing: 0.5px;
}
```
Şuna değiştir (`.adminShell`'e lokal `--admin-accent` eklenir, `.badge` bunu kullanır — `AdminTopBar.module.css`'teki değerle AYNI ama bağımsız scope, projenin "her dosya kendi token'ını tanımlar" konvansiyonu):
```css
.adminShell {
    --admin-accent: #C9A15A;
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    min-height: calc(100dvh - 100px);
    max-width: 1400px;
    margin: 0 auto;
    padding: 14px;
    gap: 14px;
}
```
```css
.badge {
    padding: 0.25rem 0.6rem;
    border-radius: 99px;
    font-size: 0.7rem;
    font-weight: 800;
    background: rgba(201, 161, 90, 0.12);
    color: var(--admin-accent);
    border: 1px solid rgba(201, 161, 90, 0.2);
    letter-spacing: 0.5px;
}
```
Mevcut `.sidebarFooter`/`.backLink` kuralları (artık kullanılmıyor, JSX'ten kaldırıldı — dead code):
```css
.sidebarFooter {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border);
}

.backLink {
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s;
}

.backLink:hover {
    color: var(--primary);
}
```
Bu üç kuralı TAMAMEN SİL.

Mevcut responsive blok:
```css
@media (max-width: 900px) {
    .adminShell {
        grid-template-columns: 1fr;
    }

    .sidebar {
        flex-direction: row;
        overflow-x: auto;
    }

    .sidebarNav {
        flex-direction: row;
        padding: 0.5rem;
    }

    .sidebarHeader,
    .sidebarFooter {
        display: none;
    }

    .navItem {
        white-space: nowrap;
        font-size: 0.85rem;
        padding: 0.6rem 0.75rem;
    }

}
```
`.sidebarFooter` referansını (artık var olmayan bir class) kaldır:
```css
@media (max-width: 900px) {
    .adminShell {
        grid-template-columns: 1fr;
    }

    .sidebar {
        flex-direction: row;
        overflow-x: auto;
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

}
```

- [ ] **Step 3: Doğrula**

```bash
npx tsc --noEmit
npx jest --no-coverage
npx eslint src/app/admin/layout.tsx
```
Beklenen: tsc 0 hata, tüm testler PASS (bu dosyalar için mevcut bir test yok — regresyon kontrolü), eslint 0 ihlal.

- [ ] **Step 4: Docker + dev server açıksa manuel doğrulama**

Admin kullanıcısıyla `/admin`'e gir: `AdminTopBar`'ın (sabit koyu, wordmark+ADMIN rozeti+tema toggle+geri-dön linki) sidebar'ın ÜSTÜNDE göründüğünü, müşteri Navbar'ının/Footer'ının/BottomNavbar'ının HİÇ görünmediğini, "Müşteri Paneline Dön"e tıklayınca `/dashboard`'a gittiğini doğrula. Light/dark tema değiştir — sidebar/içerik tema değişimine tepki verirken üst barın sabit koyu kaldığını doğrula.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/admin.module.css
git commit -m "feat(admin): AdminTopBar admin/layout.tsx'e entegre edildi

Eski sidebar-footer geri-dön linki (backLink → '/') kaldırıldı, yerini
AdminTopBar'daki '← Müşteri Paneline Dön' (→ '/dashboard') aldı. Sidebar
.badge rengi --primary (mavi) yerine lokal --admin-accent (pirinç sarısı,
#C9A15A) — AdminTopBar ile aynı değer, bağımsız scope."
```

---

## Task 4: Navbar Giriş Noktası — Masaüstü Dropdown + Mobil Menü

**Files:**
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/components/layout/Navbar.module.css`

**Interfaces:**
- Consumes: yok (mevcut `session.user.role === "ADMIN"` kontrolü zaten var, değişmiyor).
- Produces: yok.

- [ ] **Step 1: Masaüstü dropdown'daki admin linkini güncelle**

Mevcut (`Navbar.tsx`, kullanıcı dropdown'ı içinde):
```tsx
                                            {session.user?.role === "ADMIN" && (
                                                <Link href="/admin" onClick={() => setIsUserMenuOpen(false)} className={styles.dropdownItem}>
                                                    <span>⚙️</span> Admin Paneli
                                                </Link>
                                            )}
```
Şuna değiştir (`dropdownItemAdmin` modifier class'ı eklenir, metin "Yönetim Paneli" olarak netleştirilir):
```tsx
                                            {session.user?.role === "ADMIN" && (
                                                <Link href="/admin" onClick={() => setIsUserMenuOpen(false)} className={`${styles.dropdownItem} ${styles.dropdownItemAdmin}`}>
                                                    <span>⚙️</span> Yönetim Paneli
                                                </Link>
                                            )}
```

- [ ] **Step 2: Mobil menüdeki admin linkini güncelle**

Mevcut (`Navbar.tsx`, mobil accordion menü içinde):
```tsx
                                {session.user?.role === "ADMIN" && (
                                    <Link href="/admin" onClick={() => setIsMenuOpen(false)} className={styles.dangerText}>⚙️ Admin Paneli</Link>
                                )}
```
Şuna değiştir (`dangerText`, çıkış butonuyla paylaşılan kırmızı stil — kaldırılır, yerine yeni `adminLink` class'ı; metin netleştirilir):
```tsx
                                {session.user?.role === "ADMIN" && (
                                    <Link href="/admin" onClick={() => setIsMenuOpen(false)} className={styles.adminLink}>⚙️ Yönetim Paneli</Link>
                                )}
```

- [ ] **Step 3: `Navbar.module.css`'e yeni sınıfları ekle**

`.dropdownItem:hover` kuralının HEMEN ALTINA (satır ~355, `.dropdownItem span`'dan ÖNCE) ekle:
```css
.dropdownItemAdmin {
    background: rgba(201, 161, 90, 0.10);
    color: #C9A15A;
}

.dropdownItemAdmin:hover {
    background: rgba(201, 161, 90, 0.18);
    color: #C9A15A;
}
```
**Kritik nokta:** `.dropdownItemAdmin:hover`, `.dropdownItem:hover` ile AYNI özgüllükte (0,2,0) — bu yüzden dosyada `.dropdownItem:hover`'dan SONRA gelmesi ZORUNLU, aksi halde mavi hover rengi pirinç sarısını ezer (bu projede daha önce `button.compareBtn`/`.scenarioMiniCard h4` desenlerinde karşılaşılan aynı CSS özgüllük-sıralama kuralı).

`.mobileMenu .dangerText` kuralının HEMEN ALTINA (satır ~249, `}` — media query kapanışından ÖNCE) ekle:
```css
    .mobileMenu .adminLink {
        color: #C9A15A;
    }
```

- [ ] **Step 4: Doğrula**

```bash
npx tsc --noEmit
npx jest --no-coverage
npx eslint src/components/layout/Navbar.tsx
```
Beklenen: tsc 0 hata, tüm testler PASS (bu dosya için mevcut bir test yok — regresyon kontrolü), eslint 0 ihlal.

- [ ] **Step 5: Docker + dev server açıksa manuel doğrulama**

Admin kullanıcısıyla giriş yap: masaüstünde avatar dropdown'ında "Yönetim Paneli" linkinin diğer menü öğelerinden (Kontrol Paneli/Raporlarım/İlanlarım/Mesajlarım) farklı, hafif pirinç-tonlu bir zeminle göründüğünü ve hover'da rengin maviye DÖNMEDİĞİNİ doğrula. Mobilde (390px) hamburger menüsünü aç: "Yönetim Paneli" linkinin artık kırmızı değil pirinç sarısı olduğunu, "Çıkış Yap"tan görsel olarak ayrıştığını doğrula.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Navbar.tsx src/components/layout/Navbar.module.css
git commit -m "fix(navbar): admin giriş noktası 'tehlike' stilinden kurtarıldı

Mobil menüde admin linki artık çıkışla aynı kırmızı dangerText class'ını
paylaşmıyor (kazara 'admin=tehlikeli işlem' çağrışımı yapıyordu). Hem
masaüstü dropdown hem mobil menüde pirinç sarısı (#C9A15A) vurgu —
diğer menü öğelerinden görsel olarak ayrışan bir 'ayrıcalık' hissi,
tehlike değil. dropdownItemAdmin:hover kasıtlı olarak dropdownItem:hover'dan
SONRA tanımlandı (eşit özgüllük, sıralama kazanır)."
```

---

## Task 5: Final Doğrulama

**Files:**
- Create: `e2e/admin-shell.spec.ts`

**Interfaces:**
- Consumes: `loginAs` (`e2e/helpers.ts`, mevcut) — admin girişi için `e2e-admin`/`admin@e2e.test` kullanıcısı (`e2e/global-setup.ts`'te zaten seed ediliyor, `role: 'ADMIN'`).
- Produces: yok (planın son task'ı).

- [ ] **Step 1: `e2e/admin-shell.spec.ts`'i yaz**

```ts
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test('admin girişinde müşteri kabuğu (Navbar/Footer/BottomNavbar) DOM\'da yok, AdminTopBar var', async ({ page }) => {
    await loginAs(page, 'admin@e2e.test', 'Test1234!')
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // NOT: getByRole('navigation') KULLANILMAZ — admin/layout.tsx'in kendi
    // sidebar'ı da bir <nav> (styles.sidebarNav), bu yüzden role="navigation"
    // sayısı asla 0 olmaz (admin'in kendi navigasyonu her zaman var, doğru
    // davranış). BottomNavbar'a özgü, admin sidebar'ındaki hiçbir label ile
    // ÇAKIŞMAYAN bir link metni ("Pazar") kullanılıyor.
    await expect(page.locator('footer')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Pazar' })).toHaveCount(0) // BottomNavbar-only link
    await expect(page.getByText('ArsaBil').first()).toBeVisible() // AdminTopBar wordmark
    await expect(page.getByRole('link', { name: /Müşteri Paneline Dön/i })).toBeVisible()
})

test('müşteri sayfalarında kabuk normal şekilde görünür', async ({ page }) => {
    await loginAs(page, 'admin@e2e.test', 'Test1234!')
    await page.goto('/marketplace')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('footer')).toBeVisible()
})
```

- [ ] **Step 2: Tam komut paketi**

```bash
npx tsc --noEmit
npx eslint .
npx jest --no-coverage
npm run build
```
Beklenen: hepsi temiz (0 tsc hatası, 0 eslint ihlali, tüm jest testleri PASS, build başarılı).

- [ ] **Step 3: Playwright — Docker + dev server gerekli**

```bash
docker compose -f docker-compose.dev.yml up -d
npx prisma@5.22.0 migrate deploy
npx playwright test admin-shell
npx playwright test mobil-smoke
npx playwright test desktop-baseline
```
Beklenen: `admin-shell.spec.ts`'teki 2 test PASS. `mobil-smoke`/`desktop-baseline` (bu planın dokunmadığı sayfaları kapsıyor, regresyon sinyali için) PASS.

- [ ] **Step 4: Manuel görsel denetim**

`manualcheck@local.test`/`Test1234!` (ADMIN'e terfi ettirilmiş değilse `UPDATE "User" SET role='ADMIN'` ile terfi ettir veya `admin@arsabil.com`/`admin123` kullan) ile masaüstünde: `/admin`'in 7 alt sayfasını (Genel Bakış/İlan Yönetimi/Teklifler/Analitik/Kullanıcılar/Motor Ayarları/İlçe Fiyatları) tek tek gez — hepsinde `AdminTopBar`'ın tutarlı göründüğünü, sidebar navigasyonunun kesintisiz çalıştığını doğrula (bu sayfaların İÇERİĞİ değişmedi, yalnızca çevresindeki kabuk).

- [ ] **Step 5: Commit**

```bash
git add e2e/admin-shell.spec.ts
git commit -m "test(e2e): admin kabuk ayrımı için smoke testi eklendi

/admin'de müşteri kabuğunun (Navbar/Footer/BottomNavbar) DOM'da hiç
bulunmadığını, AdminTopBar'ın göründüğünü ve müşteri sayfalarının
etkilenmediğini doğrulayan 2 test."
```

---

## Task Sırası ve Bağımlılıklar

1. Task 1 (SiteChrome) — bağımsız, Task 3'ün ön koşulu (admin/layout.tsx artık kendi tam kabuğunu kurmalı varsayımına dayanıyor).
2. Task 2 (AdminTopBar) — bağımsız, Task 3'ün ön koşulu.
3. Task 3 (admin/layout.tsx entegrasyonu) — Task 1 VE Task 2'ye bağımlı.
4. Task 4 (Navbar giriş noktası) — bağımsız (Task 1-3'ten bağımsız, farklı dosyalar).
5. Task 5 (final doğrulama) — hepsine bağımlı.

Sıra: 1 → 2 → 3 → 4 → 5 (1/2/4 aralarında paralel çalışılabilir ama subagent-driven-development tek implementer akışında sıralı ilerlenecek).
