"use client";

import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import styles from './MiniMap.module.css';

interface Props {
    lat: number;
    lng: number;
    label?: string;
    listingId?: string;
    riskLayers?: boolean;
    /** TKGM'den gelen gerçek parsel sınırı (GeoJSON Polygon). */
    parcelGeometry?: { type: string; coordinates: number[][][] } | null;
}

export function MiniMap({ lat, lng, label, listingId, riskLayers, parcelGeometry }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const faultRef = useRef<import('leaflet').TileLayer | null>(null);
    const floodRef = useRef<import('leaflet').TileLayer | null>(null);
    const shapeRef = useRef<import('leaflet').Polygon | import('leaflet').Circle | null>(null);
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const init = async () => {
            const L = (await import('leaflet')).default;

            const el = containerRef.current;
            if (!el) return;
            const leafletEl = el as HTMLElement & { _leaflet_id?: number };
            if (leafletEl._leaflet_id) leafletEl._leaflet_id = undefined;

            const map = L.map(el, {
                center: [lat, lng],
                zoom: 15,
                zoomControl: false,
                scrollWheelZoom: false,
                dragging: false,
                doubleClickZoom: false,
                attributionControl: false,
            });

            // Use dark CartoDB tile to match platform
            const savedTile = typeof window !== 'undefined' ? localStorage.getItem('arsabil-map-tile') : null;
            const isDark = !savedTile || savedTile === 'dark';
            const tileUrl = isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
            L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

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
            });
            L.marker([lat, lng], { icon: pinIcon }).addTo(map);

            mapRef.current = map;
            setMapReady(true);
        };

        init();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            // Harita yok edildiğinde eski katman referansları da onunla birlikte
            // geçersiz olur; sıfırlanmazsa yeniden kurulan haritada "zaten ekli"
            // sanılıp bir daha eklenmezler (ya da artık ait olmadıkları haritadan
            // kaldırılmaya çalışılırlar).
            faultRef.current = null;
            floodRef.current = null;
            shapeRef.current = null;
            setMapReady(false);
        };
    }, [lat, lng]);

    /* Parsel sınırı (veya sınır yoksa yaklaşıklık çemberi) */
    // Kurulum effect'inden AYRI: `parcelGeometry` ilan verisiyle birlikte
    // geliyor ve kurulum effect'i yalnizca [lat, lng]'ye bagli. Ayni effect'te
    // birakilsaydi ya geometri gec geldiginde hic cizilmez ya da geometriyi
    // bagimliliga eklemek TUM haritayi yeniden kurdururdu.
    useEffect(() => {
        const map = mapRef.current;
        if (!mapReady || !map) return;
        let cancelled = false;

        void (async () => {
            const L = (await import('leaflet')).default;
            if (cancelled || !mapRef.current) return;

            if (shapeRef.current) { map.removeLayer(shapeRef.current); shapeRef.current = null; }

            // GeoJSON [lng, lat] → Leaflet [lat, lng]. Gerçek sınır varsa onu
            // çiz ve haritayı ona sığdır; 80 m'lik "yaklaşıklık" çemberi o
            // durumda YANILTICI olur (tapudan gelen kesin sınırın yanında
            // belirsizlik ima eder), bu yüzden yalnızca sınır yokken çizilir.
            const ring = parcelGeometry?.coordinates?.[0];
            if (Array.isArray(ring) && ring.length >= 3) {
                const latlngs = ring.map(([lng2, lat2]) => [lat2, lng2] as [number, number]);
                const poly = L.polygon(latlngs, {
                    // Leaflet SVG/canvas render eder; var() BURADA ÇÖZÜLMEZ.
                    // ParcelPicker'daki aynı yeşil literal kullanılıyor.
                    color: '#10b981',
                    weight: 2,
                    fillOpacity: 0.12,
                }).addTo(map);
                shapeRef.current = poly;
                map.fitBounds(poly.getBounds(), { padding: [16, 16] });
            } else {
                shapeRef.current = L.circle([lat, lng], {
                    radius: 80,
                    color: '#1f6feb',
                    fillColor: '#1f6feb',
                    fillOpacity: 0.1,
                    weight: 1.5,
                    dashArray: '4 3',
                }).addTo(map);
            }
        })();

        return () => { cancelled = true; };
    }, [mapReady, lat, lng, parcelGeometry]);

    const [showFault, setShowFault] = useState(false);
    const [showFlood, setShowFlood] = useState(false);

    useEffect(() => {
        if (!riskLayers) return;
        let cancelled = false;

        void (async () => {
            const L = (await import('leaflet')).default;
            const map = mapRef.current;
            if (cancelled || !map) return;

            const attach = (
                ref: React.MutableRefObject<import('leaflet').TileLayer | null>,
                layer: string,
                show: boolean,
            ) => {
                if (show && !ref.current) {
                    // TUCBS yalnizca EPSG:4326 ilan ediyor; Leaflet varsayilani
                    // EPSG:3857'dir ve bos tile dondurur.
                    ref.current = L.tileLayer.wms('/api/risk/tiles', {
                        layers: layer,
                        format: 'image/png',
                        transparent: true,
                        crs: L.CRS.EPSG4326,
                    }).addTo(map);
                } else if (!show && ref.current) {
                    map.removeLayer(ref.current);
                    ref.current = null;
                }
            };

            attach(faultRef, 'diri_fay', showFault);
            attach(floodRef, 'taskin_tehlike_haritasi_q100', showFlood);
        })();

        return () => { cancelled = true; };
    }, [riskLayers, showFault, showFlood]);

    return (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
            <div ref={containerRef} style={{ width: '100%', height: 180 }} />
            {riskLayers && (
                <div className={styles.layerToggles}>
                    <label>
                        <input
                            type="checkbox"
                            aria-label="Diri fay katmanı"
                            checked={showFault}
                            onChange={e => setShowFault(e.target.checked)}
                        />
                        Diri fay
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            aria-label="Taşkın katmanı"
                            checked={showFlood}
                            onChange={e => setShowFlood(e.target.checked)}
                        />
                        Taşkın (Q100)
                    </label>
                </div>
            )}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: 'var(--bg)',
            }}>
                <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>📍 Parsel Konumu</div>
                    {label && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--card-title)' }}>{label}</div>}
                </div>
                {listingId && (
                    <a
                        href={`/marketplace?view=map&focus=${listingId}`}
                        style={{
                            fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)',
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', background: 'rgba(var(--primary-rgb),.1)',
                            borderRadius: 6, border: '1px solid rgba(var(--primary-rgb),.2)',
                            transition: 'all 0.15s',
                        }}
                    >
                        🗺️ Haritada Göster →
                    </a>
                )}
            </div>
        </div>
    );
}
