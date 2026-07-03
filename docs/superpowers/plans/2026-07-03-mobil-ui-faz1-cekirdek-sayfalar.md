# Mobil UI Faz 1 — Çekirdek Müşteri Sayfaları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En yüksek etkili 4 müşteri sayfasını (hesapla, marketplace, listing/[id], dashboard) Faz 0 primitifleriyle mobile-first yapısal refactor'dan geçirmek; dokunulan sayfalardaki tüm inline stilleri CSS module + token'a taşımak. Desktop görünümü değişmez.

**Architecture:** Her sayfa iki aşamada ele alınır: önce inline stiller davranış değiştirmeden CSS module'e taşınır (desktop birebir), sonra mobil düzen Faz 0 primitifleriyle (`SegmentedTabs`, `BottomSheet`, `StickyActionBar`, `SwipeGallery`, `AppBar`) yeniden kurulur. Dinamik değerler (yüzde, renk) inline `style={{'--var': ...}}` CSS custom property deseniyle geçirilir — bu, "yeni inline stil yazılmaz" kuralının tek istisnasıdır (dashboard'daki mevcut `--card-accent-rgb` deseniyle uyumlu).

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, framer-motion 12 (yalnızca BottomSheet üzerinden), Jest + RTL (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-07-03-mobile-ui-redesign-design.md` §4 Faz 1 satırları. Faz 0 planı: `2026-07-03-mobil-ui-faz0-temel-ve-primitifler.md` (primitifler hazır, commit aralığı `f210209..9676782`).

## Global Constraints

- Breakpoint: 768px ana mobil kesim, 480px küçük ekran — yeni breakpoint değeri icat edilmez.
- Dokunma hedefi min 44×44px (`--touch-target`), mobil form input yüksekliği 48px (`--input-height-mobile`).
- Form alanlarında (input/textarea/select) mobilde font-size ≥16px (iOS input zoom'unu tetiklememek için).
- Yeni inline `style={{}}` yazılmaz; tek istisna dinamik CSS custom property geçişi (`style={{'--x': deger}}`).
- Dokunulan sayfadaki MEVCUT inline stiller temizlenir (boy scout kuralı).
- Desktop görünümü piksel bazında değişmez — her sayfa görevinde 1280px ekran görüntüsü karşılaştırması zorunlu.
- **StickyActionBar KURALI (Faz 0 Task 6 entegrasyon notu):** `BottomNavbar` mobilde her sayfada global görünür → StickyActionBar kullanan HER sayfa `aboveBottomNav={true}` GEÇMEK ZORUNDA.
- **AppBar KURALI:** AppBar kullanan sayfa global `Navbar`'ı mobilde gizlemeli (`Navbar.tsx` içindeki `isHiddenOnMobile` listesine pathname eklenir).
- Z-index ölçeği: `--z-topnav:1050`, `--z-bottomnav:999`, `--z-sheet-backdrop:1100`, `--z-sheet:1101`. Yeni z-index değeri icat edilmez.
- `hesapla` refactor'unda hesaplama davranışı DEĞİŞMEZ — `CalculatorEngineV2` ve girdi-çıktı akışına dokunulmaz; mevcut engine jest testleri güvence.
- Türkçe UI metinleri ve Türkçe commit mesajları (proje geleneği).
- Her task sonunda: `npx tsc --noEmit` 0 hata + `npx jest --no-coverage` yeşil (başlangıç 91/91; Task 4'te +4 test) + commit.
- Sayfa RTL testi yazılmaz (next/navigation + dynamic import mock yükü değmez); sayfa doğrulaması spec §5 gereği Playwright 390×844 yatay-taşma assertion'ı + ekran görüntüsüyle yapılır. Saf props bileşenleri (FilterSidebar) RTL testi alır.

---

### Task 1: Ertelenen Faz 0 smoke koşusu + Faz 1 baseline'ları

Faz 0 Task 9'un açık kalemi: Playwright mobil smoke harness'i Docker kapalı olduğu için hiç koşulmadı. Faz 1'e başlamadan koşulur ve 4 hedef sayfanın DESKTOP baseline ekran görüntüleri alınır (sonraki task'lerde regresyon karşılaştırması için).

**Files:**
- Create: `e2e/desktop-baseline.spec.ts`
- Modify: yok (kod değişikliği yok; koşu + görüntü)

**Interfaces:**
- Produces: `e2e/screenshots/baseline-desktop-*.png` (Task 2-8 reviewer'ları desktop karşılaştırmasında kullanır), `e2e/screenshots/mobil_*.png`.

- [ ] **Step 1: Docker Postgres'i başlat**

```powershell
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Expected: postgres servisi `running`. Docker Desktop kapalıysa önce başlat. **Docker hiç açılamıyorsa:** bu task'ın smoke koşusu yine yapılır — `/`, `/login`, `/register` sayfaları DB'siz de çalışır (globalSetup DB'ye erişemezse auth spec'leri fail olur; yalnızca `e2e/mobil-smoke.spec.ts` ve `e2e/desktop-baseline.spec.ts` dosyalarını koş, sonuca "ortam kısıtı" notu düş).

- [ ] **Step 2: Desktop baseline spec'ini yaz**

`e2e/desktop-baseline.spec.ts`:

```ts
import { test } from '@playwright/test'

// Faz 1 regresyon baseline'ı: 4 hedef sayfanın desktop görüntüsü.
// Task 2-8'de "desktop birebir" iddiası bu görüntülerle karşılaştırılarak doğrulanır.
const DESKTOP_VIEWPORT = { width: 1280, height: 800 }

const PAGES = [
    { path: '/hesapla', name: 'hesapla' },
    { path: '/marketplace', name: 'marketplace' },
    { path: '/listing/e2e-mock', name: 'listing' },
    { path: '/dashboard', name: 'dashboard' }, // auth yoksa /login'e yönlenir — görüntü yine alınır
]

test.use({ viewport: DESKTOP_VIEWPORT })

for (const { path, name } of PAGES) {
    test(`desktop baseline: ${name}`, async ({ page }) => {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await page.screenshot({
            path: `e2e/screenshots/baseline-desktop-${name}.png`,
            fullPage: true,
        })
    })
}
```

- [ ] **Step 3: Smoke + baseline koş**

```powershell
npx playwright test e2e/mobil-smoke.spec.ts e2e/desktop-baseline.spec.ts
```

Expected: mobil smoke'ta 3 pass (`/`, `/login`, `/register`) + 2 fixme-skip (marketplace, hesapla); desktop baseline'da 4 pass. `e2e/screenshots/` altında görüntüler oluşur.

- [ ] **Step 4: Mobil görüntüleri gözle denetle**

`e2e/screenshots/mobil_home.png`, `mobil_login.png`, `mobil_register.png` açılır: yatay taşma yok, içerik 390px'e sığıyor. Sorun varsa kaydet (bu task'ta düzeltme YOK — envanter).

- [ ] **Step 5: Commit**

```powershell
git add e2e/desktop-baseline.spec.ts
git commit -m @'
test(e2e): desktop baseline spec - Faz 1 regresyon karsilastirma goruntuleri

Faz 0 acik kalemi kapatildi: mobil smoke harness ilk kez kosuldu.
'@
```

---

### Task 2: `listing/[id]` — CSS module'e taşıma (desktop birebir)

Sayfanın 69 inline stili yeni `page.module.css`'e taşınır. Görsel çıktı ve davranış birebir aynı kalır; mobil düzen Task 3'te.

**Files:**
- Create: `src/app/listing/[id]/page.module.css`
- Modify: `src/app/listing/[id]/page.tsx` (tam yeniden yazım — aynı JSX ağacı, stiller class'a taşınmış)

**Interfaces:**
- Consumes: mevcut global token'lar (`--green-rgb`, `--primary-rgb`, `--touch-target` vb.)
- Produces: Task 3'ün üzerine mobil media query ekleyeceği class isimleri: `.page`, `.grid`, `.photoArea`, `.photoPlaceholder`, `.sidebar`, `.sidebarActions`, `.backBtn`, `.tabs`, `.fizGrid`, `.title`. Dinamik değer deseni: `--score-pct`, `--score-color`, `--photo-hue`, `--cell-color`.

- [ ] **Step 1: `page.module.css` oluştur**

`src/app/listing/[id]/page.module.css` (tam içerik):

```css
/* =========================================================================
   LISTING DETAY — Faz 1 mobil refactor (Task 2: inline stil migrasyonu)
   Desktop görünümü, önceki inline stillerle birebir aynıdır.
   ========================================================================= */

.page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60vh;
    color: var(--muted);
}

.backBtn {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 0.8rem;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 20px;
    padding: 0;
}

.grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    align-items: start;
}

/* ── Fotoğraf alanı ── */
.photoArea {
    width: 100%;
    height: 340px;
    border-radius: 18px;
    overflow: hidden;
    background: var(--panel-2);
    position: relative;
    margin-bottom: 16px;
}

.photoPlaceholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, hsl(var(--photo-hue, 215), 55%, 18%), hsl(200, 60%, 12%));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
    opacity: 0.5;
}

.scoreOverlay {
    position: absolute;
    top: 16px;
    left: 16px;
}

.changeBadge {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(var(--green-rgb), .85);
    color: white;
    font-size: 0.85rem;
    font-weight: 900;
    padding: 4px 12px;
    border-radius: 10px;
    backdrop-filter: blur(4px);
}

/* ── Skor progress ── */
.progressRow {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
}

.progressLabel {
    font-size: 0.75rem;
    color: var(--muted);
    white-space: nowrap;
}

.progressTrack {
    flex: 1;
    height: 6px;
    background: var(--border);
    border-radius: 6px;
    overflow: hidden;
}

.progressFill {
    width: var(--score-pct, 0%);
    height: 100%;
    background: var(--score-color, var(--green));
    border-radius: 6px;
    transition: width 1s ease;
}

.progressValue {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--score-color, var(--green));
}

/* ── Başlık ── */
.titleBlock {
    margin-bottom: 20px;
}

.titleRow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.title {
    font-size: 1.4rem;
    font-weight: 900;
    color: var(--card-title);
    margin-bottom: 4px;
}

.editBtn {
    padding: 6px 14px;
    background: var(--border);
    color: var(--card-title);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    font-family: inherit;
    font-size: 0.8rem;
    white-space: nowrap;
    flex-shrink: 0;
}

.location {
    font-size: 0.8rem;
    color: var(--muted);
}

/* ── Sekmeler ── */
.tabs {
    display: flex;
    gap: 2px;
    border-bottom: 2px solid var(--border);
    margin-bottom: 20px;
    overflow-x: auto;
}

.tab {
    padding: 10px 14px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    white-space: nowrap;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 5px;
    min-height: var(--touch-target);
}

.tabActive {
    font-weight: 800;
    color: var(--primary);
    border-bottom-color: var(--primary);
}

.tabContent {
    background: var(--panel);
    border: 1.5px solid var(--border);
    border-radius: 16px;
    padding: 20px;
}

.sectionTitle {
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--card-title);
    margin-bottom: 16px;
}

/* ── Genel sekmesi ── */
.detailGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
}

.detailCell {
    background: var(--bg);
    border-radius: 10px;
    padding: 10px 14px;
}

.detailLabel {
    font-size: 0.68rem;
    color: var(--muted);
    margin-bottom: 2px;
}

.detailValue {
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--card-title);
}

.description {
    margin-top: 16px;
    font-size: 0.85rem;
    color: var(--text);
    line-height: 1.6;
}

/* ── Fizibilite sekmesi ── */
.fizGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.fizCell {
    background: var(--bg);
    border-radius: 10px;
    padding: 12px 14px;
}

.fizLabel {
    font-size: 0.68rem;
    color: var(--muted);
    margin-bottom: 4px;
}

.fizValue {
    font-size: 1rem;
    font-weight: 800;
    color: var(--cell-color, var(--card-title));
}

.infoNote {
    margin-top: 14px;
    padding: 10px 14px;
    background: rgba(var(--primary-rgb), .08);
    border-radius: 10px;
    font-size: 0.78rem;
    color: var(--muted);
}

/* ── Senaryo / Mesajlar boş durum CTA ── */
.centerCta {
    text-align: center;
    padding: 2rem;
    color: var(--muted);
}

.centerCtaIcon {
    font-size: 2rem;
    margin-bottom: 8px;
}

.centerCtaTitle {
    font-weight: 700;
    margin-bottom: 12px;
}

.centerCtaAction {
    margin-top: 12px;
}

.primaryBtn {
    padding: 10px 24px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 800;
    min-height: var(--touch-target);
}

/* ── Teklif sekmesi ── */
.offerField {
    margin-bottom: 14px;
}

.offerLabel {
    font-size: 0.75rem;
    color: var(--muted);
    display: block;
    margin-bottom: 6px;
}

.offerRangeRow {
    display: flex;
    align-items: center;
    gap: 10px;
}

.offerRange {
    flex: 1;
    accent-color: var(--primary);
}

.offerShare {
    font-weight: 900;
    font-size: 1.1rem;
    color: var(--primary);
    width: 40px;
}

.offerTextarea {
    width: 100%;
    padding: 10px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-family: inherit;
    font-size: 0.85rem;
    resize: none;
    outline: none;
}

.offerSubmit {
    margin-top: 10px;
    padding: 10px 24px;
    background: var(--green);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 800;
    min-height: var(--touch-target);
}

.offerSubmit:disabled {
    opacity: 0.6;
}

/* ── Sağ sidebar ── */
.sidebar {
    position: sticky;
    top: 80px;
    background: var(--panel);
    border: 1.5px solid var(--border);
    border-radius: 18px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.priceLabel {
    font-size: 0.7rem;
    color: var(--muted);
    margin-bottom: 2px;
}

.priceValue {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--card-title);
}

.miniStats {
    display: flex;
    gap: 10px;
}

.miniStat {
    flex: 1;
    border-radius: 10px;
    padding: 10px 12px;
}

.miniStatGreen {
    background: rgba(var(--green-rgb), .10);
}

.miniStatBlue {
    background: rgba(var(--primary-rgb), .10);
}

.miniStatLabel {
    font-size: 0.65rem;
    color: var(--muted);
}

.miniStatValue {
    font-size: 0.95rem;
    font-weight: 800;
}

.miniStatValueGreen {
    color: var(--green);
}

.miniStatValueBlue {
    color: var(--primary);
}

.sidebarActions {
    border-top: 1px solid var(--border);
    padding-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.actionBtn {
    padding: 11px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 800;
    font-size: 0.85rem;
    min-height: var(--touch-target);
}

.actionPrimary {
    background: var(--primary);
    color: white;
}

.actionGreen {
    background: rgba(var(--green-rgb), .15);
    color: var(--green);
    border: 1.5px solid rgba(var(--green-rgb), .4);
}

.actionGhost {
    background: var(--bg);
    color: var(--muted);
    border: 1.5px solid var(--border);
    font-weight: 700;
}

.sidebarFooter {
    border-top: 1px solid var(--border);
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
}

.shareBtn {
    padding: 9px;
    background: var(--bg);
    color: var(--muted);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.82rem;
    min-height: var(--touch-target);
}

.ownerLink {
    display: block;
    padding: 9px;
    text-align: center;
    background: var(--bg);
    color: var(--muted);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    text-decoration: none;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.82rem;
}

.footnote {
    font-size: 0.65rem;
    color: var(--muted);
    text-align: center;
    line-height: 1.5;
}
```

- [ ] **Step 2: `page.tsx`'i class'lara geçir**

`src/app/listing/[id]/page.tsx` tam yeni içerik. JSX ağacı, metinler ve davranış (fetch fallback, teklif POST, tab state, sahte foto noktaları) DEĞİŞMEZ — yalnızca `style={{}}` → `className`. Dikkat: sahte foto noktaları (`photoIndex`) bu task'ta AYNEN kalır (Task 3'te SwipeGallery ile değişecek):

```tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { FizibiliteScoreBadge } from '@/components/marketplace/FizibiliteScoreBadge';
import { toast } from 'react-hot-toast';
import styles from './page.module.css';

const MiniMap = dynamic(() => import('@/components/marketplace/MiniMap').then(m => m.MiniMap), { ssr: false });

type Tab = 'genel' | 'fizibilite' | 'senaryo' | 'teklifler' | 'mesajlar';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'genel', label: 'Genel Bilgiler', icon: '📋' },
    { id: 'fizibilite', label: 'Ön Fizibilite', icon: '📊' },
    { id: 'senaryo', label: 'Senaryo', icon: '🧮' },
    { id: 'teklifler', label: 'Teklifler', icon: '📩' },
    { id: 'mesajlar', label: 'Mesajlar', icon: '💬' },
];

const MOCK_LISTING = {
    id: '',
    title: '820 m² Kat Karşılığı İlan',
    type: 'KAT_KARSILIGI',
    city: 'İstanbul',
    district: 'Beşiktaş',
    fizibiliteSkoru: 82,
    arsaPayiMin: 30,
    arsaPayiMax: 42,
    changePercent: 42.5,
    imarDurumu: 'KONUT_TICARET',
    emsal: 2.0,
    m2: 820,
    price: 5171642,
    netKar: 34,
    photos: [] as string[],
    description: 'Beşiktaş merkezi konumda, ulaşıma yakın, imar planlı arsa. Kat karşılığı veya satış seçenekleri görüşmeye açık.',
    lat: 41.042,
    lng: 29.008,
    user: null as null | { id: string; name: string | null; email: string; isVerified: boolean },
};

export default function ListingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const id = params?.id as string;

    const initialTab = (searchParams.get('tab') as Tab) ?? 'genel';
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [listing, setListing] = useState(MOCK_LISTING);
    const [loading, setLoading] = useState(true);
    const [photoIndex, setPhotoIndex] = useState(0);

    // Offer state
    const [offerShare, setOfferShare] = useState(33);
    const [offerMsg, setOfferMsg] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        // Try to fetch real listing, fall back to mock
        fetch(`/api/listings/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data && data.id) {
                    setListing({ ...MOCK_LISTING, ...data, id });
                } else {
                    setListing({ ...MOCK_LISTING, id });
                }
            })
            .catch(() => setListing({ ...MOCK_LISTING, id }))
            .finally(() => setLoading(false));
    }, [id]);

    const handleOffer = async () => {
        setSending(true);
        try {
            const res = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listingId: id,
                    offeredShare: offerShare,
                    message: offerMsg,
                }),
            });
            if (res.ok) {
                toast.success(`%${offerShare} arsa payı teklifiniz iletildi!`);
                setOfferMsg('');
            } else {
                const data = await res.json();
                toast.error(data.message || 'Teklif gönderilemedi.');
            }
        } catch {
            toast.error('Bağlantı hatası.');
        } finally {
            setSending(false);
        }
    };

    if (loading) return (
        <div className={styles.loading}>
            Yükleniyor…
        </div>
    );

    const score = listing.fizibiliteSkoru ?? 82;
    const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)';
    const photoHue = 215 + (id?.charCodeAt(0) ?? 0) % 30;

    return (
        <div className={styles.page}>

            {/* ── Back button ── */}
            <button onClick={() => router.back()} className={styles.backBtn}>← Pazar Yerine Dön</button>

            {/* ── Main Grid ── */}
            <div className={styles.grid}>

                {/* LEFT */}
                <div>
                    {/* Photo area */}
                    <div className={styles.photoArea}>
                        <div
                            className={styles.photoPlaceholder}
                            style={{ '--photo-hue': photoHue } as React.CSSProperties}
                        >🏗️</div>

                        {/* Dots */}
                        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} onClick={() => setPhotoIndex(i)} style={{
                                    width: i === photoIndex ? 20 : 8, height: 8, borderRadius: 4,
                                    background: i === photoIndex ? 'white' : 'rgba(255,255,255,.45)',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }} />
                            ))}
                        </div>

                        {/* Fizibilite score overlay */}
                        <div className={styles.scoreOverlay}>
                            <FizibiliteScoreBadge score={score} size="lg" showLabel />
                        </div>

                        {/* Change badge */}
                        <span className={styles.changeBadge}>▲ +{listing.changePercent}%</span>
                    </div>

                    {/* Progress bar */}
                    <div
                        className={styles.progressRow}
                        style={{ '--score-pct': `${score}%`, '--score-color': scoreColor } as React.CSSProperties}
                    >
                        <span className={styles.progressLabel}>Fizibilite Skoru</span>
                        <div className={styles.progressTrack}>
                            <div className={styles.progressFill} />
                        </div>
                        <span className={styles.progressValue}>{score}/100</span>
                    </div>

                    {/* Title row */}
                    <div className={styles.titleBlock}>
                        <div className={styles.titleRow}>
                            <h1 className={styles.title}>{listing.title}</h1>
                            {session?.user?.id && listing.user?.id && (session.user.id as string) === (listing.user.id as string) && (
                                <button
                                    onClick={() => router.push(`/listings/${id}/edit`)}
                                    className={styles.editBtn}
                                >
                                    ✏️ Düzenle
                                </button>
                            )}
                        </div>
                        <div className={styles.location}>📍 {listing.district}, {listing.city}</div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className={styles.tabContent}>

                        {activeTab === 'genel' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Parsel Detayları</h3>
                                <div className={styles.detailGrid}>
                                    {[
                                        ['Alan', `${listing.m2} m²`],
                                        ['İmar Durumu', listing.imarDurumu?.replace('_', ' ') ?? 'Konut + Ticaret'],
                                        ['Emsal', listing.emsal?.toString() ?? '2.0'],
                                        ['Arsa Payı', `%${listing.arsaPayiMin}–${listing.arsaPayiMax}`],
                                        ['Şehir', listing.city ?? 'İstanbul'],
                                        ['İlçe', listing.district ?? 'Beşiktaş'],
                                    ].map(([label, val]) => (
                                        <div key={label} className={styles.detailCell}>
                                            <div className={styles.detailLabel}>{label}</div>
                                            <div className={styles.detailValue}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                                {listing.description && (
                                    <p className={styles.description}>{listing.description}</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'fizibilite' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Ön Fizibilite Sonuçları</h3>
                                <div className={styles.fizGrid}>
                                    {[
                                        ['Tahmini Arsa Değeri', '4.371.200 TL', 'var(--primary)'],
                                        ['Tahmini Net Kâr', '+%34 (▲+1.76M TL)', 'var(--green)'],
                                        ['Fizibilite Skoru', `${score}/100`, scoreColor],
                                        ['Piyasa Karşılaştırma', `+${listing.changePercent}%`, 'var(--green)'],
                                        ['Daire/m² Tahmini', '9.5/m²', 'var(--card-title)'],
                                        ['Proje Süresi', '~18–24 ay', 'var(--muted)'],
                                    ].map(([label, val, color]) => (
                                        <div
                                            key={label}
                                            className={styles.fizCell}
                                            style={{ '--cell-color': color as string } as React.CSSProperties}
                                        >
                                            <div className={styles.fizLabel}>{label}</div>
                                            <div className={styles.fizValue}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.infoNote}>
                                    💡 Bu değerler ArsaBil Engine v2 tarafından otomatik hesaplanmıştır. Detaylı analiz için Senaryo sekmesini kullanın.
                                </div>
                            </div>
                        )}

                        {activeTab === 'senaryo' && (
                            <div className={styles.centerCta}>
                                <div className={styles.centerCtaIcon}>🧮</div>
                                <div className={styles.centerCtaTitle}>Bu ilan için özel senaryo oluşturun</div>
                                <button
                                    onClick={() => router.push(`/?listing=${listing.id}`)}
                                    className={styles.primaryBtn}
                                >
                                    Hesap Makinesini Aç →
                                </button>
                            </div>
                        )}

                        {activeTab === 'teklifler' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Teklif Ver</h3>
                                <div className={styles.offerField}>
                                    <label className={styles.offerLabel}>Teklif Ettiğim Arsa Payı (%)</label>
                                    <div className={styles.offerRangeRow}>
                                        <input type="range" min={10} max={60} value={offerShare} onChange={e => setOfferShare(+e.target.value)}
                                            className={styles.offerRange} />
                                        <span className={styles.offerShare}>%{offerShare}</span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Teklif notunuz (opsiyonel)"
                                    value={offerMsg} onChange={e => setOfferMsg(e.target.value)}
                                    rows={3}
                                    className={styles.offerTextarea}
                                />
                                <button onClick={handleOffer} disabled={sending} className={styles.offerSubmit}>
                                    {sending ? 'Gönderiliyor…' : '📤 Teklifi Gönder'}
                                </button>
                            </div>
                        )}

                        {activeTab === 'mesajlar' && (
                            <div className={styles.centerCta}>
                                <div className={styles.centerCtaIcon}>💬</div>
                                İlan sahibiyle iletişime geçin
                                <div className={styles.centerCtaAction}>
                                    <button onClick={() => router.push('/inbox')} className={styles.primaryBtn}>Mesaj Aç →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT — Sticky sidebar */}
                <div className={styles.sidebar}>
                    <div>
                        <div className={styles.priceLabel}>Tahmini Değer</div>
                        <div className={styles.priceValue}>
                            {(listing.price ?? 5171642).toLocaleString('tr-TR')} TL
                        </div>
                    </div>

                    <div className={styles.miniStats}>
                        <div className={`${styles.miniStat} ${styles.miniStatGreen}`}>
                            <div className={styles.miniStatLabel}>Net Kâr</div>
                            <div className={`${styles.miniStatValue} ${styles.miniStatValueGreen}`}>+%{listing.netKar}</div>
                        </div>
                        <div className={`${styles.miniStat} ${styles.miniStatBlue}`}>
                            <div className={styles.miniStatLabel}>Arsa Payı</div>
                            <div className={`${styles.miniStatValue} ${styles.miniStatValueBlue}`}>%{listing.arsaPayiMin}–{listing.arsaPayiMax}</div>
                        </div>
                    </div>

                    {/* Mini Map */}
                    <MiniMap
                        lat={listing.lat ?? 41.042}
                        lng={listing.lng ?? 29.008}
                        label={`${listing.district}, ${listing.city}`}
                        listingId={id}
                    />

                    <div className={styles.sidebarActions}>
                        <button onClick={() => setActiveTab('senaryo')} className={`${styles.actionBtn} ${styles.actionPrimary}`}>🧮 Senaryo Oluştur</button>
                        <button onClick={() => setActiveTab('teklifler')} className={`${styles.actionBtn} ${styles.actionGreen}`}>📤 Teklif Ver</button>
                        <button onClick={() => setActiveTab('mesajlar')} className={`${styles.actionBtn} ${styles.actionGhost}`}>💬 Mesaj At</button>
                    </div>

                    {/* Share + Owner */}
                    <div className={styles.sidebarFooter}>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href)
                                    .then(() => toast.success('Link kopyalandı!'))
                                    .catch(() => toast.error('Kopyalanamadı.'));
                            }}
                            className={styles.shareBtn}
                        >🔗 Paylaş</button>

                        {listing.user?.id && (
                            <a
                                href={`/profile/${listing.user.id}`}
                                className={styles.ownerLink}
                            >
                                👤 İlan Sahibinin Profili
                            </a>
                        )}
                    </div>

                    <div className={styles.footnote}>
                        Tüm anlaşmalar ArsaBil güvencesindedir. İlan No: {id?.slice(0, 8).toUpperCase()}
                    </div>
                </div>
            </div>
        </div>
    );
}
```

NOT: Sahte foto noktalarındaki inline stiller bilinçli bırakıldı — Task 3'te bu blok tamamen silinip `SwipeGallery`'ye dönüşüyor; iki kez taşımak boşa iş.

- [ ] **Step 3: Doğrula**

```powershell
npx tsc --noEmit && npx jest --no-coverage
```

Expected: tsc 0 hata, jest 91/91.

- [ ] **Step 4: Desktop görsel karşılaştırma**

```powershell
npx playwright test e2e/desktop-baseline.spec.ts -g listing
```

`e2e/screenshots/baseline-desktop-listing.png` Task 1'deki kopyayla gözle karşılaştırılır (Task 1 sonrası dosyayı `baseline-desktop-listing.task1.png` olarak kopyalamak pratik). Fark: yok.

- [ ] **Step 5: Commit**

```powershell
git add "src/app/listing/[id]/page.tsx" "src/app/listing/[id]/page.module.css"
git commit -m @'
refactor(mobil): listing detay inline stilleri CSS module'e tasindi

Desktop birebir; 69 inline stilden geriye yalnizca Task 3'te silinecek
sahte foto noktalari ve dinamik CSS var gecisleri kaldi.
'@
```

---

### Task 3: `listing/[id]` — mobil tek kolon + SwipeGallery + StickyActionBar + AppBar

Sabit `1fr 320px` grid mobilde tek kolona düşer; sahte foto noktaları gerçek `SwipeGallery`'ye dönüşür; teklif/iletişim aksiyonları `StickyActionBar`'a taşınır; sayfa mobilde `AppBar` alır (global Navbar gizlenir).

**Files:**
- Modify: `src/app/listing/[id]/page.tsx`
- Modify: `src/app/listing/[id]/page.module.css` (mobil media query eklenir)
- Modify: `src/components/layout/Navbar.tsx:44-50` (isHiddenOnMobile listesi)
- Modify: `e2e/mobil-smoke.spec.ts` (listing sayfası eklenir)

**Interfaces:**
- Consumes:
  - `AppBar({ title: string; showBack?: boolean; backHref?: string; action?: React.ReactNode })` — `src/components/mobile/AppBar` (desktop'ta kendisi `display:none`)
  - `SwipeGallery({ images: string[]; alt: string })` — `images` boşsa null döner
  - `StickyActionBar({ children; aboveBottomNav?: boolean })` — bu sayfada BottomNavbar görünür → `aboveBottomNav` ZORUNLU
- Produces: e2e PAGES listesinde `/listing/e2e-mock` girdisi (Task 9 tam koşuda kullanılır)

- [ ] **Step 1: Import'ları ve foto bloğunu değiştir**

`page.tsx` import bölümüne ekle:

```tsx
import { AppBar } from '@/components/mobile/AppBar';
import { SwipeGallery } from '@/components/mobile/SwipeGallery';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
```

`photoIndex` state'i tamamen silinir (`const [photoIndex, setPhotoIndex] = useState(0);` satırı). Foto alanı bloğu şu hale gelir (sahte noktalar silindi; foto varsa SwipeGallery, yoksa placeholder):

```tsx
                    {/* Photo area */}
                    <div className={styles.photoArea}>
                        {listing.photos.length > 0 ? (
                            <SwipeGallery images={listing.photos} alt={listing.title} />
                        ) : (
                            <div
                                className={styles.photoPlaceholder}
                                style={{ '--photo-hue': photoHue } as React.CSSProperties}
                            >🏗️</div>
                        )}

                        {/* Fizibilite score overlay */}
                        <div className={styles.scoreOverlay}>
                            <FizibiliteScoreBadge score={score} size="lg" showLabel />
                        </div>

                        {/* Change badge */}
                        <span className={styles.changeBadge}>▲ +{listing.changePercent}%</span>
                    </div>
```

- [ ] **Step 2: AppBar ve StickyActionBar'ı ekle**

`return (` bloğunun en başına, `<div className={styles.page}>` öncesine değil İÇİNE ilk çocuk olarak AppBar:

```tsx
        <div className={styles.page}>
            <AppBar title="İlan Detayı" showBack />
```

Kapanış `</div>` öncesine (`.grid`'in dışına) StickyActionBar:

```tsx
            <StickyActionBar aboveBottomNav>
                <div className={styles.stickyBtns}>
                    <button
                        onClick={() => setActiveTab('teklifler')}
                        className={`${styles.actionBtn} ${styles.actionGreen} ${styles.stickyBtn}`}
                    >📤 Teklif Ver</button>
                    <button
                        onClick={() => setActiveTab('senaryo')}
                        className={`${styles.actionBtn} ${styles.actionPrimary} ${styles.stickyBtn}`}
                    >🧮 Senaryo</button>
                </div>
            </StickyActionBar>
        </div>
```

- [ ] **Step 3: Mobil CSS'i ekle**

`page.module.css` sonuna:

```css
/* ── StickyActionBar içeriği (bar zaten yalnızca mobilde görünür) ── */
.stickyBtns {
    display: flex;
    gap: 8px;
    width: 100%;
}

.stickyBtn {
    flex: 1;
}

/* =========================================================================
   MOBİL (≤768px) — tek kolon akış
   ========================================================================= */
@media (max-width: 768px) {
    .page {
        /* alt boşluk: StickyActionBar + BottomNavbar */
        padding: 12px 12px calc(var(--bottomnav-height) + 76px);
    }

    /* AppBar'ın geri butonu var; metin geri linki gizlenir */
    .backBtn {
        display: none;
    }

    .grid {
        grid-template-columns: 1fr;
        gap: 16px;
    }

    .photoArea {
        height: 240px;
        border-radius: 14px;
    }

    .title {
        font-size: var(--font-size-title);
    }

    .fizGrid {
        grid-template-columns: 1fr;
    }

    .sidebar {
        position: static;
    }

    /* aksiyonlar StickyActionBar'a taşındı; sidebar kopyası gizlenir */
    .sidebarActions {
        display: none;
    }

    .offerTextarea {
        font-size: 16px; /* iOS zoom tetiklenmesin */
    }
}
```

- [ ] **Step 4: Navbar'ı listing detayında mobilde gizle**

`src/components/layout/Navbar.tsx` — mevcut:

```tsx
    const isInbox = pathname.startsWith("/inbox");
    const isProfile = pathname.startsWith("/dashboard/profile");
    
    // Pages where the top navbar should be HIDDEN on mobile
    const isHiddenOnMobile = isInbox || isProfile;
```

Yeni:

```tsx
    const isInbox = pathname.startsWith("/inbox");
    const isProfile = pathname.startsWith("/dashboard/profile");
    const isListingDetail = pathname.startsWith("/listing/");
    
    // Pages where the top navbar should be HIDDEN on mobile
    const isHiddenOnMobile = isInbox || isProfile || isListingDetail;
```

- [ ] **Step 5: e2e listesine ekle**

`e2e/mobil-smoke.spec.ts` PAGES dizisine (marketplace satırından önce):

```ts
    { path: '/listing/e2e-mock' },
```

Not: sayfa `/api/listings/e2e-mock` başarısız olunca MOCK_LISTING'e düşer — DB'siz de render olur.

- [ ] **Step 6: Doğrula**

```powershell
npx tsc --noEmit && npx jest --no-coverage
npx playwright test e2e/mobil-smoke.spec.ts -g listing
npx playwright test e2e/desktop-baseline.spec.ts -g listing
```

Expected: tsc 0, jest 91/91, mobil listing testi PASS (taşma ≤0), desktop görüntüsü Task 2 ile birebir (AppBar/StickyActionBar desktop'ta görünmez). Mobil ekran görüntüsünde: AppBar üstte, tek kolon, sticky bar altta BottomNavbar'ın ÜSTÜNDE (arkasında değil!).

- [ ] **Step 7: Commit**

```powershell
git add "src/app/listing/[id]" src/components/layout/Navbar.tsx e2e/mobil-smoke.spec.ts
git commit -m @'
feat(mobil): listing detay tek kolon - SwipeGallery, StickyActionBar, AppBar

1fr 320px sabit grid mobilde tek kolona indi; sahte foto noktalari
SwipeGallery oldu; teklif/senaryo CTA'lari yapisan cubuga tasindi.
'@
```

---

### Task 4: `FilterSidebar` — CSS module + sheet varyantı + RTL testleri

FilterSidebar'ın ~30 inline stili module'e taşınır; `inSheet` (BottomSheet içinde tam genişlik) ve `onApply` (uygula butonunun callback'i) prop'ları eklenir. Saf props bileşeni olduğu için RTL testi yazılır (TDD: önce test).

**Files:**
- Create: `src/components/marketplace/FilterSidebar.module.css`
- Modify: `src/components/marketplace/FilterSidebar.tsx` (tam yeniden yazım)
- Test: `src/components/mobile/__tests__/FilterSidebar.test.tsx`

**Interfaces:**
- Consumes: mevcut `Filters` şekli (`type: string[]; minSize; maxSize; imar: string[]; minEmsal; maxEmsal; fizibiliteOnly; minScore`)
- Produces: `FilterSidebar({ filters, onChange, totalCount, inSheet?: boolean, onApply?: () => void })` — Task 5 marketplace'te `inSheet onApply={() => setFilterOpen(false)}` ile kullanır. Kök class: `inSheet` verilirse `.sidebar.inSheet` (genişlik 100%, kenarlık yok).

- [ ] **Step 1: Failing testleri yaz**

`src/components/mobile/__tests__/FilterSidebar.test.tsx`:

```tsx
/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterSidebar } from '@/components/marketplace/FilterSidebar'

const FILTERS = {
    type: ['KAT_KARSILIGI'],
    minSize: 200, maxSize: 10000,
    imar: [] as string[], minEmsal: 0.8, maxEmsal: 3.0,
    fizibiliteOnly: false, minScore: 10,
}

describe('FilterSidebar', () => {
    it('ilan sayısını gösterir', () => {
        render(<FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={42} />)
        expect(screen.getByText('42 ilan bulundu')).toBeInTheDocument()
    })

    it('imar chip tıklaması onChange ile filtreyi ekler', () => {
        const onChange = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={onChange} totalCount={0} />)
        fireEvent.click(screen.getByRole('button', { name: 'Konut' }))
        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, imar: ['KONUT'] })
    })

    it('inSheet verilince kök eleman inSheet sınıfını alır', () => {
        const { container } = render(
            <FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={0} inSheet />
        )
        expect((container.firstChild as HTMLElement).className).toContain('inSheet')
    })

    it('Filtreleri Uygula onApply çağırır', () => {
        const onApply = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={0} onApply={onApply} />)
        fireEvent.click(screen.getByRole('button', { name: 'Filtreleri Uygula' }))
        expect(onApply).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Testlerin FAIL ettiğini gör**

```powershell
npx jest src/components/mobile/__tests__/FilterSidebar.test.tsx --no-coverage
```

Expected: 4 test; `inSheet`/`onApply` testleri FAIL (prop yok), diğer ikisi mevcut bileşenle PASS olabilir — en az 2 FAIL.

- [ ] **Step 3: `FilterSidebar.module.css` oluştur**

```css
/* =========================================================================
   FILTER SIDEBAR — Faz 1 inline stil migrasyonu + sheet varyantı
   ========================================================================= */

.sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--panel);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
}

/* BottomSheet içinde: tam genişlik, kenarlıksız, sheet zaten kaydırıyor */
.inSheet {
    width: 100%;
    border-right: none;
    background: transparent;
    overflow-y: visible;
    padding: 0 4px 8px;
}

.header {
    margin-bottom: 16px;
}

.headerTitle {
    font-size: 1rem;
    font-weight: 800;
    color: var(--card-title);
    margin-bottom: 2px;
}

.headerCount {
    font-size: 0.72rem;
    color: var(--muted);
}

.section {
    margin-bottom: 20px;
}

.sectionLabel {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.07em;
    margin-bottom: 8px;
    display: block;
}

.checkRow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    font-size: 0.82rem;
    color: var(--text);
    font-weight: 500;
    min-height: 32px;
}

.checkBox {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 2px solid var(--border);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s;
}

.checkBoxActive {
    border-color: var(--primary);
    background: var(--primary);
}

.checkMark {
    color: white;
    font-size: 0.6rem;
    font-weight: 900;
}

.rangeRow {
    display: flex;
    gap: 6px;
    align-items: center;
}

.rangeInput {
    width: 70px;
    padding: 6px 10px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: inherit;
    font-size: 0.8rem;
}

.rangeDash {
    color: var(--muted);
    font-size: 0.8rem;
}

.chipWrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.chip {
    padding: 4px 10px;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: transparent;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    min-height: 32px;
}

.chipActive {
    border-color: var(--primary);
    background: rgba(var(--primary-rgb), .10);
    color: var(--primary);
    font-weight: 700;
}

.toggleRow {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    margin-bottom: 10px;
    min-height: 32px;
}

.toggleTrack {
    width: 40px;
    height: 22px;
    border-radius: 11px;
    background: var(--border);
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
}

.toggleTrackActive {
    background: var(--primary);
}

.toggleThumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .3);
}

.toggleThumbActive {
    left: 21px;
}

.toggleLabel {
    font-size: 0.78rem;
    color: var(--text);
    font-weight: 500;
}

.scoreHeader {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
}

.scoreLabel {
    font-size: 0.7rem;
    color: var(--muted);
}

.scoreValue {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--primary);
}

.scoreRange {
    width: 100%;
    accent-color: var(--primary);
}

.footer {
    margin-top: auto;
    padding-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.inSheet .footer {
    margin-top: 8px;
}

.applyBtn {
    padding: 10px;
    border-radius: 10px;
    background: var(--primary);
    color: white;
    border: none;
    cursor: pointer;
    font-weight: 800;
    font-family: inherit;
    font-size: 0.85rem;
    min-height: var(--touch-target);
}

.resetBtn {
    padding: 8px;
    border-radius: 10px;
    background: transparent;
    color: var(--muted);
    border: 1.5px solid var(--border);
    cursor: pointer;
    font-weight: 600;
    font-family: inherit;
    font-size: 0.8rem;
    min-height: var(--touch-target);
}

@media (max-width: 768px) {
    .rangeInput {
        font-size: 16px; /* iOS zoom tetiklenmesin */
        height: var(--input-height-mobile);
        width: 90px;
    }
}
```

- [ ] **Step 4: `FilterSidebar.tsx`'i yeniden yaz**

```tsx
"use client";

import styles from './FilterSidebar.module.css';

interface Filters {
    type: string[];
    minSize: number;
    maxSize: number;
    imar: string[];
    minEmsal: number;
    maxEmsal: number;
    fizibiliteOnly: boolean;
    minScore: number;
}

interface Props {
    filters: Filters;
    onChange: (f: Filters) => void;
    totalCount: number;
    /** BottomSheet içinde tam genişlik varyantı */
    inSheet?: boolean;
    /** "Filtreleri Uygula" tıklanınca (sheet'i kapatmak için) */
    onApply?: () => void;
}

const TYPES = [
    { id: 'SALE', label: 'Satış' },
    { id: 'KAT_KARSILIGI', label: 'Kat Karşılığı / Ortaklık' },
];

const IMAR_OPTS = ['Konut', 'Ticaret', 'Konut + Ticaret', 'Diğer'];
const IMAR_VALS = ['KONUT', 'TICARET', 'KONUT_TICARET', 'DIGER'];

export function FilterSidebar({ filters, onChange, totalCount, inSheet = false, onApply }: Props) {
    const set = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });

    const toggleType = (id: string) => {
        const has = filters.type.includes(id);
        set({ type: has ? filters.type.filter(t => t !== id) : [...filters.type, id] });
    };

    const toggleImar = (val: string) => {
        const has = filters.imar.includes(val);
        set({ imar: has ? filters.imar.filter(v => v !== val) : [...filters.imar, val] });
    };

    const resetAll = () => onChange({
        type: ['KAT_KARSILIGI'],
        minSize: 200, maxSize: 10000,
        imar: [], minEmsal: 0.8, maxEmsal: 3.0,
        fizibiliteOnly: false, minScore: 10,
    });

    return (
        <aside className={`${styles.sidebar} ${inSheet ? styles.inSheet : ''}`}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTitle}>Arsa İlanları</div>
                <div className={styles.headerCount}>{totalCount.toLocaleString('tr-TR')} ilan bulundu</div>
            </div>

            {/* Satış Türü */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>SATIŞ TÜRÜ</span>
                {TYPES.map(t => (
                    <label key={t.id} className={styles.checkRow}>
                        <div
                            onClick={() => toggleType(t.id)}
                            className={`${styles.checkBox} ${filters.type.includes(t.id) ? styles.checkBoxActive : ''}`}
                        >
                            {filters.type.includes(t.id) && <span className={styles.checkMark}>✓</span>}
                        </div>
                        {t.label}
                    </label>
                ))}
            </div>

            {/* Arsa Boyutu */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>ARSA BOYUTU (m²)</span>
                <div className={styles.rangeRow}>
                    <input type="number" value={filters.minSize} onChange={e => set({ minSize: +e.target.value })} className={styles.rangeInput} />
                    <span className={styles.rangeDash}>–</span>
                    <input type="number" value={filters.maxSize} onChange={e => set({ maxSize: +e.target.value })} className={styles.rangeInput} />
                </div>
            </div>

            {/* İmar Durumu */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>İMAR DURUMU</span>
                <div className={styles.chipWrap}>
                    {IMAR_OPTS.map((label, i) => {
                        const val = IMAR_VALS[i];
                        const active = filters.imar.includes(val);
                        return (
                            <button
                                key={val}
                                onClick={() => toggleImar(val)}
                                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                            >{label}</button>
                        );
                    })}
                </div>
            </div>

            {/* Emsal */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>EMSAL</span>
                <div className={styles.rangeRow}>
                    <input type="number" step={0.1} value={filters.minEmsal} onChange={e => set({ minEmsal: +e.target.value })} className={styles.rangeInput} />
                    <span className={styles.rangeDash}>–</span>
                    <input type="number" step={0.1} value={filters.maxEmsal} onChange={e => set({ maxEmsal: +e.target.value })} className={styles.rangeInput} />
                </div>
            </div>

            {/* Fizibilite */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>FİZİBİLİTE</span>
                <label className={styles.toggleRow}>
                    <div
                        onClick={() => set({ fizibiliteOnly: !filters.fizibiliteOnly })}
                        className={`${styles.toggleTrack} ${filters.fizibiliteOnly ? styles.toggleTrackActive : ''}`}
                    >
                        <div className={`${styles.toggleThumb} ${filters.fizibiliteOnly ? styles.toggleThumbActive : ''}`} />
                    </div>
                    <span className={styles.toggleLabel}>Fizibilite Skoru Olanlar</span>
                </label>
                {filters.fizibiliteOnly && (
                    <div>
                        <div className={styles.scoreHeader}>
                            <span className={styles.scoreLabel}>Min Skor</span>
                            <span className={styles.scoreValue}>{filters.minScore}+</span>
                        </div>
                        <input type="range" min={10} max={90} value={filters.minScore} onChange={e => set({ minScore: +e.target.value })}
                            className={styles.scoreRange} />
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div className={styles.footer}>
                <button className={styles.applyBtn} onClick={onApply}>Filtreleri Uygula</button>
                <button onClick={resetAll} className={styles.resetBtn}>Tümünü Sıfırla</button>
            </div>
        </aside>
    );
}
```

- [ ] **Step 5: Testlerin PASS ettiğini gör**

```powershell
npx jest src/components/mobile/__tests__/FilterSidebar.test.tsx --no-coverage
npx jest --no-coverage
npx tsc --noEmit
```

Expected: 4/4 PASS; toplam 95/95; tsc 0.

- [ ] **Step 6: Commit**

```powershell
git add src/components/marketplace/FilterSidebar.tsx src/components/marketplace/FilterSidebar.module.css src/components/mobile/__tests__/FilterSidebar.test.tsx
git commit -m @'
refactor(mobil): FilterSidebar CSS module + inSheet/onApply varyanti

BottomSheet icinde tam genislik kullanim icin hazirlandi; 4 RTL testi.
'@
```

---

### Task 5: `marketplace` — SegmentedTabs + BottomSheet filtreler + inline stil temizliği

Mobilde 3'lü özel tab (Filtreler/İlanlar/Harita) yerine: `SegmentedTabs` (İlanlar/Harita) + filtreleri `BottomSheet`'te açan buton. Sayfadaki inline stiller module'e taşınır; e2e fixme kaldırılır.

**Files:**
- Modify: `src/app/marketplace/page.tsx`
- Modify: `src/app/marketplace/page.module.css`
- Modify: `e2e/mobil-smoke.spec.ts` (marketplace fixme kaldırılır)

**Interfaces:**
- Consumes:
  - `SegmentedTabs({ options: {value,label}[]; value: string; onChange: (v: string) => void; ariaLabel: string })`
  - `BottomSheet({ open: boolean; onClose: () => void; title?: string; children })` — body'e portallanır, z-index navbar üstünde
  - Task 4'ün `FilterSidebar` yeni prop'ları: `inSheet`, `onApply`
- Produces: `mobileTab` tipi `'list' | 'map'`'e daralır; `data-mobile-tab` attribute'u aynı isimle kalır (CSS bağı korunur)

- [ ] **Step 1: page.module.css'e yeni class'ları ekle ve filter-tab kurallarını kaldır**

`.mobileTabs` bloğu ve media query içindeki `.mobileTabs button` / `.mobileTabs button.activeTab` / `.bodyContainer[data-mobile-tab="filter"] .sidebarWrapper` kuralları SİLİNİR. Yerine dosya sonuna (media query dışında kalanlar üstte):

```css
/* ── Faz 1: mobil kontroller + inline stil migrasyonu ── */

.suspenseFallback {
    padding: 2rem;
    text-align: center;
    color: var(--muted);
}

.mapLoading {
    flex: 1;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
}

.quickChip {
    padding: 6px 14px;
    border-radius: 20px;
    background: var(--bg);
    color: var(--muted);
    border: 1.5px solid var(--border);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 500;
    transition: all 0.15s;
    white-space: nowrap;
    min-height: 32px;
}

.quickChipActive {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    font-weight: 700;
}

.emsalChip {
    font-size: 0.78rem;
    color: var(--muted);
    padding: 6px 14px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 20px;
    white-space: nowrap;
}

.sortSelect {
    padding: 6px 10px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: inherit;
    font-size: 0.78rem;
    cursor: pointer;
}

.listPanelSplit {
    width: 360px;
    border-right: 1px solid var(--border);
}

.listPanelFull {
    width: 100%;
    border-right: none;
}

.skeletonList {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.skeletonItem {
    background: var(--panel);
    border-radius: 16px;
    animation: pulse 1.5s infinite;
    border: 1px solid var(--border);
}

.skeletonItemSplit {
    height: 280px;
}

.skeletonItemList {
    height: 130px;
}

@keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
}

.emptyState {
    text-align: center;
    padding: 3rem;
    color: var(--muted);
}

.emptyStateIcon {
    font-size: 2rem;
    margin-bottom: 8px;
}

.countLabel {
    font-size: 0.75rem;
    color: var(--muted);
    padding: 0 2px;
}

.pagination {
    display: flex;
    gap: 4px;
    justify-content: center;
    padding: 8px 0;
    flex-wrap: wrap;
}

.pageBtn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--bg);
    color: var(--muted);
    border: 1.5px solid var(--border);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 700;
}

.pageBtnActive {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
}

.mobileControls {
    display: none;
}

.filterBtn {
    flex-shrink: 0;
    padding: 0 14px;
    min-height: var(--touch-target);
    border-radius: 10px;
    background: var(--panel-2);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
}
```

Media query (`@media (max-width: 768px)`) içine — silinen `.mobileTabs` kurallarının yerine:

```css
    .mobileControls {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        background: var(--panel);
        border-bottom: 1px solid var(--border);
        padding: 8px 16px;
        flex-shrink: 0;
    }

    .mobileControls > :first-child {
        flex: 1;
        min-width: 0;
    }

    .listPanelSplit,
    .listPanelFull {
        width: 100% !important;
    }

    .pageBtn {
        width: var(--touch-target);
        height: var(--touch-target);
    }
```

DİKKAT: media query'deki mevcut `.sidebarWrapper, .listPanel, .mapPanel { display:none !important }` bloğu ve `[data-mobile-tab="list"]` / `[data-mobile-tab="map"]` kuralları KALIR (sekme geçişini onlar yapıyor). Yalnızca `[data-mobile-tab="filter"]`'a bağlı kural silinir. `.sidebarWrapper`'a mobilde artık gerek yok (filtre sheet'te) — `display:none !important` kapsamında zaten gizli.

- [ ] **Step 2: page.tsx'i güncelle**

İmport'lar:

```tsx
import { SegmentedTabs } from '@/components/mobile/SegmentedTabs';
import { BottomSheet } from '@/components/mobile/BottomSheet';
```

State değişikliği — eski:

```tsx
    const [mobileTab, setMobileTab] = useState<'filter' | 'list' | 'map'>('list');
```

yeni:

```tsx
    const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');
    const [filterOpen, setFilterOpen] = useState(false);
```

`MarketplacePage` Suspense fallback'i — eski inline stil yerine:

```tsx
        <Suspense fallback={<div className={styles.suspenseFallback}>Yükleniyor...</div>}>
```

MapView dynamic loading placeholder'ı — eski inline stil yerine:

```tsx
const MapView = dynamic<MapViewProps>(
    () => import('@/components/marketplace/MapView').then(m => m.MapView),
    { ssr: false, loading: () => <div className={styles.mapLoading}>🗺 Harita yükleniyor…</div> }
) as ForwardRefExoticComponent<MapViewProps & RefAttributes<MapViewHandle>>;
```

NOT: `styles` modül-kapsamlı olduğu için component dışındaki bu kullanım sorunsuz.

Top bar chip'leri — eski inline stilli buton yerine:

```tsx
                {['Satış', 'Kat Karşılığı / Ortaklık'].map((label, i) => {
                    const type = i === 0 ? 'SALE' : 'KAT_KARSILIGI';
                    const active = filters.type.includes(type);
                    return (
                        <button key={label} onClick={() => {
                            const has = filters.type.includes(type);
                            setFilters(f => ({ ...f, type: has ? f.type.filter(t => t !== type) : [...f.type, type] }));
                        }} className={`${styles.quickChip} ${active ? styles.quickChipActive : ''}`}>{label}</button>
                    );
                })}

                {/* Emsal quick filter */}
                <span className={styles.emsalChip}>
                    Emsal: {filters.minEmsal}–{filters.maxEmsal}
                </span>
```

Spacer div'inden inline stil kalkar: `<div className={styles.desktopOnlySpacer} />`

Sort select: `<select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.sortSelect}>`

Mobile tabs bloğu — eski `styles.mobileTabs` div'i TAMAMEN şu olur:

```tsx
            {/* ── Mobil kontroller: görünüm + filtre ── */}
            <div className={styles.mobileControls}>
                <SegmentedTabs
                    ariaLabel="Görünüm"
                    options={[{ value: 'list', label: 'İlanlar' }, { value: 'map', label: 'Harita' }]}
                    value={mobileTab}
                    onChange={(v) => setMobileTab(v as 'list' | 'map')}
                />
                <button type="button" className={styles.filterBtn} onClick={() => setFilterOpen(true)}>
                    ⚙ Filtreler
                </button>
            </div>
```

List panel — eski inline `style={{ width, borderRight }}` yerine:

```tsx
                    <div className={`${styles.listPanel} ${view === 'list' ? styles.listPanelFull : styles.listPanelSplit}`}>
```

Loading iskeleti:

```tsx
                        {loading ? (
                            <div className={styles.skeletonList}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className={`${styles.skeletonItem} ${view === 'list' ? styles.skeletonItemList : styles.skeletonItemSplit}`} />
                                ))}
                            </div>
```

Boş durum:

```tsx
                        ) : paginated.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>🔍</div>
                                Kriterlere uyan ilan bulunamadı.
                            </div>
```

Sayaç: `<div className={styles.countLabel}>` … ; Pagination:

```tsx
                                {totalPages > 1 && (
                                    <div className={styles.pagination}>
                                        {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => setCurrentPage(p)}
                                                className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ''}`}>{p}</button>
                                        ))}
                                    </div>
                                )}
```

`<style jsx global>` pulse bloğu SİLİNİR (keyframes artık module'de).

Kapanış `</div>` öncesine BottomSheet:

```tsx
            {/* ── Mobil filtre sheet'i ── */}
            <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtreler">
                <FilterSidebar
                    inSheet
                    filters={filters}
                    onChange={setFilters}
                    totalCount={sorted.length}
                    onApply={() => setFilterOpen(false)}
                />
            </BottomSheet>
```

- [ ] **Step 3: e2e fixme'yi kaldır**

`e2e/mobil-smoke.spec.ts` — eski:

```ts
    { path: '/marketplace', fixme: 'Faz 1 - filtre sidebar mobilde tasiyor' },
```

yeni:

```ts
    { path: '/marketplace' },
```

- [ ] **Step 4: Doğrula**

```powershell
npx tsc --noEmit && npx jest --no-coverage
npx playwright test e2e/mobil-smoke.spec.ts -g marketplace
npx playwright test e2e/desktop-baseline.spec.ts -g marketplace
```

Expected: tsc 0, jest 95/95, mobil marketplace PASS (taşma ≤0). Mobil görüntüde: SegmentedTabs + Filtreler butonu üstte, ilan kartları tek kolon. Desktop görüntüsü Task 1 baseline ile birebir. Ek manuel kontrol (Playwright screenshot'la): Filtreler butonuna tıklanınca sheet BottomNavbar'ın ÜSTÜNDE açılır, backdrop tıklaması kapatır.

- [ ] **Step 5: Commit**

```powershell
git add src/app/marketplace e2e/mobil-smoke.spec.ts
git commit -m @'
feat(mobil): marketplace SegmentedTabs + BottomSheet filtreler

3'lu ozel mobil tab kaldirildi; filtreler alttan acilan panele tasindi;
sayfa inline stilleri CSS module'e gecti. e2e fixme kaldirildi.
'@
```

---

### Task 6: `hesapla` — inline stil temizliği (davranış değişmez)

`hesapla/page.tsx`'teki 45 inline stil CSS module'e taşınır. Desktop VE mevcut mobil görünüm birebir aynı kalır (mobil yeniden düzen Task 7'de). Engine'e, state'e, hesaplamaya dokunulmaz.

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/page.module.css` (class'lar eklenir)

**Interfaces:**
- Produces: Task 7'nin kullanacağı class'lar: `.pagerViewport`, `.pagerTrack` (transform `--pager-x` CSS var'dan okur — Task 7 mobilde `transform:none` ile ezer), `.pagerPage`, `.pagerDots`, `.pagerDot`, `.pagerDotActive`, `.pagerLabel`, `.luxGridDynamic` (`--lux-cols`), `.sliderFillDynamic`/`.sliderThumbDynamic` (`--share-pct`), `.scenarioPill` + `.pillBlue/.pillGreen/.pillOrange`

- [ ] **Step 1: page.module.css'e yeni class'ları ekle**

Dosya sonuna, mevcut `@media` bloğundan ÖNCE:

```css
/* =========================================================================
   FAZ 1 TASK 6 — inline stil migrasyonu class'ları
   ========================================================================= */

.settingsGear {
    cursor: pointer;
}

.stepperFixed {
    height: 48px;
}

.stepperFull {
    width: 100%;
}

.stepperUnitCenter {
    min-width: 48px;
    justify-content: center;
}

.stepperUnitWide {
    min-width: 56px;
    justify-content: center;
}

.luxGridDynamic {
    grid-template-columns: repeat(var(--lux-cols, 3), 1fr);
}

.swipeCardPadded {
    padding-bottom: 16px;
}

.toggleRowFlat {
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
}

.sharePct {
    font-weight: 800;
    color: var(--primary);
    font-size: 1.2rem;
}

.drawerRowHead {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.drawerRowLabelNowrap {
    white-space: nowrap;
}

.drawerToggleWrap {
    margin-left: auto;
    display: flex;
}

.drawerRiskGrid {
    grid-template-columns: repeat(4, 1fr);
}

.pillSmall {
    font-size: 12px;
    font-weight: 900;
}

.statCardSubSpaced {
    margin-top: 6px;
}

.chartCenter {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
    margin-top: 0.5rem;
}

.sliderFillDynamic {
    width: var(--share-pct, 0%);
}

.sliderThumbDynamic {
    left: var(--share-pct, 0%);
}

.sliderInput {
    position: absolute;
    width: 100%;
    top: -10px;
    height: 30px;
    opacity: 0;
    cursor: pointer;
    z-index: 10;
}

.btnIcon {
    margin-right: 6px;
    vertical-align: middle;
}

.compareBtn {
    color: var(--green);
    border-color: var(--green);
    background: rgba(var(--green-rgb), 0.08);
}

.scenarioPills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 10px;
}

.scenarioPill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
}

.pillBlue {
    background: rgba(var(--primary-rgb), 0.1);
    border: 1px solid var(--primary);
    color: var(--primary);
}

.pillGreen {
    background: rgba(var(--green-rgb), 0.1);
    border: 1px solid var(--green);
    color: var(--green);
}

.pillOrange {
    background: rgba(var(--orange-rgb), 0.1);
    border: 1px solid var(--orange);
    color: var(--orange);
}

.scenarioPillRemove {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    padding: 0;
    line-height: 1;
    font-size: 1rem;
}

.compareSection {
    margin-top: 24px;
    border-top: 1px solid var(--border);
    padding-top: 16px;
}

.compareTitle {
    margin: 0 0 12px;
    font-size: 1rem;
    font-weight: 800;
    color: var(--card-title);
}

.pagerDots {
    display: flex;
    gap: 6px;
    align-items: center;
}

.pagerDot {
    width: 8px;
    height: 8px;
    border-radius: 10px;
    border: none;
    background: var(--muted);
    opacity: 0.4;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
}

.pagerDotActive {
    width: 20px;
    background: var(--primary);
    opacity: 1;
}

.pagerViewport {
    overflow: hidden;
    position: relative;
}

.pagerTrack {
    display: flex;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(var(--pager-x, 0%));
}

.pagerPage {
    min-width: 100%;
    padding: 0 16px 16px;
}

.chartBlock {
    margin-bottom: 16px;
}

.chartDivider {
    border-top: 1px solid var(--border);
    padding-top: 16px;
}

.pagerLabel {
    padding: 8px 16px 12px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: center;
    gap: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--muted);
}
```

- [ ] **Step 2: page.tsx sabit inline stilleri class'a çevir**

Aşağıdaki birebir değişimler yapılır (satır no'lar mevcut dosyaya göre):

1. `hesapla/page.tsx:334` — `<span style={{ cursor: 'pointer' }} onClick=...>⚙</span>` → `<span className={styles.settingsGear} onClick=...>⚙</span>`
2. `:412,420,603,611` — `<div className={styles.stepperInput} style={{ height: '48px' }}>` → `<div className={`${styles.stepperInput} ${styles.stepperFixed}`}>`
3. `:431` — `<div className={styles.luxGrid} style={{ gridTemplateColumns: `repeat(${riskLevels.length}, 1fr)` }}>` → `<div className={`${styles.luxGrid} ${styles.luxGridDynamic}`} style={{ '--lux-cols': riskLevels.length } as React.CSSProperties}>`
4. `:454` — `<div className={styles.swipeCard} style={{ paddingBottom: '16px' }}>` → `<div className={`${styles.swipeCard} ${styles.swipeCardPadded}`}>`
5. `:500` — `<div className={styles.toggleRow} style={{ margin: 0, ... }}>` → `<div className={`${styles.toggleRow} ${styles.toggleRowFlat}`}>`
6. `:502` — `<span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem' }}>%{landShareRatio}</span>` → `<span className={styles.sharePct}>%{landShareRatio}</span>`
7. `:548-551` ve `:567-570` — drawer başlık satırları:
   `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>` → `<div className={styles.drawerRowHead}>`;
   iç `<div className={styles.drawerRowLabel} style={{ whiteSpace: 'nowrap' }}>` → `<div className={`${styles.drawerRowLabel} ${styles.drawerRowLabelNowrap}`}>`;
   `<div style={{ marginLeft: 'auto', display: 'flex' }}>` → `<div className={styles.drawerToggleWrap}>`
8. `:555,574` — `<div className={styles.stepperInput} style={{ width: '100%' }}>` → `<div className={`${styles.stepperInput} ${styles.stepperFull}`}>`
9. `:606,613` — `<span style={{ minWidth: '48px', justifyContent: 'center' }}>` → `<span className={styles.stepperUnitCenter}>`; `:650` — `<span style={{ minWidth: '56px', justifyContent: 'center' }}>TL</span>` → `<span className={styles.stepperUnitWide}>TL</span>`
10. `:622` — `<div className={styles.luxGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>` → `<div className={`${styles.luxGrid} ${styles.drawerRiskGrid}`}>`
11. `:666` — `<span className={styles.pill} style={{ fontSize: '12px', fontWeight: 900 }}>` → `<span className={`${styles.pill} ${styles.pillSmall}`}>`
12. `:693` — `<div className={styles.statCardSub} style={{ marginTop: '6px' }}>` → `<div className={`${styles.statCardSub} ${styles.statCardSubSpaced}`}>`
13. `:703` — chart sarmalayıcı `<div style={{ display: 'flex', justifyContent: 'center', ... }}>` → `<div className={styles.chartCenter}>`
14. `:717-718` — slider fill/thumb: dış `.sliderTrack`'e `style={{ '--share-pct': `${((landShareRatio - 10) / 90) * 100}%` } as React.CSSProperties}` eklenir; `<div className={styles.sliderFill} style={{ width: ... }}>` → `<div className={`${styles.sliderFill} ${styles.sliderFillDynamic}`}>`; thumb aynı şekilde `${styles.sliderThumb} ${styles.sliderThumbDynamic}`
15. `:726` — range input inline stil → `className={styles.sliderInput}`
16. `:750,754` — svg `style={{ marginRight: '6px', verticalAlign: 'middle' }}` → `className={styles.btnIcon}`
17. `:762` — Karşılaştır `Button`'ındaki `style={{ color..., borderColor..., background... }}` → `className={styles.compareBtn}`. `Button` bileşeni `className`'i zaten pass-through yapıyor (`src/components/ui/Button.tsx:13-16`, `ButtonHTMLAttributes` extend edip `${className}` ekliyor) — Button.tsx'e dokunulmaz.
18. `:768-788` — senaryo pill bloğu:

```tsx
            {savedScenarios.length > 0 && (
              <div className={styles.scenarioPills}>
                {savedScenarios.map((s, i) => {
                  const pillClass = [styles.pillBlue, styles.pillGreen, styles.pillOrange][i % 3];
                  return (
                    <span key={s.id} className={`${styles.scenarioPill} ${pillClass}`}>
                      {s.name}
                      <button
                        onClick={() => handleRemoveScenario(s.id)}
                        aria-label={`${s.name}'i kaldır`}
                        className={styles.scenarioPillRemove}
                        title={`${s.name}'i kaldır`}
                      >×</button>
                    </span>
                  );
                })}
              </div>
            )}
```

`PILL_COLORS` sabiti artık kullanılmıyorsa SİLİNİR.

19. `:791-793` — `<div style={{ marginTop: '24px', ... }}>` → `<div className={styles.compareSection}>`; `<h3 style={...}>` → `<h3 className={styles.compareTitle}>`
20. `:816` — pager dots kabı `<div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>` → `<div className={styles.pagerDots}>`
21. `:817-834` — dot butonları:

```tsx
                {['Dağılım', 'Analiz', 'Finans'].map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setSummaryPage(i)}
                    title={label}
                    className={`${styles.pagerDot} ${summaryPage === i ? styles.pagerDotActive : ''}`}
                  />
                ))}
```

22. `:839-844` — pager:

```tsx
            <div className={styles.pagerViewport}>
              <div
                className={styles.pagerTrack}
                style={{ '--pager-x': `-${summaryPage * 100}%` } as React.CSSProperties}
              >
```

23. `:847,857,898` — `<div style={{ minWidth: '100%', padding: '0 16px 16px' }}>` → `<div className={styles.pagerPage}>`
24. `:858` — `<div style={{ marginBottom: '16px' }}>` → `<div className={styles.chartBlock}>`; `:875` — `<div style={{ borderTop: ..., paddingTop: '16px' }}>` → `<div className={styles.chartDivider}>`
25. `:911-920` — sayfa etiketi `<div style={{...}}>` → `<div className={styles.pagerLabel}>`

- [ ] **Step 3: Doğrula**

```powershell
npx tsc --noEmit && npx eslint src/app/hesapla && npx jest --no-coverage
npx playwright test e2e/desktop-baseline.spec.ts -g hesapla
```

Expected: tsc 0, eslint 0, jest 95/95; desktop görüntüsü Task 1 baseline ile birebir (pager kaydırması, slider, senaryo pill'leri çalışır — Playwright'la elle de bak: dot'a tıkla → sayfa kayar).

- [ ] **Step 4: Commit**

```powershell
git add src/app/hesapla
git commit -m @'
refactor(mobil): hesapla inline stilleri CSS module'e tasindi

45 inline stil class oldu; dinamik degerler (--pager-x, --share-pct,
--lux-cols) CSS custom property ile geciyor. Davranis degismedi.
'@
```

---

### Task 7: `hesapla` — mobil tek kolon akış + accordion + StickyActionBar

Mobildeki yatay swipe carousel (3 tam-ekran kart) kaldırılır; tek kolon dikey akış gelir: sonuç hero kartı üstte → 3 çekirdek girdi → gelişmiş ayarlar accordion'ları → hesap sonuçları → grafikler alt alta. "Özet Rapor Oluştur" CTA'sı `StickyActionBar`'a taşınır. Drawer içeriği yeniden kullanılabilir bileşenlere çıkarılır (desktop drawer + mobil accordion aynı bileşeni kullanır — DRY).

**Files:**
- Create: `src/app/hesapla/AdvancedSettingsSections.tsx`
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/page.module.css` (mobil media query yeniden yazılır)
- Modify: `e2e/mobil-smoke.spec.ts` (hesapla fixme kaldırılır)

**Interfaces:**
- Consumes: `StickyActionBar({ children; aboveBottomNav?: boolean })` — hesapla'da BottomNavbar görünür → `aboveBottomNav` ZORUNLU. Navbar hesapla'da `mobileCompact` (gizli değil) → AppBar KULLANILMAZ.
- Produces: `AdvancedSettingsSections.tsx` üç bileşen export eder (aşağıda tam imzalar). `page.tsx` bunları hem drawer'da hem mobil accordion'larda render eder.

- [ ] **Step 1: AdvancedSettingsSections.tsx oluştur**

Drawer'ın üç kartının içeriği props alan bileşenlere çıkarılır. `src/app/hesapla/AdvancedSettingsSections.tsx` (tam içerik):

```tsx
"use client";

import React from 'react';
import styles from './page.module.css';
import { Toggle } from '@/components/ui/Toggle';

interface ProfitLevel {
  id: string;
  label: string;
  value: number;
  sortOrder: number;
  isDefault: boolean;
}

interface RiskLevel {
  id: string;
  label: string;
  value: number;
  sortOrder: number;
  isDefault: boolean;
}

export interface FormulParamsProps {
  isApartmentCountEnabled: boolean;
  setIsApartmentCountEnabled: (v: boolean) => void;
  totalApartments: number;
  setTotalApartments: React.Dispatch<React.SetStateAction<number>>;
  isAaEnabled: boolean;
  setIsAaEnabled: (v: boolean) => void;
  arsaAlani: number;
  setArsaAlani: React.Dispatch<React.SetStateAction<number>>;
}

/** Drawer "Formül Parametreleri" kartının içeriği (kart sarmalayıcısı hariç). */
export function FormulParamsFields({
  isApartmentCountEnabled, setIsApartmentCountEnabled,
  totalApartments, setTotalApartments,
  isAaEnabled, setIsAaEnabled,
  arsaAlani, setArsaAlani,
}: FormulParamsProps) {
  return (
    <>
      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowHead}>
          <div className={`${styles.drawerRowLabel} ${styles.drawerRowLabelNowrap}`}>Toplam Daire Sayısı</div>
          <div className={styles.drawerToggleWrap}>
            <Toggle checked={isApartmentCountEnabled} onChange={(e) => setIsApartmentCountEnabled(e.target.checked)} />
          </div>
        </div>
        {isApartmentCountEnabled && (
          <div className={`${styles.stepperInput} ${styles.stepperFull}`}>
            <input type="number" value={totalApartments} onChange={(e) => setTotalApartments(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span>daire</span>
              <button onClick={() => setTotalApartments(p => Math.max(1, p - 1))}>−</button>
              <button onClick={() => setTotalApartments(p => p + 1)}>+</button>
            </div>
          </div>
        )}
      </div>

      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowHead}>
          <div className={`${styles.drawerRowLabel} ${styles.drawerRowLabelNowrap}`}>Arsa Alanı (m²)</div>
          <div className={styles.drawerToggleWrap}>
            <Toggle checked={isAaEnabled} onChange={(e) => setIsAaEnabled(e.target.checked)} />
          </div>
        </div>
        {isAaEnabled && (
          <div className={`${styles.stepperInput} ${styles.stepperFull}`}>
            <input type="number" value={arsaAlani} onChange={(e) => setArsaAlani(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span>m²</span>
              <button onClick={() => setArsaAlani(p => Math.max(10, p - 10))}>−</button>
              <button onClick={() => setArsaAlani(p => p + 10)}>+</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export interface RiskCostProps {
  iksaMode: 'off' | 'percentage' | 'manual';
  setIksaMode: (v: 'off' | 'percentage' | 'manual') => void;
  iksaPercentage: number;
  setIksaPercentage: (v: number) => void;
  iksaManualTL: number;
  setIksaManualTL: (v: number) => void;
  riskLevel: number;
  setRiskLevel: (v: number) => void;
  riskLevels: RiskLevel[];
  builderProfit: number;
  setBuilderProfit: (v: number) => void;
  profitLevels: ProfitLevel[];
}

/** Drawer "Proje Maliyet ve Riskleri" kartının içeriği. */
export function RiskCostFields({
  iksaMode, setIksaMode, iksaPercentage, setIksaPercentage,
  iksaManualTL, setIksaManualTL,
  riskLevel, setRiskLevel, riskLevels,
  builderProfit, setBuilderProfit, profitLevels,
}: RiskCostProps) {
  return (
    <>
      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>İksa Masrafı</div>
        <div className={styles.luxGrid}>
          {[
            { label: 'Yok', value: 'off' as const },
            { label: 'Yüzde', value: 'percentage' as const },
            { label: 'Elle', value: 'manual' as const },
          ].map(opt => (
            <div key={opt.label} className={`${styles.luxBox} ${iksaMode === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setIksaMode(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
        {iksaMode === 'percentage' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaPercentage} min={0} max={100} onChange={(e) => setIksaPercentage(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>%</span>
            </div>
          </div>
        )}
        {iksaMode === 'manual' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaManualTL} min={0} onChange={(e) => setIksaManualTL(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>TL</span>
            </div>
          </div>
        )}
      </div>

      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>Risk Payı</div>
        <div className={`${styles.luxGrid} ${styles.drawerRiskGrid}`}>
          {riskLevels.map(opt => (
            <div key={opt.id} className={`${styles.luxBox} ${riskLevel === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setRiskLevel(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>Müteahhit Kazancı</div>
        <div className={styles.luxGrid}>
          {profitLevels.map(opt => (
            <div key={opt.id} className={`${styles.luxBox} ${builderProfit === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setBuilderProfit(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export interface MarketFieldProps {
  manualMarketPrice: string;
  setManualMarketPrice: (v: string) => void;
}

/** Drawer "Piyasa Analizi" kartının içeriği. */
export function MarketField({ manualMarketPrice, setManualMarketPrice }: MarketFieldProps) {
  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div className={styles.drawerRowLabel}>Yaklaşık Piyasa Fiyatı</div>
      <div className={styles.stepperInput}>
        <input type="text" value={manualMarketPrice} onChange={(e) => setManualMarketPrice(e.target.value)} />
        <div className={styles.stepperRight}>
          <span className={styles.stepperUnitWide}>TL</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: page.tsx drawer'ı ve mobil formu yeni bileşenlere bağla**

İmport ekle:

```tsx
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { FormulParamsFields, RiskCostFields, MarketField } from './AdvancedSettingsSections';
```

Drawer'ın üç `drawerCard` gövdesi (Task 6 sonrası hali) çıkarılan bileşenlerle değiştirilir:

```tsx
              <div className={styles.drawerCard}>
                <div className={styles.drawerCardHeader}>Formül Parametreleri</div>
                <FormulParamsFields
                  isApartmentCountEnabled={isApartmentCountEnabled}
                  setIsApartmentCountEnabled={setIsApartmentCountEnabled}
                  totalApartments={totalApartments}
                  setTotalApartments={setTotalApartments}
                  isAaEnabled={isAaEnabled}
                  setIsAaEnabled={setIsAaEnabled}
                  arsaAlani={arsaAlani}
                  setArsaAlani={setArsaAlani}
                />
              </div>

              <div className={styles.drawerCard}>
                <div className={styles.drawerCardHeader}>Proje Maliyet ve Riskleri</div>
                <RiskCostFields
                  iksaMode={iksaMode}
                  setIksaMode={setIksaMode}
                  iksaPercentage={iksaPercentage}
                  setIksaPercentage={setIksaPercentage}
                  iksaManualTL={iksaManualTL}
                  setIksaManualTL={setIksaManualTL}
                  riskLevel={riskLevel}
                  setRiskLevel={setRiskLevel}
                  riskLevels={riskLevels}
                  builderProfit={builderProfit}
                  setBuilderProfit={setBuilderProfit}
                  profitLevels={profitLevels}
                />
              </div>

              <div className={styles.drawerCard}>
                <div className={styles.drawerCardHeader}>Piyasa Analizi</div>
                <MarketField
                  manualMarketPrice={manualMarketPrice}
                  setManualMarketPrice={setManualMarketPrice}
                />
              </div>
```

Mobil sidebar'da `digerAyarlarBtn` ve `primaryActionBtn` butonları SİLİNİR; yerlerine (unifiedGlassPanel'den sonra) accordion'lar gelir:

```tsx
            {/* ── Gelişmiş ayarlar: mobilde accordion (drawer ile aynı bileşenler) ── */}
            <div className={styles.mobileAccordions}>
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>Formül Parametreleri</summary>
                <div className={styles.accordionBody}>
                  <FormulParamsFields
                    isApartmentCountEnabled={isApartmentCountEnabled}
                    setIsApartmentCountEnabled={setIsApartmentCountEnabled}
                    totalApartments={totalApartments}
                    setTotalApartments={setTotalApartments}
                    isAaEnabled={isAaEnabled}
                    setIsAaEnabled={setIsAaEnabled}
                    arsaAlani={arsaAlani}
                    setArsaAlani={setArsaAlani}
                  />
                </div>
              </details>
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>Proje Maliyet ve Riskleri</summary>
                <div className={styles.accordionBody}>
                  <RiskCostFields
                    iksaMode={iksaMode}
                    setIksaMode={setIksaMode}
                    iksaPercentage={iksaPercentage}
                    setIksaPercentage={setIksaPercentage}
                    iksaManualTL={iksaManualTL}
                    setIksaManualTL={setIksaManualTL}
                    riskLevel={riskLevel}
                    setRiskLevel={setRiskLevel}
                    riskLevels={riskLevels}
                    builderProfit={builderProfit}
                    setBuilderProfit={setBuilderProfit}
                    profitLevels={profitLevels}
                  />
                </div>
              </details>
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>Piyasa Analizi</summary>
                <div className={styles.accordionBody}>
                  <MarketField
                    manualMarketPrice={manualMarketPrice}
                    setManualMarketPrice={setManualMarketPrice}
                  />
                </div>
              </details>
            </div>
```

NOT: `setIsApartmentCountEnabled`, `setIksaMode` vb. `useState` setter'ları prop tiplerine (`(v: boolean) => void`) doğrudan uyar. Drawer (desktop ⚙ ile açılan) AYNEN KALIR — yalnızca içi bileşenleşti.

Sayfa sonuna, `<AuthModal ...>` öncesine StickyActionBar:

```tsx
      <StickyActionBar aboveBottomNav>
        <button className={styles.stickyCta} onClick={handleSaveReport} disabled={isSaving}>
          {isSaving ? 'Kaydediliyor...' : '📄 Özet Rapor Oluştur'}
        </button>
      </StickyActionBar>
```

Carousel kalıntıları temizlenir: `handleMobileScroll` fonksiyonu, `const [, setActiveCardIndex] = useState(0);` satırı ve `.layout`'taki `onScroll={handleMobileScroll}` SİLİNİR.

- [ ] **Step 3: page.module.css mobil bloğunu yeniden yaz**

Yeni class'lar (media query DIŞINA):

```css
/* ── Faz 1 Task 7: mobil accordion + sticky CTA ── */
.mobileAccordions {
    display: none;
}

.accordion {
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--panel);
    overflow: hidden;
}

.accordionSummary {
    min-height: var(--touch-target);
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--card-title);
    list-style: none;
    user-select: none;
}

.accordionSummary::-webkit-details-marker {
    display: none;
}

.accordionSummary::after {
    content: '▾';
    margin-left: auto;
    color: var(--muted);
    transition: transform 0.2s;
}

.accordion[open] > .accordionSummary::after {
    transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
    .accordionSummary::after {
        transition: none;
    }
}

.accordionBody {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.stickyCta {
    width: 100%;
    min-height: var(--touch-target);
    padding: 12px;
    border: none;
    border-radius: 12px;
    background: var(--brand-gradient, var(--primary));
    color: white;
    font-family: inherit;
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
}

.stickyCta:disabled {
    opacity: 0.6;
}
```

`@media (max-width: 768px)` bloğunun İÇİ tamamen şu hale gelir (carousel kuralları — `.layout` yatay snap, `.swipeCard` genişlikleri, `.mobilePageControl`, `.pageDot`, `.pageDotActive` — SİLİNİR; `.mobilePageControl`/`.pageDot`/`.pageDotActive` class tanımları media dışından da silinir, sayfada kullanıcısı yok):

```css
@media (max-width: 768px) {
    .container {
        padding: calc(12px + env(safe-area-inset-top, 40px)) 0 calc(var(--bottomnav-height) + 76px) !important;
        border-radius: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
        min-height: 100dvh !important;
    }

    /* Mobilde: desktop sidebar gizli, mobil form + accordion görünür */
    .desktopSidebar {
        display: none !important;
    }

    .mobileSidebar {
        display: flex !important;
        flex-direction: column;
        gap: 12px;
    }

    .mobileAccordions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0 12px;
    }

    /* Tek kolon dikey akış (carousel kaldırıldı) */
    .layout {
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
        width: 100% !important;
    }

    .leftSidebar,
    .rightGrid {
        display: contents;
    }

    .swipeCard,
    .mainPanel,
    .summaryPanel {
        min-width: 0;
        width: auto;
        padding: 0 12px;
        display: flex;
        flex-direction: column;
    }

    .mainPanel {
        box-shadow: none;
    }

    .mobileCardTitle {
        display: block;
        font-weight: 800;
        background: linear-gradient(90deg, var(--primary), var(--red));
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 1.35rem;
        margin-bottom: 12px;
        letter-spacing: -0.5px;
        padding-left: 12px;
    }

    .settingsGroup {
        padding: 0 12px 10px;
        gap: 8px;
    }

    .blueBoxTop h2 {
        font-size: 2rem;
    }

    .blueBox {
        margin: 0 8px;
    }

    .actionBottomRow {
        flex-direction: column;
    }

    .actionBottomRow>* {
        width: 100%;
        justify-content: center;
    }

    .stepperInput {
        height: var(--input-height-mobile);
    }

    .stepperInput input {
        font-size: 16px; /* iOS zoom tetiklenmesin */
    }

    .luxBox {
        padding: 0.5rem 0.2rem;
    }

    .segmentedControl {
        height: 44px;
        border-radius: 12px;
        padding: 3px;
    }

    .segmentItem {
        font-size: 0.8rem;
    }

    /* Grafikler: pager yerine alt alta tam genişlik */
    .pagerTrack {
        flex-direction: column;
        transform: none;
        transition: none;
    }

    .pagerPage {
        min-width: 0;
        padding: 0 4px 16px;
    }

    .pagerDots {
        display: none;
    }

    .pagerLabel {
        display: none;
    }

    .container * {
        overflow-wrap: break-word;
    }
}
```

- [ ] **Step 4: e2e fixme'yi kaldır**

`e2e/mobil-smoke.spec.ts` — eski:

```ts
    { path: '/hesapla', fixme: 'Faz 1 - inline stil grid tasiyor' },
```

yeni:

```ts
    { path: '/hesapla' },
```

- [ ] **Step 5: Doğrula**

```powershell
npx tsc --noEmit && npx eslint src/app/hesapla && npx jest --no-coverage
npx playwright test e2e/mobil-smoke.spec.ts -g hesapla
npx playwright test e2e/desktop-baseline.spec.ts -g hesapla
```

Expected: tsc 0, eslint 0, jest 95/95 (engine testleri dahil — hesaplama değişmedi), mobil hesapla PASS. Mobil görüntüde: hero sonuç kartı üstte → form → 3 accordion → sonuç panelleri → grafikler alt alta; sticky CTA BottomNavbar üstünde. Desktop görüntüsü baseline ile birebir (drawer ⚙ ile hâlâ açılıyor, pager dot'ları çalışıyor).

- [ ] **Step 6: Commit**

```powershell
git add src/app/hesapla e2e/mobil-smoke.spec.ts
git commit -m @'
feat(mobil): hesapla tek kolon akis - accordion + StickyActionBar

Yatay swipe carousel kaldirildi; gelismis ayarlar drawer icerigi
paylasilan bilesenlere cikarilip mobilde accordion oldu; grafikler
alt alta; Ozet Rapor CTA yapisan cubuga tasindi. Engine dokunulmadi.
'@
```

---

### Task 8: `dashboard` — mobil rötuşlar

Dashboard zaten 2×2 stat grid'i ve tek kolon collapse'e sahip. Kalan işler: akışkan sayfa başlığı, BottomNavbar çakışmasını token'la çözmek, hızlı aksiyonların 44px dokunma hedefi + 2×2 grid'i, stat renginin inline'dan CSS'e alınması.

**Files:**
- Modify: `src/app/dashboard/page.tsx:101`
- Modify: `src/app/dashboard/page.module.css`

**Interfaces:**
- Consumes: `--font-size-page-title`, `--touch-target`, `--bottomnav-height` token'ları
- Produces: yok (yaprak görev)

- [ ] **Step 1: Stat değer rengini CSS'e taşı**

`page.tsx:101` — eski:

```tsx
            <div className={styles.statValue} style={{ color: `rgb(${rgb})` }}>{statValues[key] ?? 0}</div>
```

yeni (renk zaten karta `--card-accent-rgb` ile geliyor):

```tsx
            <div className={styles.statValue}>{statValues[key] ?? 0}</div>
```

`page.module.css` `.statValue`'ya renk eklenir:

```css
.statValue {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 0.4rem;
  color: rgb(var(--card-accent-rgb, 59, 130, 246));
}
```

- [ ] **Step 2: Başlık + dokunma hedefleri + alt boşluk**

`page.module.css` değişiklikleri:

`.pageTitle` font-size güncellenir:

```css
.pageTitle {
  font-size: var(--font-size-page-title);
  font-weight: 900;
  color: var(--page-title-color);
  letter-spacing: -1px;
  margin: 0;
}
```

`.qaBtn`'e dokunma hedefi eklenir:

```css
.qaBtn {
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
  min-height: var(--touch-target);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

Mevcut `@media (max-width: 768px)` bloğu şu hale gelir:

```css
@media (max-width: 768px) {
  .container { padding: 1.25rem 1rem calc(1.25rem + var(--bottomnav-height)); gap: 1.25rem; }
  .statsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
  .statsGrid > * { min-width: 0; }
  .twoCol { grid-template-columns: 1fr; }
  .reportRow { flex-direction: column; align-items: flex-start; gap: 6px; }
  .offerRow { flex-direction: column; align-items: flex-start; gap: 6px; }
  .quickActions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .sectionLink { min-height: var(--touch-target); display: inline-flex; align-items: center; }
}
```

- [ ] **Step 3: Doğrula**

```powershell
npx tsc --noEmit && npx jest --no-coverage
```

Expected: tsc 0, jest 95/95. Docker + auth çalışıyorsa Playwright ile 390×844 dashboard görüntüsü alınır (login akışı `e2e/auth-hesapla.spec.ts`'deki desenle); Docker yoksa: bu doğrulama Task 9'a not düşülür (dashboard auth-gated — smoke listesine eklenmez).

- [ ] **Step 4: Commit**

```powershell
git add src/app/dashboard/page.tsx src/app/dashboard/page.module.css
git commit -m @'
fix(mobil): dashboard rotuslari - akiskan baslik, 44px hedefler, navbar bosluk

Stat degeri rengi inline'dan CSS'e alindi (--card-accent-rgb zaten kartta).
'@
```

---

### Task 9: Faz kapanışı — tam doğrulama

Kod değişikliği beklenmez; tam komut paketi + tüm sayfaların mobil/desktop görsel denetimi.

**Files:**
- Modify: yok (yalnızca bulgu çıkarsa düzeltme commit'i)

- [ ] **Step 1: Tam komut paketi**

```powershell
npx tsc --noEmit
npx eslint .
npx jest --no-coverage
npm run build
```

Expected: hepsi temiz — tsc 0, eslint 0, jest 95/95, build başarılı. (Bilinen pre-existing build uyarıları: multi-lockfile, middleware→proxy deprecation — Faz 0 Task 10 notu, dokunulmaz.)

- [ ] **Step 2: Playwright tam koşu**

```powershell
docker compose -f docker-compose.dev.yml up -d
npx playwright test
```

Expected: mobil smoke'ta 6 sayfa PASS, fixme=0 (`/`, `/login`, `/register`, `/listing/e2e-mock`, `/marketplace`, `/hesapla`); desktop baseline 4 PASS; mevcut auth/ilan/mesajlaşma spec'leri yeşil (Docker gerekli — yoksa yalnızca smoke+baseline koş, ortam notu düş).

- [ ] **Step 3: Görsel denetim**

- Mobil (390×844) görüntüler: taşma yok, StickyActionBar/BottomSheet navbar'ın üstünde, dokunma hedefleri ≥44px (hesapla stepper butonları, marketplace chip'leri, listing tab'leri spot-check).
- Desktop (1280×800) görüntüler Task 1 baseline'larıyla karşılaştırılır: fark YOK.

- [ ] **Step 4: İnsan doğrulaması iste (rapor et, bekleme)**

Kullanıcıya raporlanacak manuel kontrol listesi (Faz 0'dan devam eden kalem + Faz 1 eklentileri — gerçek iOS cihaz önerilir):
1. hesapla: klavye açıkken sticky CTA erişilebilir mi, input zoom tetikleniyor mu?
2. marketplace: BottomSheet sürükle-kapat + harita kaydırma çakışması.
3. listing: SwipeGallery parmak kaydırması (foto yüklü ilanda).

- [ ] **Step 5: Faz kaydı**

`.superpowers/sdd/progress.md`'ye Faz 1 satırları işlenir; ardından final whole-plan review dispatch edilir (subagent-driven-development akışı gereği).

---

## Self-Review Notları

- **Spec kapsama:** §4 Faz 1 tablosunun 4 satırı → hesapla (Task 6+7), marketplace (Task 4+5), listing/[id] (Task 2+3), dashboard (Task 8). §5 doğrulama → Task 1 (açılış koşusu) + her task'ın Playwright adımı + Task 9 (kapanış). Faz 0 açık kalemi (ertelenen smoke) → Task 1.
- **Spec'ten sapmalar (bilinçli):** (1) hesapla'da "girdi bölümleri accordion'lu" gereksinimi, 3 çekirdek girdi görünür + gelişmiş ayarlar accordion'da şeklinde uygulanıyor — tüm girdileri accordion'a gömmek çekirdek akışı yavaşlatırdı; drawer deseni desktop'ta korunuyor. (2) Spec hesapla için "StickyActionBar ile yapışkan Hesapla CTA" diyor; hesaplama zaten her girdide anlık çalıştığı için CTA "Özet Rapor Oluştur" olarak bağlandı (sayfadaki tek gerçek eylem). Reviewer bu iki sapmayı spec'e karşı değil bu nota karşı değerlendirmeli.
- **Tip tutarlılığı:** `FilterSidebar` yeni prop'ları Task 4'te tanımlanıp Task 5'te aynı imzayla tüketiliyor; `AdvancedSettingsSections` prop tipleri `useState` setter'larıyla uyumlu (`React.Dispatch<SetStateAction<number>>` stepper'larda fonksiyonel update için şart). `mobileTab` daralması (`'filter'` çıkarılması) CSS'teki `[data-mobile-tab="filter"]` kuralının silinmesiyle eşleşiyor.
- **Bilinen riskler:** hesapla Task 7 en riskli (spec §7) — engine'e dokunulmuyor, mevcut jest engine testleri güvence. `.mobilePageControl`/`.pageDot` CSS'i sayfada kullanıcısı olmayan ölü kod — Task 7'de siliniyor; implementer silmeden önce `grep -r "mobilePageControl\|pageDot" src/` ile doğrulamalı.
