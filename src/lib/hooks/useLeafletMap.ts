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
        YENİDEN KURULUR (React'ın normal effect-dependency semantiği).
        `deps` dizisinin uzunlugu render'lar arasinda SABIT kalmalidir
        (React'in useEffect kurali) — degisken uzunlukta bir dizi gecmek
        React'in kendi hata mesajini tetikler. */
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
            const mod = await import('leaflet');
            if (cancelled || !containerRef.current) return;

            // Leaflet eklentileri (leaflet.markercluster, leaflet.heat) modulun
            // CANLI exports nesnesini (window.L === module.exports) mutasyona
            // ugratir — L.markerClusterGroup/L.heatLayer gibi ozellikleri KENDI
            // import'larindan SONRA ekler. ESM namespace nesnesi (`await
            // import(...)` ciplak) ise bundler'in ilk import aninda urettigi
            // MUHURLENMIS bir anlik goruntudur; sonradan eklenen ozellikleri
            // ASLA gosteremez. `.default` ise Leaflet'in hic __esModule bayragi
            // olmadigi icin dogrudan o canli nesneye baglanir — bu yuzden bu
            // hook'un uc gercek tuketicisinin UCU DE (ParcelPicker, MiniMap,
            // MapView) migrasyondan once zaten `.default` kullaniyordu.
            const L = (mod as unknown as { default?: typeof mod }).default ?? mod;

            // React StrictMode dev'de mount->unmount->remount yapar; ayni DOM
            // node onceki (yok edilmis) Leaflet kurulumunun izini tasiyabilir,
            // bu da L.map(container)'i "Map container is already initialized"
            // ile patlatir.
            const el = containerRef.current as HTMLElement & { _leaflet_id?: number };
            if (el._leaflet_id) el._leaflet_id = undefined;

            let map: LeafletMap;
            let cleanup: void | (() => void);
            try {
                map = L.map(el, { center, zoom, ...leafletMapOptions });
                if (cancelled) { map.remove(); return; }
                cleanup = await onReady?.(map, L);
            } catch (err) {
                // Ornegin onReady icindeki korumasiz bir localStorage.getItem()
                // cagrisi bazi tarayici gizlilik baglamlarinda (sandboxli
                // iframe, bazi Safari private-browsing yapilandirmalari)
                // SecurityError firlatabilir. Burada tek yerden yakalayip
                // logluyoruz; mapReady hicbir zaman true olmaz, mapRef.current
                // hicbir zaman atanmaz (dolayisiyla unmount temizligi no-op
                // olur — sizinti degil, sadece kurulmamis bir harita).
                console.error('useLeafletMap: kurulum sirasinda hata, harita hazir isaretlenmeyecek', err);
                return;
            }

            if (cancelled) {
                if (typeof cleanup === 'function') cleanup();
                map.remove();
                return;
            }
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
