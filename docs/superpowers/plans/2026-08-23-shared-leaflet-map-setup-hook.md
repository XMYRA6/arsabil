# Paylaşılan Leaflet Harita Kurulum Hook'u Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the async-Leaflet-setup/`mapReady`/`ResizeObserver`/
cleanup boilerplate — independently rewritten (and bug-fixed) 4 separate
times across `ParcelPicker.tsx`, `MapView.tsx`, `MiniMap.tsx` — into one
`useLeafletMap` hook, with **zero behavior change** to any of the three
consumers.

**Architecture:** One new hook (`src/lib/hooks/useLeafletMap.ts`) owns
only: dynamic `leaflet` import, `_leaflet_id` StrictMode-remount guard,
`L.map()` construction, an `onReady(map, L)` callback (may be async,
always awaited) for one-time per-map setup, `mapReady` flag,
optional `ResizeObserver`, and disposal. Everything component-specific
(markers, click handlers, tile switching, WMS risk layers, measure/draw
tools, marker clustering) stays exactly where it is, in each component's
own effects — those effects just consume `mapRef`/`LRef`/`mapReady` from
the hook instead of local state.

**Tech Stack:** Next.js 16, React, TypeScript, Leaflet, Jest + React
Testing Library (`renderHook`).

**Spec:** `docs/superpowers/specs/2026-08-23-shared-leaflet-map-setup-hook-design.md`

## Global Constraints

- `ParcelPicker.map.test.tsx`, `ParcelPicker.test.tsx`,
  `MapView.markers.test.tsx`, `MiniMap.test.tsx` are **NEVER modified** —
  each must pass unchanged after its component's migration. A changed
  assertion in any of these four files is a plan violation, not a
  legitimate fix.
- No marker, click-handler, tile-layer, WMS-layer, heatmap, measure/draw,
  or clustering logic changes in any of the three components — only
  *where* the map-instance-creation code lives changes.
- The hook always `await`s `onReady`'s return value, even when it's
  synchronous (`await` on a non-Promise resolves immediately) — this is
  required for `MapView`'s async `leaflet.markercluster` import to
  finish before `mapReady` flips true.
- `deps` defaults to `[]` (build once, never rebuild — `ParcelPicker`'s
  and `MapView`'s existing behavior). `MiniMap` passes `deps: [lat, lng]`
  to deliberately keep its existing "rebuild the whole map when
  coordinates change" behavior — this is not something to "fix", it's
  tested (`MiniMap.test.tsx:73`).

---

### Task 1: Create the `useLeafletMap` hook

**Files:**
- Create: `src/lib/hooks/useLeafletMap.ts`
- Create: `src/lib/hooks/useLeafletMap.test.ts`

**Interfaces:**
- Consumes: nothing (new, standalone module).
- Produces: `useLeafletMap(containerRef, options): { mapRef, LRef, mapReady }`.
  `UseLeafletMapOptions = { center: [number, number]; zoom: number;
  leafletMapOptions?: Record<string, unknown>; onReady?: (map, L) => void
  | (() => void) | Promise<void | (() => void)>; observeResize?: boolean
  (default true); deps?: unknown[] (default []) }`. Tasks 2-4 depend on
  this exact shape.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/hooks/useLeafletMap.test.ts`:

```ts
/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useLeafletMap } from './useLeafletMap'

const harita = {
    invalidateSize: jest.fn(),
    remove: jest.fn(),
}
jest.mock('leaflet', () => ({
    map: jest.fn(() => harita),
}))

let olusanGozlemciler: Array<{ disconnect: jest.Mock; observe: jest.Mock }> = []

beforeEach(() => {
    jest.clearAllMocks()
    olusanGozlemciler = []
    class SahteResizeObserver {
        disconnect = jest.fn()
        observe = jest.fn()
        constructor(_cb: () => void) {
            olusanGozlemciler.push(this)
        }
    }
    ; (global as unknown as { ResizeObserver: unknown }).ResizeObserver = SahteResizeObserver
})

function tikBekle() {
    return act(async () => { await Promise.resolve(); await Promise.resolve() })
}

describe('useLeafletMap', () => {
    it('haritayi kurar, onReady cagirir, mapReady onReady bittikten sonra true olur', async () => {
        const onReady = jest.fn()
        const containerRef = { current: document.createElement('div') }

        const { result } = renderHook(() => useLeafletMap(containerRef, {
            center: [41, 29], zoom: 12, onReady,
        }))

        expect(result.current.mapReady).toBe(false)
        await tikBekle()

        expect(onReady).toHaveBeenCalledWith(harita, expect.anything())
        expect(result.current.mapReady).toBe(true)
        expect(result.current.mapRef.current).toBe(harita)
    })

    it('_leaflet_id onceden atanmissa sifirlanir (StrictMode remount korumasi)', async () => {
        const el = document.createElement('div')
        ; (el as unknown as { _leaflet_id: number })._leaflet_id = 42
        const containerRef = { current: el }

        renderHook(() => useLeafletMap(containerRef, { center: [0, 0], zoom: 1 }))
        await tikBekle()

        expect((el as unknown as { _leaflet_id?: number })._leaflet_id).toBeUndefined()
    })

    it('center/zoom/leafletMapOptions L.map cagrisina birlesik gecilir', async () => {
        const containerRef = { current: document.createElement('div') }
        renderHook(() => useLeafletMap(containerRef, {
            center: [41, 29], zoom: 12, leafletMapOptions: { zoomControl: false },
        }))
        await tikBekle()

        const mapMock = (jest.requireMock('leaflet') as { map: jest.Mock }).map
        expect(mapMock).toHaveBeenCalledWith(containerRef.current, {
            center: [41, 29], zoom: 12, zoomControl: false,
        })
    })

    it('onReady ASYNC ise mapReady onReady tamamen bitene kadar true olmaz', async () => {
        let cozBekleyen: (() => void) | null = null
        const onReady = jest.fn(() => new Promise<void>((resolve) => { cozBekleyen = resolve }))
        const containerRef = { current: document.createElement('div') }

        const { result } = renderHook(() => useLeafletMap(containerRef, {
            center: [0, 0], zoom: 1, onReady,
        }))

        await tikBekle()
        expect(result.current.mapReady).toBe(false)

        await act(async () => { cozBekleyen!() })
        await tikBekle()
        expect(result.current.mapReady).toBe(true)
    })

    it('observeResize false ise ResizeObserver kurulmaz', async () => {
        const containerRef = { current: document.createElement('div') }
        renderHook(() => useLeafletMap(containerRef, { center: [0, 0], zoom: 1, observeResize: false }))
        await tikBekle()

        expect(olusanGozlemciler).toHaveLength(0)
    })

    it('varsayilan deps [] ile prop degisikliginde yeniden kurulum tetiklenmez', async () => {
        const onReady = jest.fn()
        const containerRef = { current: document.createElement('div') }
        const { rerender } = renderHook(
            (props: { zoom: number }) => useLeafletMap(containerRef, { center: [0, 0], zoom: props.zoom, onReady }),
            { initialProps: { zoom: 1 } },
        )
        await tikBekle()
        expect(onReady).toHaveBeenCalledTimes(1)

        rerender({ zoom: 2 })
        await tikBekle()
        expect(onReady).toHaveBeenCalledTimes(1)
    })

    it('deps degisince harita yikilip yeniden kurulur (MiniMap davranisi)', async () => {
        const onReady = jest.fn()
        const containerRef = { current: document.createElement('div') }
        const { rerender } = renderHook(
            (props: { lat: number }) => useLeafletMap(containerRef, {
                center: [props.lat, 0], zoom: 1, onReady, deps: [props.lat],
            }),
            { initialProps: { lat: 41 } },
        )
        await tikBekle()
        expect(onReady).toHaveBeenCalledTimes(1)

        rerender({ lat: 42 })
        await tikBekle()

        expect(harita.remove).toHaveBeenCalledTimes(1)
        expect(onReady).toHaveBeenCalledTimes(2)
    })

    it('unmount onReady temizligini VE harita remove()ini cagirir', async () => {
        const onReadyCleanup = jest.fn()
        const onReady = jest.fn(() => onReadyCleanup)
        const containerRef = { current: document.createElement('div') }

        const { unmount } = renderHook(() => useLeafletMap(containerRef, { center: [0, 0], zoom: 1, onReady }))
        await tikBekle()
        expect(olusanGozlemciler).toHaveLength(1)

        unmount()

        expect(onReadyCleanup).toHaveBeenCalledTimes(1)
        expect(harita.remove).toHaveBeenCalledTimes(1)
        expect(olusanGozlemciler[0].disconnect).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx jest src/lib/hooks/useLeafletMap.test.ts`
Expected: FAIL with "Cannot find module './useLeafletMap'".

- [ ] **Step 3: Create the hook**

Create `src/lib/hooks/useLeafletMap.ts`:

```ts
'use client';

import { useEffect, useRef, useState, type RefObject, type MutableRefObject } from 'react';
import type { Map as LeafletMap } from 'leaflet';

export type UseLeafletMapOptions = {
    /** Harita ilk açılışta nereye baksın. Yalnızca kurulum anında BİR KEZ
        okunur — reaktif senkronizasyon isteniyorsa `deps`e eklenmelidir. */
    center: [number, number];
    zoom: number;
    /** `L.map(container, {...})`e AYNEN geçilir. */
    leafletMapOptions?: Record<string, unknown>;
    /** Harita + Leaflet modülü hazır olur olmaz (setMapReady(true)'dan
        HEMEN ÖNCE) bir kez çağrılır — taban tile katmanı, kontroller,
        `moveend` dinleyicisi gibi "L ve map'in birlikte gerektiği"
        tek-seferlik kurulumlar burada yapılır. Opsiyonel bir temizlik
        fonksiyonu döndürebilir (hook'un kendi unmount temizliğinde,
        ResizeObserver disconnect'inden VE map.remove()'dan ÖNCE
        çağrılır). ASYNC olabilir — hook bu değeri HER ZAMAN `await`
        eder (senkron bir değer için `await` no-op'tur), yani
        `mapReady` yalnızca `onReady` tamamen bittikten SONRA `true`
        olur. */
    onReady?: (map: LeafletMap, L: typeof import('leaflet')) =>
        void | (() => void) | Promise<void | (() => void)>;
    /** ResizeObserver bağlansın mı — varsayılan true. */
    observeResize?: boolean;
    /** Kurulum effect'inin bağımlılık dizisi — varsayılan `[]` (bir kez
        kurulur, asla yeniden kurulmaz). Değişince harita YIKILIP
        YENİDEN KURULUR (React'ın normal effect-dependency semantiği). */
    deps?: unknown[];
};

export type UseLeafletMapResult = {
    mapRef: MutableRefObject<LeafletMap | null>;
    LRef: MutableRefObject<typeof import('leaflet') | null>;
    mapReady: boolean;
};

/**
 * Ortak Leaflet harita kurulum iskeleti — async import, `_leaflet_id`
 * StrictMode-remount koruması, `mapReady` bayrağı, ResizeObserver,
 * unmount temizliği. Bu desen projede 4 kez ayrı ayrı yazılıp aynı
 * "async kurulumla yarışan effect" hatasıyla ayrı ayrı karşılaşıldığı
 * için buraya taşındı (bkz.
 * docs/superpowers/specs/2026-08-23-shared-leaflet-map-setup-hook-design.md).
 * Marker, poligon, katman, ölçüm/çizim aracı gibi HER ŞEY tüketicinin
 * kendi `onReady`/sonraki effect'lerinin sorumluluğunda kalır.
 */
export function useLeafletMap(
    containerRef: RefObject<HTMLDivElement | null>,
    options: UseLeafletMapOptions,
): UseLeafletMapResult {
    const { center, zoom, leafletMapOptions, onReady, observeResize = true, deps = [] } = options;

    const mapRef = useRef<LeafletMap | null>(null);
    const LRef = useRef<typeof import('leaflet') | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const onReadyCleanupRef = useRef<(() => void) | null>(null);
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        let cancelled = false;

        void (async () => {
            const L = await import('leaflet');
            if (cancelled || !containerRef.current) return;

            // React StrictMode dev'de mount->unmount->remount yapar; ayni DOM
            // node onceki (yok edilmis) Leaflet kurulumunun izini tasiyabilir,
            // bu da L.map(container)'i "Map container is already initialized"
            // ile patlatir.
            const el = containerRef.current as HTMLElement & { _leaflet_id?: number };
            if (el._leaflet_id) el._leaflet_id = undefined;

            const map = L.map(el, { center, zoom, ...leafletMapOptions });
            if (cancelled) { map.remove(); return; }

            const cleanup = await onReady?.(map, L);
            if (cancelled) { map.remove(); return; }
            onReadyCleanupRef.current = typeof cleanup === 'function' ? cleanup : null;

            mapRef.current = map;
            LRef.current = L;
            setMapReady(true);

            map.invalidateSize();
            if (observeResize && typeof ResizeObserver !== 'undefined') {
                const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
                ro.observe(el);
                resizeObserverRef.current = ro;
            }
        })();

        return () => {
            cancelled = true;
            onReadyCleanupRef.current?.();
            onReadyCleanupRef.current = null;
            resizeObserverRef.current?.disconnect();
            resizeObserverRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
            LRef.current = null;
            setMapReady(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- kasitli: yalnizca cagiranin verdigi `deps` degisince yeniden kurulur, center/zoom/onReady/leafletMapOptions/observeResize ilk okunustan sonra reaktif degil
    }, deps);

    return { mapRef, LRef, mapReady };
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx jest src/lib/hooks/useLeafletMap.test.ts`
Expected: PASS, all 8 tests green.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit` — expect 0 errors (this is a standalone new
module, nothing else references it yet).

```bash
git add src/lib/hooks/useLeafletMap.ts src/lib/hooks/useLeafletMap.test.ts
git commit -m "feat(hooks): add shared useLeafletMap setup hook"
```

---

### Task 2: Migrate ParcelPicker.tsx

**Files:**
- Modify: `src/components/listing-wizard/ParcelPicker.tsx`
- Test: `src/components/listing-wizard/ParcelPicker.map.test.tsx` (DO NOT MODIFY — must pass unchanged)
- Test: `src/components/listing-wizard/ParcelPicker.test.tsx` (DO NOT MODIFY — must pass unchanged)

**Interfaces:**
- Consumes: `useLeafletMap` from Task 1.
- Produces: no external interface change — `ParcelPickerProps`,
  `ParcelPickerHandle`, `ParcelPickerValue` all unchanged. This is a
  pure internal refactor.

- [ ] **Step 1: Replace the imports and the top of the component**

In `src/components/listing-wizard/ParcelPicker.tsx`, replace:

```tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker, Polygon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ParcelInfo } from '@/lib/tkgm/parcel'
```

with:

```tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Marker, Polygon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLeafletMap } from '@/lib/hooks/useLeafletMap'
import type { ParcelInfo } from '@/lib/tkgm/parcel'
```

- [ ] **Step 2: Replace the component body's setup section**

Replace this entire block (from `const containerRef` through the end of
the "Haritayı bir kez kur" `useEffect`, i.e. current lines 66-210):

```tsx
    const containerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<LeafletMap | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const markerRef = useRef<Marker | null>(null)
    const polygonRef = useRef<Polygon | null>(null)
    // Haritaya tiklandiginda dogrulama otomatik tetiklenir (asagida). Ust
    // uste hizli tiklamalarda ONCEKI istek iptal edilir — aksi halde gec
    // gelen bir yanit, daha sonraki bir tiklamanin sonucunu SESSIZCE
    // ezebilirdi (yaris kosulu). Yalnizca EN SON controller'a ait istegin
    // sonucu uygulanir.
    const verifyAbortRef = useRef<AbortController | null>(null)
    // Harita kurulum effect'i icinde tanimlanan, disaridan (geolocation
    // butonu, elle giris modali) cagirilabilen pin-koyma fonksiyonu. Effect
    // sadece bir kez calistigi icin `map` closure'ini burada disari tasiyoruz.
    const placePinRef = useRef<((lat: number, lng: number) => void) | null>(null)
    useImperativeHandle(ref, () => ({
        placePin: (lat: number, lng: number) => placePinRef.current?.(lat, lng),
    }), [])
    const [verifying, setVerifying] = useState(false)
    const [locating, setLocating] = useState(false)
    const [geoError, setGeoError] = useState<string | null>(null)
    // Harita async kuruluyor (dinamik leaflet import'u). Marker ve poligon
    // effect'leri ilk calismalarinda mapRef.current'i HENUZ bulamaz; bu bayrak
    // olmadan sessizce hicbir sey yapip bir daha calismiyorlardi.
    const [mapReady, setMapReady] = useState(false)

    // onChange'i ref'te tut: harita effect'i bir kez çalışsın, her render'da yeniden kurulmasın
    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

    // Koordinat alip TKGM sorgusu yapan cekirdek — hem haritaya tiklama hem
    // "Parseli Dogrula" butonu bunu cagirir (tek kaynak). `onChangeRef`/
    // `setVerifying` disinda hicbir render-degerine kapanmadigi icin, harita
    // kurulum effect'inin (bir kez calisan) click handler'i icinden dogrudan
    // cagrilabilir — placePinRef gibi ayri bir ref'e ihtiyac yok.
    const verifyAt = async (lat: number, lng: number) => {
        verifyAbortRef.current?.abort()
        const controller = new AbortController()
        verifyAbortRef.current = controller
        setVerifying(true)
        try {
            const res = await fetch(`/api/parcel/lookup?lat=${lat}&lng=${lng}`, { signal: controller.signal })
            // /hesapla auth-gated degil ama /api/parcel/lookup anonim kullaniciya
            // 401 doner. Bunu 'unavailable' (TKGM cevap vermiyor) ile karistirmak
            // kullaniciya yanlis teshis verir — asil sebep oturum acmamis olmasi.
            if (res.status === 401) {
                onChangeRef.current({ parcel: null, status: 'unauthorized' })
                return
            }
            const data = await res.json()
            if (data.status === 'verified' && data.parcel) {
                onChangeRef.current({ parcel: data.parcel, status: 'verified' })
            } else {
                onChangeRef.current({ parcel: null, status: data.status === 'not_found' ? 'not_found' : 'unavailable' })
            }
        } catch (err) {
            // Daha yeni bir tiklama bu istegi iptal ettiyse sonucu sessizce
            // yoksay — daha yeni istegin kendi sonucu zaten uygulanacak.
            if ((err as { name?: string })?.name === 'AbortError') return
            onChangeRef.current({ parcel: null, status: 'unavailable' })
        } finally {
            // Bu callback baska bir tiklama tarafindan iptal edildiyse
            // "Sorgulanıyor…" durumunu KAPATMA — o iş hâlâ yeni istekte sürüyor.
            if (verifyAbortRef.current === controller) setVerifying(false)
        }
    }

    /* Haritayı bir kez kur */
    useEffect(() => {
        let cancelled = false
        void (async () => {
            const L = await import('leaflet')
            if (cancelled || !containerRef.current || mapRef.current) return

            const map = L.map(containerRef.current).setView(
                value.lat != null && value.lng != null ? [value.lat, value.lng] : TURKEY_CENTER,
                value.lat != null ? 17 : 6,
            )
            // TKGM'nin kendi Atlas haritasi Arazi (uydu/topografya) gorunumu
            // sunuyor; arsa sinirlarini degerlendirirken bu, sokak haritasindan
            // (OSM Mapnik) daha isliyor (kullanici bulgusu). Esri World Imagery,
            // Leaflet ile atif sarti disinda ucretsiz kullanilabilen uydu katmani.
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
                maxZoom: 19,
            }).addTo(map)

            // Leaflet'in varsayılan ikonu görsel yollarını sayfa URL'ine göre
            // çözüyor; /listings/new altında /listings/marker-icon.png isteyip
            // 404 alıyordu. MapView'daki desen izlenerek divIcon kullanılıyor.
            const placePin = (lat: number, lng: number, recenter: boolean) => {
                if (markerRef.current) map.removeLayer(markerRef.current)
                if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null }
                const pinIcon = L.divIcon({
                    className: '',
                    html: '<div style="font-size:1.9rem;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4));">📍</div>',
                    iconSize: [30, 40],
                    iconAnchor: [15, 40],
                })
                markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map)
                if (recenter) map.setView([lat, lng], 17)
                onChangeRef.current({ lat, lng, parcel: null, status: 'idle' })
            }
            // Geolocation/elle-giris gibi haritanin disindan gelen konumlar
            // uzakta olabilir — bunlar icin recenter=true.
            placePinRef.current = (lat, lng) => placePin(lat, lng, true)

            map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
                const { lat, lng } = e.latlng
                placePin(lat, lng, false)
                void verifyAt(lat, lng)
            })

            mapRef.current = map
            setMapReady(true)

            // Leaflet tile izgarasini KURULUM ANINDAKI konteyner olcusune gore
            // uretir. Bu bilesen artik acilirken mount edilen bir modalin
            // (`/hesapla` ParcelModal) icinde de kullaniliyor: konteyner o an
            // ya 0 boyutlu ya da acilis animasyonunun ortasinda. Olculmus
            // sonuc — kopuk tile sutunlari, aralarinda bos alanlar ve kayan
            // tiklama koordinatlari. Bir kez hemen, sonra her olcu degisiminde
            // yeniden olctur.
            map.invalidateSize()
            if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
                const gozlemci = new ResizeObserver(() => mapRef.current?.invalidateSize())
                gozlemci.observe(containerRef.current)
                resizeObserverRef.current = gozlemci
            }
        })()

        return () => {
            cancelled = true
            resizeObserverRef.current?.disconnect()
            resizeObserverRef.current = null
            mapRef.current?.remove()
            mapRef.current = null
            markerRef.current = null
            polygonRef.current = null
            placePinRef.current = null
            verifyAbortRef.current?.abort()
            setMapReady(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- harita yalnızca bir kez kurulur
    }, [])
```

with:

```tsx
    const containerRef = useRef<HTMLDivElement | null>(null)
    const markerRef = useRef<Marker | null>(null)
    const polygonRef = useRef<Polygon | null>(null)
    // Haritaya tiklandiginda dogrulama otomatik tetiklenir (asagida). Ust
    // uste hizli tiklamalarda ONCEKI istek iptal edilir — aksi halde gec
    // gelen bir yanit, daha sonraki bir tiklamanin sonucunu SESSIZCE
    // ezebilirdi (yaris kosulu). Yalnizca EN SON controller'a ait istegin
    // sonucu uygulanir.
    const verifyAbortRef = useRef<AbortController | null>(null)
    // Harita kurulum effect'i icinde tanimlanan, disaridan (geolocation
    // butonu, elle giris modali) cagirilabilen pin-koyma fonksiyonu. Effect
    // sadece bir kez calistigi icin `map` closure'ini burada disari tasiyoruz.
    const placePinRef = useRef<((lat: number, lng: number) => void) | null>(null)
    useImperativeHandle(ref, () => ({
        placePin: (lat: number, lng: number) => placePinRef.current?.(lat, lng),
    }), [])
    const [verifying, setVerifying] = useState(false)
    const [locating, setLocating] = useState(false)
    const [geoError, setGeoError] = useState<string | null>(null)

    // onChange'i ref'te tut: harita effect'i bir kez çalışsın, her render'da yeniden kurulmasın
    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

    // Koordinat alip TKGM sorgusu yapan cekirdek — hem haritaya tiklama hem
    // "Parseli Dogrula" butonu bunu cagirir (tek kaynak). `onChangeRef`/
    // `setVerifying` disinda hicbir render-degerine kapanmadigi icin, harita
    // kurulum effect'inin (bir kez calisan) click handler'i icinden dogrudan
    // cagrilabilir — placePinRef gibi ayri bir ref'e ihtiyac yok.
    const verifyAt = async (lat: number, lng: number) => {
        verifyAbortRef.current?.abort()
        const controller = new AbortController()
        verifyAbortRef.current = controller
        setVerifying(true)
        try {
            const res = await fetch(`/api/parcel/lookup?lat=${lat}&lng=${lng}`, { signal: controller.signal })
            // /hesapla auth-gated degil ama /api/parcel/lookup anonim kullaniciya
            // 401 doner. Bunu 'unavailable' (TKGM cevap vermiyor) ile karistirmak
            // kullaniciya yanlis teshis verir — asil sebep oturum acmamis olmasi.
            if (res.status === 401) {
                onChangeRef.current({ parcel: null, status: 'unauthorized' })
                return
            }
            const data = await res.json()
            if (data.status === 'verified' && data.parcel) {
                onChangeRef.current({ parcel: data.parcel, status: 'verified' })
            } else {
                onChangeRef.current({ parcel: null, status: data.status === 'not_found' ? 'not_found' : 'unavailable' })
            }
        } catch (err) {
            // Daha yeni bir tiklama bu istegi iptal ettiyse sonucu sessizce
            // yoksay — daha yeni istegin kendi sonucu zaten uygulanacak.
            if ((err as { name?: string })?.name === 'AbortError') return
            onChangeRef.current({ parcel: null, status: 'unavailable' })
        } finally {
            // Bu callback baska bir tiklama tarafindan iptal edildiyse
            // "Sorgulanıyor…" durumunu KAPATMA — o iş hâlâ yeni istekte sürüyor.
            if (verifyAbortRef.current === controller) setVerifying(false)
        }
    }

    /* Haritayı bir kez kur — ortak iskelet useLeafletMap'te (bkz. Task 1) */
    const { mapRef, mapReady } = useLeafletMap(containerRef, {
        center: value.lat != null && value.lng != null ? [value.lat, value.lng] : TURKEY_CENTER,
        zoom: value.lat != null ? 17 : 6,
        onReady: (map, L) => {
            // TKGM'nin kendi Atlas haritasi Arazi (uydu/topografya) gorunumu
            // sunuyor; arsa sinirlarini degerlendirirken bu, sokak haritasindan
            // (OSM Mapnik) daha isliyor (kullanici bulgusu). Esri World Imagery,
            // Leaflet ile atif sarti disinda ucretsiz kullanilabilen uydu katmani.
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
                maxZoom: 19,
            }).addTo(map)

            // Leaflet'in varsayılan ikonu görsel yollarını sayfa URL'ine göre
            // çözüyor; /listings/new altında /listings/marker-icon.png isteyip
            // 404 alıyordu. MapView'daki desen izlenerek divIcon kullanılıyor.
            const placePin = (lat: number, lng: number, recenter: boolean) => {
                if (markerRef.current) map.removeLayer(markerRef.current)
                if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null }
                const pinIcon = L.divIcon({
                    className: '',
                    html: '<div style="font-size:1.9rem;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4));">📍</div>',
                    iconSize: [30, 40],
                    iconAnchor: [15, 40],
                })
                markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map)
                if (recenter) map.setView([lat, lng], 17)
                onChangeRef.current({ lat, lng, parcel: null, status: 'idle' })
            }
            // Geolocation/elle-giris gibi haritanin disindan gelen konumlar
            // uzakta olabilir — bunlar icin recenter=true.
            placePinRef.current = (lat, lng) => placePin(lat, lng, true)

            map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
                const { lat, lng } = e.latlng
                placePin(lat, lng, false)
                void verifyAt(lat, lng)
            })

            return () => {
                markerRef.current = null
                polygonRef.current = null
                placePinRef.current = null
                verifyAbortRef.current?.abort()
            }
        },
    })
```

**Not:** `useLeafletMap`'in kendi `_leaflet_id` sıfırlama koruması,
`ResizeObserver` (varsayılan `observeResize: true`, bu bileşenin
ihtiyacı) ve `map.invalidateSize()` çağrısı yukarıdaki eski kod
bloğundaki karşılıklarının AYNEN yerini alır — bu davranışlar
kaybolmuyor, hook'a taşınıyor.

- [ ] **Step 3: Verify the two existing test files still pass unchanged**

Run: `npx jest src/components/listing-wizard/ParcelPicker.test.tsx src/components/listing-wizard/ParcelPicker.map.test.tsx`
Expected: PASS, all tests green, with ZERO edits to either test file. If
any test fails, the refactor introduced a behavior change — find and fix
it in `ParcelPicker.tsx`, do not touch the test files.

- [ ] **Step 4: Type-check and commit**

Run: `npx tsc --noEmit` — expect 0 errors.

```bash
git add src/components/listing-wizard/ParcelPicker.tsx
git commit -m "refactor(parcel-picker): migrate to shared useLeafletMap hook"
```

---

### Task 3: Migrate MiniMap.tsx

**Files:**
- Modify: `src/components/marketplace/MiniMap.tsx`
- Test: `src/components/marketplace/MiniMap.test.tsx` (DO NOT MODIFY — must pass unchanged)

**Interfaces:**
- Consumes: `useLeafletMap` from Task 1.
- Produces: no external interface change — `MiniMap`'s props are unchanged.

- [ ] **Step 1: Replace the imports and setup section**

In `src/components/marketplace/MiniMap.tsx`, replace:

```tsx
"use client";

import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import styles from './MiniMap.module.css';
```

with:

```tsx
"use client";

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useLeafletMap } from '@/lib/hooks/useLeafletMap';
import styles from './MiniMap.module.css';
```

- [ ] **Step 2: Replace the map-setup effect**

Replace this entire block (current lines 19-95, from `const containerRef`
through the end of the setup `useEffect`):

```tsx
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<LeafletMap | null>(null)
    const faultRef = useRef<import('leaflet').TileLayer | null>(null)
    const floodRef = useRef<import('leaflet').TileLayer | null>(null)
    const shapeRef = useRef<import('leaflet').Polygon | import('leaflet').Circle | null>(null)
    const [mapReady, setMapReady] = useState(false)

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return

        const init = async () => {
            const L = (await import('leaflet')).default

            const el = containerRef.current
            if (!el) return
            const leafletEl = el as HTMLElement & { _leaflet_id?: number }
            if (leafletEl._leaflet_id) leafletEl._leaflet_id = undefined

            const map = L.map(el, {
                center: [lat, lng],
                zoom: 15,
                zoomControl: false,
                scrollWheelZoom: false,
                dragging: false,
                doubleClickZoom: false,
                attributionControl: false,
            })

            // Use dark CartoDB tile to match platform
            const savedTile = typeof window !== 'undefined' ? localStorage.getItem('arsabil-map-tile') : null
            const isDark = !savedTile || savedTile === 'dark'
            const tileUrl = isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map)

            // Pin marker
            const pinIcon = L.divIcon({
                className: '',
                html: `<div style="
                    font-size:1.5rem;
                    filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));
                    animation: bounce-pin 0.5s ease-out;
                ">📍</div>
                <style>
                    @keyframes bounce-pin {
                        0% { transform: translateY(-20px); opacity: 0; }
                        60% { transform: translateY(4px); }
                        100% { transform: translateY(0); opacity: 1; }
                    }
                </style>`,
                iconSize: [24, 32],
                iconAnchor: [12, 32],
            })
            L.marker([lat, lng], { icon: pinIcon }).addTo(map)

            mapRef.current = map
            setMapReady(true)
        }

        init()

        return () => {
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
            // Harita yok edildiğinde eski katman referansları da onunla birlikte
            // geçersiz olur; sıfırlanmazsa yeniden kurulan haritada "zaten ekli"
            // sanılıp bir daha eklenmezler (ya da artık ait olmadıkları haritadan
            // kaldırılmaya çalışılırlar).
            faultRef.current = null
            floodRef.current = null
            shapeRef.current = null
            setMapReady(false)
        }
    }, [lat, lng])
```

with:

```tsx
    const containerRef = useRef<HTMLDivElement>(null)
    const faultRef = useRef<import('leaflet').TileLayer | null>(null)
    const floodRef = useRef<import('leaflet').TileLayer | null>(null)
    const shapeRef = useRef<import('leaflet').Polygon | import('leaflet').Circle | null>(null)

    // `deps: [lat, lng]` BİLİNÇLİ: koordinat değişince harita YIKILIP
    // YENİDEN KURULUR (bu bileşenin var olan davranışı, bkz.
    // MiniMap.test.tsx — ParcelPicker/MapView'in aksine bir kez kurulup
    // asla yeniden kurulmuyorlar). `observeResize: false`: sabit 180px
    // yükseklikte, animasyonlu bir konteynerde asla açılmıyor.
    const { mapRef, mapReady } = useLeafletMap(containerRef, {
        center: [lat, lng],
        zoom: 15,
        leafletMapOptions: {
            zoomControl: false,
            scrollWheelZoom: false,
            dragging: false,
            doubleClickZoom: false,
            attributionControl: false,
        },
        deps: [lat, lng],
        observeResize: false,
        onReady: (map, L) => {
            // Use dark CartoDB tile to match platform
            const savedTile = typeof window !== 'undefined' ? localStorage.getItem('arsabil-map-tile') : null
            const isDark = !savedTile || savedTile === 'dark'
            const tileUrl = isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map)

            // Pin marker
            const pinIcon = L.divIcon({
                className: '',
                html: `<div style="
                    font-size:1.5rem;
                    filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));
                    animation: bounce-pin 0.5s ease-out;
                ">📍</div>
                <style>
                    @keyframes bounce-pin {
                        0% { transform: translateY(-20px); opacity: 0; }
                        60% { transform: translateY(4px); }
                        100% { transform: translateY(0); opacity: 1; }
                    }
                </style>`,
                iconSize: [24, 32],
                iconAnchor: [12, 32],
            })
            L.marker([lat, lng], { icon: pinIcon }).addTo(map)

            return () => {
                // Harita yok edildiğinde eski katman referansları da onunla
                // birlikte geçersiz olur; sıfırlanmazsa yeniden kurulan
                // haritada "zaten ekli" sanılıp bir daha eklenmezler (ya da
                // artık ait olmadıkları haritadan kaldırılmaya çalışılırlar).
                faultRef.current = null
                floodRef.current = null
                shapeRef.current = null
            }
        },
    })
```

**Not:** `L.map(el, {...})` çağrısındaki `.default` (`(await
import('leaflet')).default`) hook'un içine taşındı — hook `import('leaflet')`
sonucunu `.default` OLMADAN kullanıyor (Task 1'deki kodun kendisi), bu
`onReady`'ye geçilen `L` parametresinin zaten doğru modül referansı
olduğu anlamına gelir; `MiniMap.tsx` içinde ayrıca `.default` erişimine
gerek YOKTUR.

- [ ] **Step 3: Verify the existing test file still passes unchanged**

Run: `npx jest src/components/marketplace/MiniMap.test.tsx`
Expected: PASS, all 4 tests green (including the remount/leak-guard
test), with ZERO edits to the test file.

- [ ] **Step 4: Type-check and commit**

Run: `npx tsc --noEmit` — expect 0 errors.

```bash
git add src/components/marketplace/MiniMap.tsx
git commit -m "refactor(minimap): migrate to shared useLeafletMap hook"
```

---

### Task 4: Migrate MapView.tsx

**Files:**
- Modify: `src/components/marketplace/MapView.tsx`
- Test: `src/components/marketplace/MapView.markers.test.tsx` (DO NOT MODIFY — must pass unchanged)

**Interfaces:**
- Consumes: `useLeafletMap` from Task 1.
- Produces: no external interface change — `MapViewProps`,
  `MapViewHandle` unchanged.

This is the riskiest migration: the original setup effect does an async
`leaflet.markercluster` import AFTER creating the map and BEFORE
`clusterGroupRef` is populated, and a separate effect (marker setup)
depends on `mapReady` becoming `true` only once `clusterGroupRef.current`
is genuinely set. Get the `async onReady` + `await` timing exactly right.

- [ ] **Step 1: Add the import, drop the now-unused `LMap` type import**

In `src/components/marketplace/MapView.tsx`, add this import alongside
the existing ones near the top of the file (after the `leaflet.markercluster`
CSS imports, before `splitListingsByCoords`):

```tsx
import { useLeafletMap } from '@/lib/hooks/useLeafletMap';
```

Also replace this line (Step 2 below removes `LMap`'s only usage —
`const mapRef = useRef<LMap | null>(null);` — so the import must drop
it too; this repo's tsconfig does NOT have `noUnusedLocals`, so `tsc`
will NOT catch a stale unused import on its own):

```tsx
import type { Map as LMap, TileLayer, LayerGroup, Marker, MarkerOptions, LeafletMouseEvent, FeatureGroup } from 'leaflet';
```

with:

```tsx
import type { TileLayer, LayerGroup, Marker, MarkerOptions, LeafletMouseEvent, FeatureGroup } from 'leaflet';
```

- [ ] **Step 2: Remove the now-hook-owned refs and state**

Remove these three lines from the component body (they're replaced by
the hook's return values in Step 4):

```tsx
    const mapRef = useRef<LMap | null>(null);
```
```tsx
    const LRef = useRef<typeof import('leaflet') | null>(null);
    const roRef = useRef<ResizeObserver | null>(null);
```

and remove this line (the hook owns `mapReady` now):

```tsx
    const [mapReady, setMapReady] = useState(false);
```

Leave every OTHER ref (`markersRef`, `clusterGroupRef`, `tileLayerRef`,
`heatLayerRef`, `pinMarkerRef`, `measureLayerRef`, `measurePointsRef`,
`drawLayerRef`, `drawPointsRef`, `provinceBorderRef`, `geoJsonCacheRef`,
`lastView`) and every state variable (`onHighlightRef`, `tileKey`,
`showTileMenu`, `pinMode`, `heatmapOn`, `measureMode`, `drawMode`,
`showBorder`, `unplacedCount`, `pinInfo`, `measureResult`, `drawResult`)
untouched.

- [ ] **Step 3: Replace the init-map effect**

Replace this entire block (the `/* ─── Init Map ─── */` comment through
the end of that `useEffect`):

```tsx
    /* ─── Init Map ─── */
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapRef.current) return;
        let cancelled = false;

        const initMap = async () => {
            const L = (await import('leaflet')).default;
            if (cancelled) return;
            LRef.current = L;

            const container = mapContainerRef.current as HTMLElement & { _leaflet_id?: number };
            if (!container || cancelled) return;
            if (container._leaflet_id) container._leaflet_id = undefined;

            const map = L.map(container, {
                center: [lastView.current.lat, lastView.current.lng],
                zoom: lastView.current.zoom,
                zoomControl: false,
            });
            if (cancelled) { map.remove(); return; }

            // Zoom control bottom-right
            L.control.zoom({ position: 'bottomright' }).addTo(map);

            // Tile layer
            const savedTile = (typeof window !== 'undefined' ? localStorage.getItem('arsabil-map-tile') : null) as TileKey || 'dark';
            const tile = TILES[savedTile] || TILES.dark;
            tileLayerRef.current = L.tileLayer(tile.url, { attribution: tile.attr, maxZoom: 19 }).addTo(map);

            map.on('moveend', () => {
                const c = map.getCenter();
                lastView.current = { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
            });

            mapRef.current = map;

            // ResizeObserver: invalidate map size when container becomes visible (e.g. mobile tab switch)
            if (mapContainerRef.current) {
                const ro = new ResizeObserver(() => { map.invalidateSize(); });
                ro.observe(mapContainerRef.current);
                roRef.current = ro;
            }

            // MarkerCluster
            try {
                await import('leaflet.markercluster');
            } catch { /* optional */ }

            if (cancelled) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet.markercluster dinamik import ile L namespace augmentation uygulanmıyor
            const clusterGroup = (L as any).markerClusterGroup ? (L as any).markerClusterGroup({
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                iconCreateFunction: (cluster: { getAllChildMarkers: () => (Marker & { options: MarkerOptions & { score?: number } })[] }) => {
                    const markers = cluster.getAllChildMarkers();
                    const count = markers.length;
                    const avgScore = markers.reduce((s: number, m) => s + (m.options.score || 70), 0) / count;
                    const color = avgScore >= 80 ? 'var(--green)' : avgScore >= 60 ? 'var(--orange)' : 'var(--red)';
                    const rgb = avgScore >= 80 ? 'var(--green-rgb)' : avgScore >= 60 ? 'var(--orange-rgb)' : 'var(--red-rgb)';
                    return L.divIcon({
                        html: `<div style="
                            background:${color};color:white;
                            width:44px;height:44px;border-radius:50%;
                            display:flex;align-items:center;justify-content:center;
                            font-weight:900;font-size:0.85rem;font-family:Inter,sans-serif;
                            border:3px solid white;
                            box-shadow:0 4px 14px rgba(${rgb},0.33);
                        ">${count}</div>`,
                        className: '',
                        iconSize: [44, 44],
                        iconAnchor: [22, 22],
                    });
                },
            }) : L.layerGroup();

            clusterGroupRef.current = clusterGroup;
            map.addLayer(clusterGroup);

            // Marker'lar BURADA kurulmaz. Bu effect'in bagimlilik dizisi []
            // oldugu icin marker'lar bir kez ve cogu zaman BOS `listings` ile
            // kurulurdu: marketplace listeyi [] ile mount edip sonra fetch ile
            // dolduruyor, dolayisiyla harita kalici olarak bos kaliyordu ve
            // filtre degisiklikleri de hic yansimiyordu. Kurulum artik
            // `[listings, mapReady]` bagimlilikli ayri bir effect'te.
            setMapReady(true);
        };

        initMap();
        return () => {
            cancelled = true;
            if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
            if (mapRef.current) {
                const c = mapRef.current.getCenter();
                lastView.current = { lat: c.lat, lng: c.lng, zoom: mapRef.current.getZoom() };
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    // Harita bir kez başlatılır. Bu effect artık `listings`/`onHighlight`
    // okumuyor (marker kurulumu aşağıdaki ayrı effect'e taşındı), dolayısıyla
    // boş bağımlılık dizisi gerçekten doğru — exhaustive-deps istisnası gerekmez.
    }, []);
```

with:

```tsx
    /* ─── Init Map — ortak iskelet useLeafletMap'te (bkz. Task 1) ─── */
    const { mapRef, LRef, mapReady } = useLeafletMap(mapContainerRef, {
        center: [lastView.current.lat, lastView.current.lng],
        zoom: lastView.current.zoom,
        leafletMapOptions: { zoomControl: false },
        onReady: async (map, L) => {
            // Zoom control bottom-right
            L.control.zoom({ position: 'bottomright' }).addTo(map);

            // Tile layer
            const savedTile = (typeof window !== 'undefined' ? localStorage.getItem('arsabil-map-tile') : null) as TileKey || 'dark';
            const tile = TILES[savedTile] || TILES.dark;
            tileLayerRef.current = L.tileLayer(tile.url, { attribution: tile.attr, maxZoom: 19 }).addTo(map);

            map.on('moveend', () => {
                const c = map.getCenter();
                lastView.current = { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
            });

            // MarkerCluster
            try {
                await import('leaflet.markercluster');
            } catch { /* optional */ }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet.markercluster dinamik import ile L namespace augmentation uygulanmıyor
            const clusterGroup = (L as any).markerClusterGroup ? (L as any).markerClusterGroup({
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                iconCreateFunction: (cluster: { getAllChildMarkers: () => (Marker & { options: MarkerOptions & { score?: number } })[] }) => {
                    const markers = cluster.getAllChildMarkers();
                    const count = markers.length;
                    const avgScore = markers.reduce((s: number, m) => s + (m.options.score || 70), 0) / count;
                    const color = avgScore >= 80 ? 'var(--green)' : avgScore >= 60 ? 'var(--orange)' : 'var(--red)';
                    const rgb = avgScore >= 80 ? 'var(--green-rgb)' : avgScore >= 60 ? 'var(--orange-rgb)' : 'var(--red-rgb)';
                    return L.divIcon({
                        html: `<div style="
                            background:${color};color:white;
                            width:44px;height:44px;border-radius:50%;
                            display:flex;align-items:center;justify-content:center;
                            font-weight:900;font-size:0.85rem;font-family:Inter,sans-serif;
                            border:3px solid white;
                            box-shadow:0 4px 14px rgba(${rgb},0.33);
                        ">${count}</div>`,
                        className: '',
                        iconSize: [44, 44],
                        iconAnchor: [22, 22],
                    });
                },
            }) : L.layerGroup();

            clusterGroupRef.current = clusterGroup;
            map.addLayer(clusterGroup);

            return () => {
                const c = map.getCenter();
                lastView.current = { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
            };
        },
    });
```

**Kritik doğrulama noktası:** `onReady` burada `async` — `useLeafletMap`
onun döndürdüğü `Promise`'i `await` ettiği için (Task 1'in hook
gövdesi), `mapReady` yalnızca `leaflet.markercluster` import'u VE
`clusterGroupRef.current` ataması tamamen bittikten sonra `true` olur.
Marker kurulum effect'i (`useEffect(..., [listings, mapReady])`,
aşağıda, BU TASK'TA DEĞİŞMEZ) `clusterGroupRef.current`'ın o an dolu
olduğunu varsayıyor — bu sıra bozulursa `MapView.markers.test.tsx:94`
("ilanlar sonradan geldiğinde marker oluşturur") FAIL olur.

**Not:** Eski kodun unmount temizliğindeki `lastView.current`
güncellemesi (`mapRef.current.getCenter()` okuyup son konumu kaydetme)
artık `onReady`'nin döndürdüğü temizlik fonksiyonunda — hook bu
fonksiyonu `map.remove()`'dan ÖNCE çağırdığı için (Task 1'in kurulum
sırası), harita hâlâ sorgulanabilir durumdayken çalışır, davranış
AYNI kalır.

- [ ] **Step 4: Verify no other reference to the removed identifiers remains**

Run: `grep -n "roRef\|LRef.current = L\|setMapReady\|LMap" src/components/marketplace/MapView.tsx`
Expected: no matches for `roRef` (fully removed), no matches for a
manual `LRef.current = L` assignment (the hook owns this now), no
matches for `setMapReady` (the hook owns this now), and no matches for
`LMap` (the now-unused type import from Step 1). If any match remains,
it's leftover dead code from the old block — remove it.

- [ ] **Step 5: Verify the existing test file still passes unchanged**

Run: `npx jest src/components/marketplace/MapView.markers.test.tsx`
Expected: PASS, all 3 tests green, with ZERO edits to the test file.
Pay special attention to the first test ("ilanlar sonradan geldiginde
marker olusturur") — this is the one most likely to catch a timing
mistake in the `async onReady` migration.

- [ ] **Step 6: Type-check and commit**

Run: `npx tsc --noEmit` — expect 0 errors.

```bash
git add src/components/marketplace/MapView.tsx
git commit -m "refactor(mapview): migrate to shared useLeafletMap hook"
```

---

## Final Verification (after all 4 tasks)

- [ ] **Full type-check and targeted test run**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npx jest --testPathPatterns "^src/(lib/hooks/useLeafletMap|components/listing-wizard/ParcelPicker|components/marketplace/(MapView|MiniMap))"`
— expect all suites green (anchored pattern avoids picking up any other
worktree's copy of these files — see the project's own established
gotcha with `.worktrees/` and jest's default scan).

- [ ] **Full project regression run**

Run: `npx jest --testPathPatterns "^src/"` — expect no suite outside the
four touched areas to have changed status (0 new failures anywhere).

- [ ] **Real production build**

Run: `npm run build` — expect success (catches CSS/build-time-only
issues jest/webpack-dev can't).

- [ ] **Playwright/manual visual check**

Against a real dev session:
1. `/hesapla` — open "Haritadan Parsel Doğrula", confirm the map still
   loads, click-to-verify still auto-draws the red boundary (this is the
   feature added earlier this session — confirm the migration didn't
   regress it).
2. `/marketplace?view=map` — confirm the map loads, markers render,
   clicking a marker's popup works, the tile-style switcher (🗺️ icon)
   still switches tiles, pin mode / heatmap / measure / draw / province
   border toolbar buttons all still work.
3. Any listing detail page with a `MiniMap` — confirm it renders, and if
   the listing has `riskLayers`, confirm the Diri Fay / Taşkın checkboxes
   still toggle their WMS layers.

Report any deviation before considering this plan complete.
