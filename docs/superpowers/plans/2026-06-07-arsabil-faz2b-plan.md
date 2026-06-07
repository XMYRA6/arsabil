# ArsaBil Faz 2B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Marketplace real data + tab layout (Liste | Harita) + filter bar + Favorites system (API + UI) + Listing detail real offers + owner profile link.

**Architecture:** DB migration first → Favorites API → Listings API filter update → Marketplace page rewrite (tab layout + real data) → ListingCard favorite toggle → Listing detail improvements → Profile Favorilerim tab. The marketplace page already has `FilterSidebar`, `ListingCard`, `MapView`, `ViewToggle` components — this plan replaces the mock data with real API data and simplifies the view to a 2-tab layout (Liste | Harita).

**Prerequisites:** Faz 2A Task 1 must be complete (Listing.status field exists). If not run yet, the `faz2b-marketplace-favorites` migration will add Favorite model; Listing.status must already exist from the 2A migration.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma + PostgreSQL, react-leaflet (already installed), CSS Modules (no Tailwind), NextAuth (`getServerSession(authOptions)` from `@/lib/auth`), Jest/ts-jest.

---

## File Map

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify — add Favorite model + User/Listing relations |
| `src/app/api/favorites/route.ts` | Create — GET + POST |
| `src/app/api/favorites/[listingId]/route.ts` | Create — DELETE |
| `src/app/api/listings/route.ts` | Modify — GET: status=APPROVED filter + query params |
| `src/app/api/listings/[id]/route.ts` | Create — GET single listing |
| `src/app/marketplace/page.tsx` | Modify — tab layout, real data, filter bar |
| `src/app/marketplace/page.module.css` | Modify — tab and filter bar styles |
| `src/components/marketplace/ListingCard.tsx` | Modify — add favorite toggle prop |
| `src/app/listing/[id]/page.tsx` | Modify — real offer API + share button + owner link |
| `src/app/dashboard/profile/page.tsx` | Modify — Favorilerim tab |

---

## Task 1: DB Schema Migration (Favorite Model)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Favorite model and relations to schema**

Open `prisma/schema.prisma`.

Add a new `Favorite` model (can go after the `Listing` model):

```prisma
model Favorite {
  id        String   @id @default(cuid())
  userId    String
  listingId String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  listing   Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@unique([userId, listingId])
}
```

In the `User` model, add after the existing relations (e.g., after `offers Offer[]`):
```prisma
  favorites   Favorite[]
```

In the `Listing` model, add after the existing relations (e.g., after `offers Offer[]`):
```prisma
  favorites   Favorite[]
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name faz2b-marketplace-favorites
```

Expected: Migration created and applied. Prisma client regenerated with Favorite model.

If Docker is not running: `docker compose up -d` first.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Favorite model with User/Listing relations"
```

---

## Task 2: Favorites API

**Files:**
- Create: `src/app/api/favorites/route.ts`
- Create: `src/app/api/favorites/[listingId]/route.ts`

- [ ] **Step 1: Create favorites route (GET + POST)**

Create `src/app/api/favorites/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 401 })
        }

        const favorites = await prisma.favorite.findMany({
            where: { userId: session.user.id as string },
            include: {
                listing: {
                    include: {
                        report: true,
                        user: { select: { id: true, name: true } },
                        _count: { select: { offers: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(favorites)
    } catch (error) {
        console.error('Favorites GET error:', error)
        return NextResponse.json({ message: 'Sunucu hatası.' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 401 })
        }

        const { listingId } = await req.json()
        if (!listingId) {
            return NextResponse.json({ message: 'listingId gerekli.' }, { status: 400 })
        }

        const listing = await prisma.listing.findUnique({ where: { id: listingId } })
        if (!listing) {
            return NextResponse.json({ message: 'İlan bulunamadı.' }, { status: 404 })
        }

        const favorite = await prisma.favorite.upsert({
            where: { userId_listingId: { userId: session.user.id as string, listingId } },
            create: { userId: session.user.id as string, listingId },
            update: {},
        })

        return NextResponse.json(favorite, { status: 201 })
    } catch (error) {
        console.error('Favorites POST error:', error)
        return NextResponse.json({ message: 'Sunucu hatası.' }, { status: 500 })
    }
}
```

- [ ] **Step 2: Create favorites/[listingId] route (DELETE)**

Create directory `src/app/api/favorites/[listingId]/` and file `route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ listingId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 401 })
        }

        const { listingId } = await params

        await prisma.favorite.deleteMany({
            where: {
                userId: session.user.id as string,
                listingId,
            },
        })

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Favorites DELETE error:', error)
        return NextResponse.json({ message: 'Sunucu hatası.' }, { status: 500 })
    }
}
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/favorites/
git commit -m "feat: favorites API - GET, POST, DELETE endpoints"
```

---

## Task 3: Listings API Filter Update + Single Listing GET

**Files:**
- Modify: `src/app/api/listings/route.ts` — GET: only APPROVED + query params
- Create: `src/app/api/listings/[id]/route.ts` — GET single listing

- [ ] **Step 1: Update listings GET to filter APPROVED and accept query params**

Replace the `GET` function in `src/app/api/listings/route.ts`:

```typescript
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const city = searchParams.get('city')
        const district = searchParams.get('district')
        const minPrice = searchParams.get('minPrice')
        const maxPrice = searchParams.get('maxPrice')

        const where: Record<string, unknown> = {
            status: 'APPROVED',
            isActive: true,
        }

        if (city) where.city = city
        if (district) where.district = district
        if (minPrice || maxPrice) {
            where.price = {
                ...(minPrice ? { gte: Number(minPrice) } : {}),
                ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            }
        }

        const listings = await prisma.listing.findMany({
            where,
            include: {
                report: true,
                user: { select: { id: true, name: true, email: true } },
                offers: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(listings)
    } catch (error) {
        console.error('Listings fetch error:', error)
        return NextResponse.json({ message: 'İlanlar getirilemedi.' }, { status: 500 })
    }
}
```

- [ ] **Step 2: Create single listing GET route**

Create `src/app/api/listings/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                report: true,
                user: { select: { id: true, name: true, email: true, isVerified: true } },
                _count: { select: { offers: true } },
            },
        })

        if (!listing) {
            return NextResponse.json({ message: 'İlan bulunamadı.' }, { status: 404 })
        }

        return NextResponse.json(listing)
    } catch (error) {
        console.error('Listing GET error:', error)
        return NextResponse.json({ message: 'Sunucu hatası.' }, { status: 500 })
    }
}
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/listings/route.ts src/app/api/listings/[id]/
git commit -m "feat: listings API - APPROVED filter, query params, single listing GET"
```

---

## Task 4: Marketplace Page — Tab Layout + Real Data

**Files:**
- Modify: `src/app/marketplace/page.tsx`
- Modify: `src/app/marketplace/page.module.css`

The existing marketplace page has a complex 3-way split/list/map view. This task replaces `MarketplaceContent` with a simpler tab layout (Liste | Harita) and connects to real API data. The existing `ListingCard`, `MapView` components are preserved as-is.

- [ ] **Step 1: Read current page.module.css to understand existing classes**

```bash
# Just check what CSS classes exist
npx ts-node -e "require('fs').readFileSync('src/app/marketplace/page.module.css','utf8').split('\n').slice(0,30).forEach(l=>console.log(l))"
```

Or simply open `src/app/marketplace/page.module.css` and check what classes currently exist. You will keep any classes already used by components not being changed.

- [ ] **Step 2: Add new CSS classes for tab layout**

In `src/app/marketplace/page.module.css`, add these new classes (do not remove existing ones used by `FilterSidebar` or other components):

```css
.tabBar {
    display: flex;
    gap: 0;
    border-bottom: 2px solid var(--border);
    margin-bottom: 20px;
}

.tab {
    padding: 10px 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.15s;
}

.tabActive {
    color: var(--primary);
    font-weight: 800;
    border-bottom-color: var(--primary);
}

.filterBar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: flex-end;
    padding: 16px;
    background: var(--panel);
    border: 1.5px solid var(--border);
    border-radius: 12px;
    margin-bottom: 20px;
}

.filterField {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.filterLabel {
    font-size: 0.68rem;
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
}

.filterInput {
    padding: 7px 10px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: inherit;
    font-size: 0.82rem;
    outline: none;
    width: 120px;
}

.filterInput:focus {
    border-color: var(--primary);
}

.filterBtn {
    padding: 8px 18px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.82rem;
    align-self: flex-end;
}

.listingGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
}

.mapContainer {
    width: 100%;
    height: calc(100vh - 280px);
    min-height: 500px;
    border-radius: 12px;
    overflow: hidden;
    border: 1.5px solid var(--border);
}

.emptyState {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--muted);
}

.emptyIcon {
    font-size: 3rem;
    margin-bottom: 12px;
}
```

- [ ] **Step 3: Rewrite MarketplaceContent in page.tsx**

Replace the entire content of `src/app/marketplace/page.tsx` with:

```typescript
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { ListingCard } from '@/components/marketplace/ListingCard';
import styles from './page.module.css';

const MapView = dynamic(
    () => import('@/components/marketplace/MapView').then(m => m.MapView),
    {
        ssr: false,
        loading: () => (
            <div style={{ flex: 1, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', height: 500 }}>
                🗺 Harita yükleniyor…
            </div>
        ),
    }
) as any;

type Tab = 'liste' | 'harita';

interface Filters {
    city: string;
    district: string;
    minPrice: string;
    maxPrice: string;
}

const EMPTY_FILTERS: Filters = { city: '', district: '', minPrice: '', maxPrice: '' };

export default function MarketplacePage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>}>
            <MarketplaceContent />
        </Suspense>
    );
}

function MarketplaceContent() {
    const { data: session } = useSession();
    const [tab, setTab] = useState<Tab>('liste');
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
    const [listings, setListings] = useState<any[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchListings(appliedFilters);
    }, [appliedFilters]);

    useEffect(() => {
        if (session?.user) fetchFavorites();
    }, [session]);

    const fetchListings = async (f: Filters) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (f.city) params.set('city', f.city);
            if (f.district) params.set('district', f.district);
            if (f.minPrice) params.set('minPrice', f.minPrice);
            if (f.maxPrice) params.set('maxPrice', f.maxPrice);
            const res = await fetch(`/api/listings?${params.toString()}`);
            const data = await res.json();
            setListings(Array.isArray(data) ? data : []);
        } catch {
            setListings([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFavorites = async () => {
        try {
            const res = await fetch('/api/favorites');
            const data = await res.json();
            if (Array.isArray(data)) {
                setFavoriteIds(new Set(data.map((f: any) => f.listingId)));
            }
        } catch { /* ignore */ }
    };

    const toggleFavorite = async (listingId: string) => {
        if (!session?.user) return;
        const isFav = favoriteIds.has(listingId);
        setFavoriteIds(prev => {
            const next = new Set(prev);
            isFav ? next.delete(listingId) : next.add(listingId);
            return next;
        });
        try {
            if (isFav) {
                await fetch(`/api/favorites/${listingId}`, { method: 'DELETE' });
            } else {
                await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ listingId }),
                });
            }
        } catch {
            // Revert on error
            setFavoriteIds(prev => {
                const next = new Set(prev);
                isFav ? next.add(listingId) : next.delete(listingId);
                return next;
            });
        }
    };

    const handleFilter = () => setAppliedFilters({ ...filters });
    const handleReset = () => {
        setFilters(EMPTY_FILTERS);
        setAppliedFilters(EMPTY_FILTERS);
    };

    // Enrich listings with map-compatible lat/lng (from report or fallback)
    const mapListings = listings.map(l => ({
        ...l,
        lat: l.lat ?? 41.015,
        lng: l.lng ?? 28.979,
        title: l.title ?? l.report?.title ?? 'İlan',
        price: l.price ?? l.report?.minApartmentPrice ?? 0,
    }));

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--card-title)', marginBottom: 4 }}>
                    Pazar Yeri
                </h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Onaylı arsa ve kat karşılığı ilanları keşfedin
                </p>
            </div>

            {/* Filter Bar */}
            <div className={styles.filterBar}>
                <div className={styles.filterField}>
                    <span className={styles.filterLabel}>İl</span>
                    <input
                        className={styles.filterInput}
                        placeholder="İstanbul"
                        value={filters.city}
                        onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                    />
                </div>
                <div className={styles.filterField}>
                    <span className={styles.filterLabel}>İlçe</span>
                    <input
                        className={styles.filterInput}
                        placeholder="Kadıköy"
                        value={filters.district}
                        onChange={e => setFilters(f => ({ ...f, district: e.target.value }))}
                    />
                </div>
                <div className={styles.filterField}>
                    <span className={styles.filterLabel}>Min Fiyat (TL)</span>
                    <input
                        className={styles.filterInput}
                        type="number"
                        placeholder="500000"
                        value={filters.minPrice}
                        onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                    />
                </div>
                <div className={styles.filterField}>
                    <span className={styles.filterLabel}>Max Fiyat (TL)</span>
                    <input
                        className={styles.filterInput}
                        type="number"
                        placeholder="5000000"
                        value={filters.maxPrice}
                        onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                    />
                </div>
                <button className={styles.filterBtn} onClick={handleFilter}>
                    Filtrele
                </button>
                {(appliedFilters.city || appliedFilters.district || appliedFilters.minPrice || appliedFilters.maxPrice) && (
                    <button
                        onClick={handleReset}
                        style={{ padding: '8px 14px', background: 'transparent', color: 'var(--muted)', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}
                    >
                        Temizle
                    </button>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--muted)', alignSelf: 'flex-end', paddingBottom: 2 }}>
                    {loading ? 'Yükleniyor…' : `${listings.length} ilan`}
                </span>
            </div>

            {/* Tab Bar */}
            <div className={styles.tabBar}>
                <button
                    className={tab === 'liste' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                    onClick={() => setTab('liste')}
                >
                    📋 Liste
                </button>
                <button
                    className={tab === 'harita' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                    onClick={() => setTab('harita')}
                >
                    🗺️ Harita
                </button>
            </div>

            {/* Tab Content */}
            {tab === 'liste' && (
                loading ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>⏳</div>
                        Yükleniyor…
                    </div>
                ) : listings.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🏗️</div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>İlan bulunamadı</div>
                        <div style={{ fontSize: '0.85rem' }}>Filtreleri değiştirmeyi deneyin</div>
                    </div>
                ) : (
                    <div className={styles.listingGrid}>
                        {listings.map(listing => (
                            <ListingCard
                                key={listing.id}
                                listing={listing}
                                isFavorite={favoriteIds.has(listing.id)}
                                onFavoriteToggle={toggleFavorite}
                            />
                        ))}
                    </div>
                )
            )}

            {tab === 'harita' && (
                <div className={styles.mapContainer}>
                    <MapView
                        listings={mapListings}
                        onListingClick={(id: string) => { window.location.href = `/listing/${id}` }}
                    />
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

Expected: May show errors about `ListingCard` not accepting `isFavorite`/`onFavoriteToggle` props or `MapView` not accepting `listings`/`onListingClick`. This is expected — Task 5 fixes ListingCard. For MapView props mismatch, check the existing `MapView` component signature in `src/components/marketplace/MapView.tsx` and adjust the props accordingly.

- [ ] **Step 5: Commit (even if there are type errors — fix in Task 5)**

```bash
git add src/app/marketplace/page.tsx src/app/marketplace/page.module.css
git commit -m "feat: marketplace tab layout (Liste/Harita) with real API data and filter bar"
```

---

## Task 5: ListingCard Favorites Toggle

**Files:**
- Modify: `src/components/marketplace/ListingCard.tsx`

- [ ] **Step 1: Read existing ListingCard component**

Read `src/components/marketplace/ListingCard.tsx` fully to understand its current props interface and JSX structure.

- [ ] **Step 2: Add isFavorite and onFavoriteToggle props**

Find the props interface (or `type ListingCardProps`). Add to it:

```typescript
  isFavorite?: boolean
  onFavoriteToggle?: (listingId: string) => void
```

- [ ] **Step 3: Add favorite button to card JSX**

Find a suitable position in the card's JSX (typically near the top-right or bottom of the card). Add a favorite button that calls `onFavoriteToggle` when clicked:

```tsx
            {onFavoriteToggle && (
                <button
                    onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        onFavoriteToggle(listing.id)
                    }}
                    title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        padding: '4px',
                        lineHeight: 1,
                        transition: 'transform 0.15s',
                    }}
                >
                    {isFavorite ? '❤️' : '🤍'}
                </button>
            )}
```

Place this in a position that makes sense visually — e.g., top-right corner with `position: absolute` inside a `position: relative` container, or at the bottom of the card next to the "Detay →" link.

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors (the marketplace page errors from Task 4 should now resolve).

- [ ] **Step 5: Commit**

```bash
git add src/components/marketplace/ListingCard.tsx
git commit -m "feat: ListingCard - isFavorite and onFavoriteToggle props"
```

---

## Task 6: Listing Detail — Real Offers + Share + Owner Link

**Files:**
- Modify: `src/app/listing/[id]/page.tsx`

The listing detail page currently:
- Fetches from `/api/listings/${id}` (now implemented in Task 3) but falls back to `MOCK_LISTING`
- Has a fake `handleOffer` that `setTimeout`s without calling the API
- Has no share button or owner profile link
- The `teklifler` tab form already has a good UI

- [ ] **Step 1: Fix handleOffer to call real API**

In `src/app/listing/[id]/page.tsx`, replace the existing `handleOffer` function:

```typescript
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
```

Note: The existing `/api/offers` POST expects specific field names. Read `src/app/api/offers/route.ts` to confirm the exact field names expected (`listingId`, `sharePercent` or similar) and adjust if needed.

- [ ] **Step 2: Add share button and owner link**

In the right-side sticky sidebar (the `<div>` with `position: 'sticky', top: 80`), add after the action buttons section and before the bottom footer text:

```tsx
                    {/* Share + Owner */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href)
                                    .then(() => toast.success('Link kopyalandı!'))
                                    .catch(() => toast.error('Kopyalanamadı.'));
                            }}
                            style={{
                                padding: '9px', background: 'var(--bg)', color: 'var(--muted)',
                                border: '1.5px solid var(--border)', borderRadius: 10,
                                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem',
                            }}
                        >🔗 Paylaş</button>

                        {listing.user?.id && (
                            <a
                                href={`/profile/${listing.user.id}`}
                                style={{
                                    display: 'block', padding: '9px', textAlign: 'center',
                                    background: 'var(--bg)', color: 'var(--muted)',
                                    border: '1.5px solid var(--border)', borderRadius: 10,
                                    textDecoration: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem',
                                }}
                            >
                                👤 İlan Sahibinin Profili
                            </a>
                        )}
                    </div>
```

- [ ] **Step 3: Extend listing state to include user**

In the `MOCK_LISTING` constant, add `user` field:
```typescript
    user: null as null | { id: string; name: string | null; isVerified: boolean },
```

In the fetch effect, when setting `listing`, the real API response from `/api/listings/${id}` now includes `user`. The merge `{ ...MOCK_LISTING, ...data, id }` will include `user` from real data automatically.

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/listing/[id]/page.tsx
git commit -m "feat: listing detail - real offer API, share button, owner profile link"
```

---

## Task 7: Profile — Favorilerim Tab

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`

The profile page already has `portfolio | listings | settings` tabs (from Faz 1B). This task adds a `favorites` tab.

- [ ] **Step 1: Update Tab type**

In `src/app/dashboard/profile/page.tsx`, find:
```typescript
type Tab = 'portfolio' | 'listings' | 'settings'
```

Change to:
```typescript
type Tab = 'portfolio' | 'listings' | 'favorites' | 'settings'
```

If Task 10 from Faz 2A was already done, this type already includes `'favorites'`. Skip if already present.

- [ ] **Step 2: Add favorites state**

After existing state declarations, add:

```typescript
    const [favorites, setFavorites] = useState<any[]>([])
    const [loadingFavs, setLoadingFavs] = useState(false)
```

- [ ] **Step 3: Fetch favorites when tab is selected**

Add a useEffect that fetches favorites when the tab changes:

```typescript
    useEffect(() => {
        if (tab !== 'favorites' || !session?.user) return
        setLoadingFavs(true)
        fetch('/api/favorites')
            .then(r => r.json())
            .then(data => setFavorites(Array.isArray(data) ? data : []))
            .catch(() => setFavorites([]))
            .finally(() => setLoadingFavs(false))
    }, [tab, session?.user])
```

- [ ] **Step 4: Add Favorilerim tab button**

Find the tab bar buttons in the JSX. There should be buttons for `portfolio`, `listings`, `settings`. Add between `listings` and `settings`:

```tsx
                <button
                    onClick={() => setTab('favorites')}
                    style={{
                        /* use the same style as existing tab buttons, just change content */
                        /* Copy the exact style from the 'listings' tab button */
                        /* Only the color/fontWeight changes based on active state */
                    }}
                >
                    ❤️ Favorilerim
                </button>
```

Match the exact inline style pattern used by existing tab buttons in the file.

- [ ] **Step 5: Add Favorilerim tab content**

Find where tab content is rendered (the `{tab === 'portfolio' && (...)}` section). Add:

```tsx
                        {tab === 'favorites' && (
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 16 }}>
                                    Favorilerim
                                </h3>
                                {loadingFavs ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Yükleniyor…</div>
                                ) : favorites.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>❤️</div>
                                        Henüz favori ilan eklemediniz
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {favorites.map((fav: any) => (
                                            <a
                                                key={fav.id}
                                                href={`/listing/${fav.listingId}`}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    padding: '12px 14px',
                                                    background: 'var(--bg)', borderRadius: 10,
                                                    border: '1.5px solid var(--border)',
                                                    textDecoration: 'none', color: 'inherit',
                                                }}
                                            >
                                                <span style={{ fontSize: '1.2rem' }}>🏗️</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--card-title)' }}>
                                                        {fav.listing?.title ?? fav.listing?.report?.title ?? 'İlan'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                        {fav.listing?.district && `${fav.listing.district}, `}{fav.listing?.city ?? '—'}
                                                        {fav.listing?.price ? ` · ${fav.listing.price.toLocaleString('tr-TR')} TL` : ''}
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>→</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
```

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All existing tests pass (no regressions).

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/profile/page.tsx
git commit -m "feat: profile - Favorilerim tab with favorites list"
```

---

## Faz 2B Complete ✅

All 7 tasks complete. Run final verification:

```bash
npx jest --no-coverage
npx tsc --noEmit
```

Both should pass cleanly.

**Manual smoke test checklist:**
- [ ] Visit `/marketplace` — filter bar visible, tabs work, real listings load (need at least 1 APPROVED listing; approve one via admin panel first)
- [ ] Click ❤️ on a listing card — favorite saved, ❤️ stays filled on reload
- [ ] Visit `/dashboard/profile` → Favorilerim tab — saved listing appears
- [ ] Visit `/listing/[id]` — "Paylaş" button copies URL, "İlan Sahibinin Profili" link visible
- [ ] Submit an offer from the teklifler tab — toast success, not a fake delay
