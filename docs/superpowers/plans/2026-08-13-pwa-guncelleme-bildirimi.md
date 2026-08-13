# PWA Güncelleme Bildirimi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yeni bir service worker sürümü hazır olduğunda kullanıcıya görünür bir "Güncelle" bildirimi göstermek; onay verince eski cache temizlenip yeni sürüm yüklensin.

**Architecture:** `public/sw.js`'ten `self.skipWaiting()` kaldırılır (yeni SW `waiting` durumunda bekler), bir `message` dinleyicisi eklenir. Yeni `usePwaUpdate()` hook'u `waiting` worker'ı tespit edip `updateAvailable`/`applyUpdate()` döner. Yeni `UpdateBanner.tsx` bu hook'u kullanarak `InstallPrompt` ile aynı görsel dilde bir bildirim gösterir, `layout.tsx`'e eklenir.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Jest + Testing Library, service worker (vanilla JS, `public/sw.js`).

## Global Constraints

- Tüm yeni kullanıcıya-görünür metinler Türkçe olacak.
- `activate` olayındaki cache temizleme mantığı DEĞİŞMEYECEK.
- `ServiceWorkerRegister.tsx`'in mevcut register + saatlik/görünürlük-tetiklemeli `update()` + "gizlenince yenile" mantığı DEĞİŞMEYECEK (spec: "DEĞİŞMEDEN kalır").
- İlk kurulumda (`navigator.serviceWorker.controller` yokken) banner ASLA gösterilmeyecek.
- `UpdateBanner` kalıcı bir "dismissed" `localStorage` bayrağı KULLANMAYACAK (her yeni güncelleme ayrı bir olay).
- Görsel dil `InstallPrompt.tsx`'teki `var(--panel)`/`var(--border)`/`var(--primary)` token'larıyla tutarlı olacak.

---

### Task 1: `public/sw.js` — skipWaiting kaldır, message dinleyicisi ekle

**Files:**
- Modify: `public/sw.js`
- Test: `public/sw.contract.test.ts` (yeni)

**Interfaces:**
- Produces: SW artık `install` sırasında otomatik devreye girmiyor; `{ type: 'SKIP_WAITING' }` mesajı gelince devreye giriyor. Task 2'nin `usePwaUpdate` hook'u bu sözleşmeye göre `waitingWorker.postMessage({ type: 'SKIP_WAITING' })` gönderecek.

`sw.js` bir tarayıcı script'i olduğu için Jest onu ÇALIŞTIRAMAZ — test, dosyanın METNİNİ okuyup regex ile yapısal sözleşmeyi doğrular (projenin `*.scope.test.ts` deseniyle aynı yaklaşım).

- [ ] **Step 1: Write the failing test**

`public/sw.contract.test.ts` dosyasını oluştur:

```ts
import { readFileSync } from 'fs'
import { join } from 'path'

const sw = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')

describe('public/sw.js — güncelleme sözleşmesi', () => {
    it('install olayı artik self.skipWaiting() cagirmiyor (kullanici onayli guncelleme icin)', () => {
        const installMatch = sw.match(/self\.addEventListener\('install',\s*\(event\)\s*=>\s*\{([\s\S]*?)\n\}\);/)
        expect(installMatch).not.toBeNull()
        expect(installMatch![1]).not.toMatch(/self\.skipWaiting\(\)/)
    })

    it('bir message dinleyicisi SKIP_WAITING gelince self.skipWaiting() cagiriyor', () => {
        const messageMatch = sw.match(/self\.addEventListener\('message',\s*\(event\)\s*=>\s*\{([\s\S]*?)\n\}\);/)
        expect(messageMatch).not.toBeNull()
        expect(messageMatch![1]).toMatch(/event\.data\?\.type === 'SKIP_WAITING'/)
        expect(messageMatch![1]).toMatch(/self\.skipWaiting\(\)/)
    })

    it('activate olayindaki eski cache temizleme mantigi degismedi', () => {
        const activateMatch = sw.match(/self\.addEventListener\('activate',\s*\(event\)\s*=>\s*\{([\s\S]*?)\n\}\);/)
        expect(activateMatch).not.toBeNull()
        expect(activateMatch![1]).toMatch(/caches\.delete\(name\)/)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest public/sw.contract.test.ts`
Expected: FAIL — ilk test `self.skipWaiting()`'in install içinde OLMASI nedeniyle başarısız (`not.toMatch` ihlali), ikinci test `message` dinleyicisi hiç olmadığı için `not.toBeNull()` ihlaliyle başarısız.

- [ ] **Step 3: `public/sw.js`'i düzenle**

`install` olay dinleyicisindeki `self.skipWaiting();` satırını SİL. Dosyanın güncel hali (yalnızca `install` ve yeni `message` bloğu, geri kalan dosya AYNEN kalır):

```js
// Install event: pre-cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing version', SW_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Kullanici "Guncelle" butonuna dokununca UpdateBanner bu mesaji gonderir
// (bkz. src/lib/pwa/usePwaUpdate.ts). skipWaiting() artik install'da
// OTOMATIK cagrilmiyor - yeni SW `waiting` durumunda kullanici onayini
// bekliyor.
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Activate event: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});
```

(Dosyanın geri kalanı — `CACHE_NAME`/`SW_VERSION` sabitleri, `STATIC_ASSETS`, `fetch` olayı — DEĞİŞMEDEN kalır.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest public/sw.contract.test.ts`
Expected: PASS — 3/3 test yeşil.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js public/sw.contract.test.ts
git commit -m "feat(pwa): sw.js kullanici onayli guncellemeye gecti (skipWaiting kaldirildi)"
```

---

### Task 2: `usePwaUpdate()` hook

**Files:**
- Create: `src/lib/pwa/usePwaUpdate.ts`
- Test: `src/lib/pwa/usePwaUpdate.test.ts`

**Interfaces:**
- Consumes: Task 1'in SW sözleşmesi (`waiting` worker'a `{type:'SKIP_WAITING'}` postMessage).
- Produces: `usePwaUpdate(target?: PwaUpdateTarget): { updateAvailable: boolean; applyUpdate: () => void }` — Task 3'ün `UpdateBanner.tsx`'i bunu tüketecek.

- [ ] **Step 1: Write the failing test**

`src/lib/pwa/usePwaUpdate.test.ts`:

```ts
/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { usePwaUpdate, type PwaUpdateTarget } from './usePwaUpdate'

class FakeEventTarget {
    private listeners: Record<string, Array<() => void>> = {}
    addEventListener(type: string, cb: () => void) {
        (this.listeners[type] ??= []).push(cb)
    }
    removeEventListener(type: string, cb: () => void) {
        this.listeners[type] = (this.listeners[type] || []).filter(l => l !== cb)
    }
    dispatch(type: string) {
        (this.listeners[type] || []).forEach(cb => cb())
    }
}

class FakeWorker extends FakeEventTarget {
    state: string = 'installing'
    postMessage = jest.fn()
}

class FakeRegistration extends FakeEventTarget {
    waiting: FakeWorker | null = null
    installing: FakeWorker | null = null
}

function makeTarget(reg: FakeRegistration, hasControllerInitially: boolean) {
    const controllerChangeTarget = new FakeEventTarget()
    let hasController = hasControllerInitially
    const reload = jest.fn()
    const target: PwaUpdateTarget = {
        getRegistration: () => Promise.resolve(reg),
        hasController: () => hasController,
        addControllerChangeListener: (l) => controllerChangeTarget.addEventListener('controllerchange', l),
        removeControllerChangeListener: (l) => controllerChangeTarget.removeEventListener('controllerchange', l),
        reload,
    }
    return {
        target,
        fireControllerChange: () => controllerChangeTarget.dispatch('controllerchange'),
        setController: (v: boolean) => { hasController = v },
        reload,
    }
}

describe('usePwaUpdate', () => {
    it('ilk kurulumda (controller yok) waiting worker olsa bile updateAvailable false kalir', async () => {
        const reg = new FakeRegistration()
        reg.waiting = new FakeWorker()
        const { target } = makeTarget(reg, false)

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })

        expect(result.current.updateAvailable).toBe(false)
    })

    it('mount aninda zaten registration.waiting varsa (controller varken) hemen updateAvailable true olur', async () => {
        const reg = new FakeRegistration()
        reg.waiting = new FakeWorker()
        const { target } = makeTarget(reg, true)

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })

        expect(result.current.updateAvailable).toBe(true)
    })

    it('mevcut controller varken installing worker installed olunca updateAvailable true olur', async () => {
        const reg = new FakeRegistration()
        const { target } = makeTarget(reg, true)

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })
        expect(result.current.updateAvailable).toBe(false)

        const installing = new FakeWorker()
        reg.installing = installing
        act(() => { reg.dispatch('updatefound') })
        act(() => {
            installing.state = 'installed'
            installing.dispatch('statechange')
        })

        expect(result.current.updateAvailable).toBe(true)
    })

    it('applyUpdate() waiting worker a SKIP_WAITING mesaji gonderir, controllerchange sonrasi reload cagirir', async () => {
        const reg = new FakeRegistration()
        const waiting = new FakeWorker()
        reg.waiting = waiting
        const { target, fireControllerChange, reload } = makeTarget(reg, true)

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })
        expect(result.current.updateAvailable).toBe(true)

        act(() => { result.current.applyUpdate() })
        expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
        expect(reload).not.toHaveBeenCalled()

        act(() => { fireControllerChange() })
        expect(reload).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/pwa/usePwaUpdate.test.ts`
Expected: FAIL — `Cannot find module './usePwaUpdate'`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/pwa/usePwaUpdate.ts`:

```ts
"use client";

import { useEffect, useState } from 'react';

/**
 * `usePwaUpdate` ihtiyaç duydugu tum tarayici API'lerini bu arayuz uzerinden
 * alir — jsdom `navigator.serviceWorker`i desteklemedigi icin testler sahte
 * bir target enjekte eder (bkz. `chunkErrorReload.ts`teki ayni desen).
 */
export interface PwaUpdateWorker {
    state: string;
    postMessage: (message: { type: string }) => void;
    addEventListener: (type: 'statechange', listener: () => void) => void;
    removeEventListener: (type: 'statechange', listener: () => void) => void;
}

export interface PwaUpdateRegistration {
    waiting: PwaUpdateWorker | null;
    installing: PwaUpdateWorker | null;
    addEventListener: (type: 'updatefound', listener: () => void) => void;
    removeEventListener: (type: 'updatefound', listener: () => void) => void;
}

export interface PwaUpdateTarget {
    getRegistration: () => Promise<PwaUpdateRegistration | undefined>;
    hasController: () => boolean;
    addControllerChangeListener: (listener: () => void) => void;
    removeControllerChangeListener: (listener: () => void) => void;
    reload: () => void;
}

export function createBrowserPwaUpdateTarget(): PwaUpdateTarget {
    return {
        getRegistration: () =>
            navigator.serviceWorker.getRegistration() as Promise<PwaUpdateRegistration | undefined>,
        hasController: () => navigator.serviceWorker.controller !== null,
        addControllerChangeListener: (listener) =>
            navigator.serviceWorker.addEventListener('controllerchange', listener),
        removeControllerChangeListener: (listener) =>
            navigator.serviceWorker.removeEventListener('controllerchange', listener),
        reload: () => window.location.reload(),
    };
}

export interface UsePwaUpdateResult {
    updateAvailable: boolean;
    applyUpdate: () => void;
}

export function usePwaUpdate(
    target: PwaUpdateTarget = createBrowserPwaUpdateTarget()
): UsePwaUpdateResult {
    const [waitingWorker, setWaitingWorker] = useState<PwaUpdateWorker | null>(null);

    useEffect(() => {
        let cancelled = false;
        let reg: PwaUpdateRegistration | undefined;

        const onUpdateFound = () => {
            const installing = reg?.installing;
            if (!installing) return;
            const onStateChange = () => {
                if (installing.state === 'installed' && target.hasController()) {
                    setWaitingWorker(installing);
                }
                installing.removeEventListener('statechange', onStateChange);
            };
            installing.addEventListener('statechange', onStateChange);
        };

        target.getRegistration().then((r) => {
            if (cancelled || !r) return;
            reg = r;
            if (r.waiting && target.hasController()) {
                setWaitingWorker(r.waiting);
            }
            r.addEventListener('updatefound', onUpdateFound);
        });

        return () => {
            cancelled = true;
            reg?.removeEventListener('updatefound', onUpdateFound);
        };
    }, [target]);

    const applyUpdate = () => {
        if (!waitingWorker) return;
        const onControllerChange = () => {
            target.removeControllerChangeListener(onControllerChange);
            target.reload();
        };
        target.addControllerChangeListener(onControllerChange);
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    };

    return { updateAvailable: waitingWorker !== null, applyUpdate };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/pwa/usePwaUpdate.test.ts`
Expected: PASS — 4/4 test yeşil.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pwa/usePwaUpdate.ts src/lib/pwa/usePwaUpdate.test.ts
git commit -m "feat(pwa): usePwaUpdate hook — waiting worker tespiti + kullanici onayli guncelleme"
```

---

### Task 3: `UpdateBanner` bileşeni

**Files:**
- Create: `src/components/pwa/UpdateBanner.tsx`
- Test: `src/components/pwa/__tests__/UpdateBanner.test.tsx`

**Interfaces:**
- Consumes: `usePwaUpdate()` (Task 2) — `{ updateAvailable, applyUpdate }`.
- Produces: `<UpdateBanner />` — Task 4'te `layout.tsx`'e eklenecek, prop almaz.

- [ ] **Step 1: Write the failing test**

`src/components/pwa/__tests__/UpdateBanner.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { UpdateBanner } from '../UpdateBanner'
import { usePwaUpdate } from '@/lib/pwa/usePwaUpdate'

jest.mock('@/lib/pwa/usePwaUpdate')
const mockedUsePwaUpdate = usePwaUpdate as jest.Mock

describe('UpdateBanner', () => {
    afterEach(() => jest.resetAllMocks())

    it('updateAvailable false iken hicbir sey render etmez', () => {
        mockedUsePwaUpdate.mockReturnValue({ updateAvailable: false, applyUpdate: jest.fn() })
        const { container } = render(<UpdateBanner />)
        expect(container).toBeEmptyDOMElement()
    })

    it('updateAvailable true iken banner ve Guncelle butonu gorunur', () => {
        mockedUsePwaUpdate.mockReturnValue({ updateAvailable: true, applyUpdate: jest.fn() })
        render(<UpdateBanner />)
        expect(screen.getByText(/Yeni bir sürüm mevcut/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Güncelle' })).toBeInTheDocument()
    })

    it('Guncelle butonuna tiklaninca applyUpdate cagrilir', () => {
        const applyUpdate = jest.fn()
        mockedUsePwaUpdate.mockReturnValue({ updateAvailable: true, applyUpdate })
        render(<UpdateBanner />)
        fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }))
        expect(applyUpdate).toHaveBeenCalledTimes(1)
    })

    it('kapat butonuna tiklaninca banner kaybolur', () => {
        mockedUsePwaUpdate.mockReturnValue({ updateAvailable: true, applyUpdate: jest.fn() })
        render(<UpdateBanner />)
        fireEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(screen.queryByText(/Yeni bir sürüm mevcut/)).not.toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/pwa/__tests__/UpdateBanner.test.tsx`
Expected: FAIL — `Cannot find module '../UpdateBanner'`.

- [ ] **Step 3: Write minimal implementation**

`src/components/pwa/UpdateBanner.tsx`:

```tsx
"use client";

import { useState } from "react";
import { usePwaUpdate } from "@/lib/pwa/usePwaUpdate";

/**
 * `InstallPrompt.tsx` ile ayni gorsel dil (panel/blur/rounded, ayni
 * var(--*) token'lari) ama tek-satir daha sade bir bildirim — backdrop
 * yok, kullaniciyi bloke etmiyor. Kapatma yalnizca BU gorunumu gizler,
 * `InstallPrompt`in aksine kalici bir localStorage bayragi YAZILMAZ:
 * her yeni SW guncellemesi ayri bir olay, kullanici bir oncekini kapatmis
 * olsa bile bir sonrakini gormeli (bkz. spec).
 */
export function UpdateBanner() {
    const { updateAvailable, applyUpdate } = usePwaUpdate();
    const [dismissed, setDismissed] = useState(false);

    if (!updateAvailable || dismissed) return null;

    return (
        <div
            style={{
                position: "fixed",
                bottom: 16,
                left: 16,
                right: 16,
                zIndex: 9997,
                maxWidth: 480,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--panel, #1a1f2e)",
                border: "1px solid var(--border, rgba(255,255,255,0.1))",
                borderRadius: 16,
                padding: "12px 14px",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
                backdropFilter: "blur(20px)",
            }}
        >
            <span style={{ fontSize: "1.1rem" }}>🔄</span>
            <span
                style={{
                    flex: 1,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--card-title, #fff)",
                }}
            >
                Yeni bir sürüm mevcut
            </span>
            <button
                onClick={applyUpdate}
                style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, var(--primary, #1f6feb), var(--primary-2, #134ea5))",
                    color: "white",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                }}
            >
                Güncelle
            </button>
            <button
                onClick={() => setDismissed(true)}
                aria-label="Kapat"
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    background: "transparent",
                    color: "var(--muted, #999)",
                    fontSize: "1rem",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                }}
            >
                ✕
            </button>
        </div>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/pwa/__tests__/UpdateBanner.test.tsx`
Expected: PASS — 4/4 test yeşil.

- [ ] **Step 5: Commit**

```bash
git add src/components/pwa/UpdateBanner.tsx src/components/pwa/__tests__/UpdateBanner.test.tsx
git commit -m "feat(pwa): UpdateBanner bileseni — gorunur guncelleme bildirimi"
```

---

### Task 4: `layout.tsx`'e bağla

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `UpdateBanner` (Task 3).

`layout.tsx` `<html><body>` döndüren kök dosya; `next/font/google` kullanıyor
ve projede bu dosyayı (veya benzer bir root-layout'u) render eden HİÇBİR
test emsali yok, jest config'inde `next/font` mock'u da tanımlı değil —
bu dosyayı doğrudan RTL ile render etmeye çalışmak yeni, doğrulanmamış ve
kırılgan bir test deseni başlatırdı. Bu görev bilinçli olarak TDD'siz: tek
satırlık bağlama değişikliği, güvenlik ağı Task 3'ün `UpdateBanner`
testleri (bileşenin kendisi zaten kanıtlanmış) + bu adımın sonundaki tam
proje `tsc`+`jest` regresyon taraması.

- [ ] **Step 1: `layout.tsx`'i düzenle**

`src/app/layout.tsx`'te satır 7'deki import'un hemen altına ekle:

```tsx
import { UpdateBanner } from "@/components/pwa/UpdateBanner";
```

Satır 71'deki `<InstallPrompt />`'un hemen altına (aynı kardeş seviyesinde,
`<AuthProvider>` içinde) ekle:

```tsx
<UpdateBanner />
```

Sonuç (satır 68-73 civarı):

```tsx
        <AuthProvider>
          <Toaster position="bottom-right" />
          <ServiceWorkerRegister />
          <InstallPrompt />
          <UpdateBanner />
          <SiteChrome>{children}</SiteChrome>
        </AuthProvider>
```

- [ ] **Step 2: Tüm proje testlerini ve tsc'yi çalıştır**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc 0 hata, TÜM proje suite'i yeşil (bu turdan önceki toplam +
bu planın Task 1-3'te eklediği testler — bu adım YENİ bir test eklemez,
yalnızca regresyon kontrolü yapar).

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(pwa): UpdateBanner layout.tsx'e baglandi"
```

---

## Final Doğrulama (planın sonunda, tüm task'lar bitince)

- `npx tsc --noEmit` → 0 hata.
- `npx jest` → tüm proje suite'i yeşil.
- Playwright ile (varsa localhost dev server) `UpdateBanner`'ın normal sayfa yüklemesinde render EDİLMEDİĞİNİ doğrula (`registration.waiting` yokken).
- **Dürüstlük notu (kullanıcıya iletilecek):** Gerçek bir SW `waiting`→kullanıcı-tıklar→`skipWaiting`→`controllerchange` döngüsü Playwright'ta güvenilir şekilde simüle edilemez (bu proje boyunca tekrarlanan bilinen sınırlama — bkz. BottomSheet klavye fix'i, BottomNavbar toolbar-gap fix'i). Bu özellik gerçek bir deploy sonrası kullanıcının kendi cihazında/tarayıcısında teyit edilmeli: (1) siteyi aç, (2) `public/sw.js`'i değiştiren bir deploy yap, (3) saatlik/görünürlük kontrolünün tetiklenmesini bekle veya sayfayı yenile, (4) "Yeni bir sürüm mevcut" banner'ının göründüğünü ve "Güncelle"ye basınca sayfanın temiz şekilde yenilendiğini doğrula.
