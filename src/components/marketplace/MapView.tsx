"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

/* ─── Tile Sources (all free, no API key) ─── */
const TILES = {
    light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attr: '© OpenStreetMap contributors, © CARTO',
        label: '🗺️ Sokak (Light)',
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attr: '© OpenStreetMap contributors, © CARTO',
        label: '🌙 Sokak (Dark)',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attr: '© Esri, Maxar, Earthstar',
        label: '🛰️ Uydu',
    },
};

type TileKey = keyof typeof TILES;

/* ─── Default marker positions around Istanbul ─── */
const ISTANBUL_COORDS: [number, number][] = [
    [41.043, 29.008], [41.068, 29.045], [41.015, 28.978],
    [41.030, 29.020], [41.055, 28.990], [40.998, 29.015],
    [41.082, 28.960], [40.975, 28.970], [41.045, 28.955],
    [41.010, 29.050],
];

interface Listing {
    id: string;
    title?: string;
    type?: string;
    city?: string;
    district?: string;
    fizibiliteSkoru?: number;
    arsaPayiMin?: number;
    arsaPayiMax?: number;
    price?: number;
    isNew?: boolean;
    lat?: number;
    lng?: number;
    report?: any;
}

interface Props {
    listings: Listing[];
    highlightedId: string | null;
    onHighlight: (id: string | null) => void;
}

export interface MapViewHandle {
    flyTo: (lat: number, lng: number, zoom?: number) => void;
    showProvinceBorder: (cityName: string) => void;
}

/* ─── Point-in-polygon (ray casting) ─── */
function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][1], yi = polygon[i][0];
        const xj = polygon[j][1], yj = polygon[j][0];
        const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/* ─── Calculate polygon area (Shoelace formula, returns m²) ─── */
function polygonArea(coords: [number, number][]): number {
    if (coords.length < 3) return 0;
    const R = 6371000; // Earth radius in meters
    let area = 0;
    const toRad = (d: number) => d * Math.PI / 180;
    for (let i = 0; i < coords.length; i++) {
        const j = (i + 1) % coords.length;
        area += toRad(coords[j][1] - coords[i][1]) * (2 + Math.sin(toRad(coords[i][0])) + Math.sin(toRad(coords[j][0])));
    }
    area = Math.abs(area * R * R / 2);
    return area;
}

/* ─── Toolbar Button ─── */
function ToolBtn({ icon, label, active, onClick, disabled, badge }: {
    icon: string; label: string; active?: boolean; onClick: () => void; disabled?: boolean; badge?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem',
                background: active ? 'var(--primary)' : 'rgba(15,23,42,.75)',
                color: active ? 'white' : disabled ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.85)',
                border: active ? '2px solid rgba(255,255,255,.5)' : '1px solid rgba(255,255,255,.15)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                position: 'relative',
                backdropFilter: 'blur(8px)',
            }}
        >
            {icon}
            {badge && (
                <span style={{
                    position: 'absolute', top: -4, right: -4,
                    fontSize: '0.5rem', background: '#f59e0b', color: 'white',
                    padding: '1px 4px', borderRadius: 4, fontWeight: 800,
                }}>{badge}</span>
            )}
        </button>
    );
}

export const MapView = forwardRef<MapViewHandle, Props>(function MapView({ listings, highlightedId, onHighlight }, ref) {
    const router = useRouter();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});
    const clusterGroupRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const heatLayerRef = useRef<any>(null);
    const pinMarkerRef = useRef<any>(null);
    const measureLayerRef = useRef<any>(null);
    const measurePointsRef = useRef<[number, number][]>([]);
    const drawLayerRef = useRef<any>(null);
    const drawPointsRef = useRef<[number, number][]>([]);
    const provinceBorderRef = useRef<any>(null);
    const geoJsonCacheRef = useRef<any>(null);
    const lastView = useRef<{ lat: number; lng: number; zoom: number }>({ lat: 41.015, lng: 28.979, zoom: 12 });
    const LRef = useRef<any>(null);

    const [tileKey, setTileKey] = useState<TileKey>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('arsabil-map-tile') as TileKey) || 'dark';
        }
        return 'dark';
    });
    const [showTileMenu, setShowTileMenu] = useState(false);
    const [pinMode, setPinMode] = useState(false);
    const [heatmapOn, setHeatmapOn] = useState(false);
    const [measureMode, setMeasureMode] = useState(false);
    const [drawMode, setDrawMode] = useState(false);
    const [showBorder, setShowBorder] = useState(false);
    const [pinInfo, setPinInfo] = useState<{ lat: number; lng: number; address?: string; loading: boolean } | null>(null);
    const [measureResult, setMeasureResult] = useState<string>('');
    const [drawResult, setDrawResult] = useState<string>('');

    /* ─── Init Map ─── */
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapRef.current) return;
        let cancelled = false;

        const initMap = async () => {
            const L = (await import('leaflet')).default;
            if (cancelled) return;
            LRef.current = L;

            const container = mapContainerRef.current as any;
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

            // MarkerCluster
            try {
                await import('leaflet.markercluster');
            } catch (e) { /* optional */ }

            if (cancelled) return;

            const clusterGroup = (L as any).markerClusterGroup ? (L as any).markerClusterGroup({
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                iconCreateFunction: (cluster: any) => {
                    const markers = cluster.getAllChildMarkers();
                    const count = markers.length;
                    const avgScore = markers.reduce((s: number, m: any) => s + (m.options.score || 70), 0) / count;
                    const color = avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ff5a5f';
                    return L.divIcon({
                        html: `<div style="
                            background:${color};color:white;
                            width:44px;height:44px;border-radius:50%;
                            display:flex;align-items:center;justify-content:center;
                            font-weight:900;font-size:0.85rem;font-family:Inter,sans-serif;
                            border:3px solid white;
                            box-shadow:0 4px 14px ${color}55;
                        ">${count}</div>`,
                        className: '',
                        iconSize: [44, 44],
                        iconAnchor: [22, 22],
                    });
                },
            }) : L.layerGroup();

            clusterGroupRef.current = clusterGroup;
            map.addLayer(clusterGroup);

            // Add markers to cluster
            listings.forEach((listing, idx) => {
                const lat = listing.lat ?? ISTANBUL_COORDS[idx % ISTANBUL_COORDS.length][0] + (Math.random() - 0.5) * 0.01;
                const lng = listing.lng ?? ISTANBUL_COORDS[idx % ISTANBUL_COORDS.length][1] + (Math.random() - 0.5) * 0.01;
                const score = listing.fizibiliteSkoru ?? Math.floor(55 + Math.random() * 40);
                const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ff5a5f';
                const payiMin = listing.arsaPayiMin ?? 28;
                const payiMax = listing.arsaPayiMax ?? 42;
                const displayText = listing.type === 'SALE'
                    ? (listing.price ? (listing.price / 1000000).toFixed(1) + 'M' : '₺')
                    : `${payiMin}%`;

                const divIcon = L.divIcon({
                    className: '',
                    html: `<div style="
                        position:relative;background:${color};color:white;
                        padding:4px 10px;border-radius:20px;font-size:0.72rem;font-weight:900;
                        white-space:nowrap;box-shadow:0 4px 12px ${color}55;
                        border:2px solid white;cursor:pointer;font-family:Inter,sans-serif;
                        transition:transform 0.15s;
                    ">
                        ${displayText}
                        <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
                            width:0;height:0;border-left:6px solid transparent;
                            border-right:6px solid transparent;border-top:7px solid ${color};
                        "></div>
                    </div>`,
                    iconSize: [55, 30],
                    iconAnchor: [27, 30],
                    popupAnchor: [0, -35],
                });

                const marker = L.marker([lat, lng], { icon: divIcon, score } as any);
                markersRef.current[listing.id] = { marker, lat, lng, score };

                const payStr = listing.type === 'SALE'
                    ? `${(listing.price ?? 0).toLocaleString('tr-TR')} TL`
                    : `%${payiMin}–${payiMax}`;

                const popupHtml = `
                    <div style="font-family:Inter,sans-serif;min-width:220px;">
                        <div style="font-weight:800;font-size:0.9rem;margin-bottom:4px;color:#0b2443;">
                            ${listing.title ?? '820 m²'} · ${listing.type === 'KAT_KARSILIGI' ? 'Kat Karşılığı' : 'Satış'}
                        </div>
                        <div style="font-size:0.75rem;color:#5a7090;margin-bottom:8px;">
                            📍 ${listing.district ?? 'Beşiktaş'}, ${listing.city ?? 'İstanbul'}
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                            <span style="background:${color}22;color:${color};border:1.5px solid ${color};border-radius:6px;padding:2px 8px;font-size:0.75rem;font-weight:800;">${score}/100</span>
                            <span style="font-size:0.8rem;font-weight:700;color:#0b2443;">${payStr}</span>
                        </div>
                        <div style="display:flex;gap:6px;margin-top:8px;">
                            <button onclick="window.location.href='/listing/${listing.id}?tab=scenario'" style="flex:1;padding:6px 8px;background:#6d5bf6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:700;">Senaryo Oluştur</button>
                            <button onclick="window.location.href='/listing/${listing.id}'" style="flex:1;padding:6px 8px;background:#10b98122;color:#10b981;border:1.5px solid #10b981;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:700;">Teklif Ver</button>
                        </div>
                    </div>`;

                marker.bindPopup(L.popup({ maxWidth: 260, autoPan: false }).setContent(popupHtml));
                marker.on('mouseover', () => { onHighlight(listing.id); marker.openPopup(); });
                marker.on('mouseout', () => onHighlight(null));
                marker.on('click', () => { onHighlight(listing.id); marker.openPopup(); });

                clusterGroup.addLayer(marker);
            });
        };

        initMap();
        return () => {
            cancelled = true;
            if (mapRef.current) {
                const c = mapRef.current.getCenter();
                lastView.current = { lat: c.lat, lng: c.lng, zoom: mapRef.current.getZoom() };
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    /* ─── Tile Switcher ─── */
    useEffect(() => {
        if (!mapRef.current || !tileLayerRef.current || !LRef.current) return;
        const L = LRef.current;
        const tile = TILES[tileKey];
        mapRef.current.removeLayer(tileLayerRef.current);
        tileLayerRef.current = L.tileLayer(tile.url, { attribution: tile.attr, maxZoom: 19 }).addTo(mapRef.current);
        localStorage.setItem('arsabil-map-tile', tileKey);
    }, [tileKey]);

    /* ─── Heatmap Toggle ─── */
    useEffect(() => {
        if (!mapRef.current || !LRef.current) return;

        if (heatmapOn) {
            import('leaflet.heat').then(() => {
                const L = LRef.current;
                const points = Object.values(markersRef.current).map((e: any) => [
                    e.lat, e.lng, (e.score || 70) / 100,
                ]);
                if ((L as any).heatLayer) {
                    heatLayerRef.current = (L as any).heatLayer(points, {
                        radius: 35, blur: 25, maxZoom: 15,
                        gradient: { 0.2: '#ff5a5f', 0.5: '#f59e0b', 0.8: '#10b981', 1: '#059669' },
                    }).addTo(mapRef.current);
                }
            }).catch(() => { });
        } else {
            if (heatLayerRef.current && mapRef.current) {
                mapRef.current.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
        }
    }, [heatmapOn]);

    /* ─── Pin Mode Click Handler ─── */
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const container = mapContainerRef.current;

        if (pinMode) {
            if (container) container.style.cursor = 'crosshair';
            const handleClick = async (e: any) => {
                const { lat, lng } = e.latlng;
                const L = LRef.current;
                if (!L) return;

                // Remove old pin
                if (pinMarkerRef.current) map.removeLayer(pinMarkerRef.current);

                // Add red pin
                const pinIcon = L.divIcon({
                    className: '',
                    html: `<div style="font-size:2rem;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4));">📍</div>`,
                    iconSize: [32, 42],
                    iconAnchor: [16, 42],
                    popupAnchor: [0, -42],
                });
                pinMarkerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);

                setPinInfo({ lat, lng, loading: true });

                // Reverse geocode with Nominatim
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=tr`);
                    const data = await res.json();
                    const addr = data.address || {};
                    const address = [addr.neighbourhood || addr.suburb, addr.town || addr.county || addr.city_district, addr.city || addr.state].filter(Boolean).join(', ');
                    setPinInfo({ lat, lng, address: address || data.display_name || 'Bilinmeyen konum', loading: false });

                    pinMarkerRef.current.bindPopup(L.popup({ maxWidth: 280, autoPan: false }).setContent(`
                        <div style="font-family:Inter,sans-serif;">
                            <div style="font-weight:800;font-size:0.85rem;color:#0b2443;margin-bottom:4px;">📍 Seçilen Konum</div>
                            <div style="font-size:0.75rem;color:#5a7090;margin-bottom:6px;">${address || data.display_name}</div>
                            <div style="font-size:0.68rem;color:#94a3b8;margin-bottom:8px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
                            <button onclick="window.location.href='/'" style="width:100%;padding:8px;background:#6d5bf6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:700;">🧮 Fizibilite Raporu Oluştur</button>
                        </div>
                    `)).openPopup();
                } catch {
                    setPinInfo({ lat, lng, address: 'Adres bulunamadı', loading: false });
                }
            };

            map.on('click', handleClick);
            return () => { map.off('click', handleClick); };
        } else {
            if (container) container.style.cursor = '';
            if (pinMarkerRef.current && map) {
                map.removeLayer(pinMarkerRef.current);
                pinMarkerRef.current = null;
            }
            setPinInfo(null);
        }
    }, [pinMode]);

    /* ─── Measure Mode ─── */
    useEffect(() => {
        if (!mapRef.current || !LRef.current) return;
        const map = mapRef.current;
        const L = LRef.current;
        const container = mapContainerRef.current;

        if (measureMode) {
            if (container) container.style.cursor = 'crosshair';
            measurePointsRef.current = [];
            if (measureLayerRef.current) map.removeLayer(measureLayerRef.current);
            measureLayerRef.current = L.layerGroup().addTo(map);
            setMeasureResult('Ölçmek için haritada tıklayın');

            const handleClick = (e: any) => {
                const { lat, lng } = e.latlng;
                const pts = measurePointsRef.current;
                pts.push([lat, lng]);

                // Add dot
                L.circleMarker([lat, lng], {
                    radius: 5, fillColor: '#6d5bf6', color: 'white', weight: 2, fillOpacity: 1,
                }).addTo(measureLayerRef.current);

                if (pts.length > 1) {
                    // Draw line
                    L.polyline(pts, { color: '#6d5bf6', weight: 3, dashArray: '6 4' }).addTo(measureLayerRef.current);

                    // Calculate distance
                    let totalM = 0;
                    for (let i = 1; i < pts.length; i++) {
                        totalM += map.distance(L.latLng(pts[i - 1][0], pts[i - 1][1]), L.latLng(pts[i][0], pts[i][1]));
                    }
                    const formatted = totalM >= 1000 ? `${(totalM / 1000).toFixed(2)} km` : `${totalM.toFixed(0)} m`;
                    setMeasureResult(`📏 ${formatted}`);
                }
            };

            map.on('click', handleClick);
            return () => { map.off('click', handleClick); };
        } else {
            if (container) container.style.cursor = '';
            if (measureLayerRef.current) {
                map.removeLayer(measureLayerRef.current);
                measureLayerRef.current = null;
            }
            measurePointsRef.current = [];
            setMeasureResult('');
        }
    }, [measureMode]);

    /* ─── Polygon Draw Mode ─── */
    useEffect(() => {
        if (!mapRef.current || !LRef.current) return;
        const map = mapRef.current;
        const L = LRef.current;
        const container = mapContainerRef.current;

        if (drawMode) {
            if (container) container.style.cursor = 'crosshair';
            drawPointsRef.current = [];
            if (drawLayerRef.current) map.removeLayer(drawLayerRef.current);
            drawLayerRef.current = L.layerGroup().addTo(map);
            setDrawResult('Bölge çizmek için tıklayın, bitirmek için çift tıklayın');

            const handleClick = (e: any) => {
                const { lat, lng } = e.latlng;
                const pts = drawPointsRef.current;
                pts.push([lat, lng]);

                L.circleMarker([lat, lng], {
                    radius: 4, fillColor: '#f59e0b', color: 'white', weight: 2, fillOpacity: 1,
                }).addTo(drawLayerRef.current);

                if (pts.length > 1) {
                    L.polyline(pts, { color: '#f59e0b', weight: 2, dashArray: '5 3' }).addTo(drawLayerRef.current);
                }
            };

            const handleDblClick = (e: any) => {
                const pts = drawPointsRef.current;
                if (pts.length < 3) return;

                // Close polygon
                if (drawLayerRef.current) map.removeLayer(drawLayerRef.current);
                drawLayerRef.current = L.layerGroup().addTo(map);

                L.polygon(pts, {
                    color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15, weight: 2,
                }).addTo(drawLayerRef.current);

                // Count listings inside polygon
                let count = 0;
                Object.values(markersRef.current).forEach((entry: any) => {
                    if (pointInPolygon(entry.lat, entry.lng, pts)) count++;
                });

                // Calculate area
                const areaM2 = polygonArea(pts);
                const areaStr = areaM2 >= 10000
                    ? `${(areaM2 / 10000).toFixed(1)} hektar`
                    : `${areaM2.toFixed(0)} m²`;
                const donum = (areaM2 / 1000).toFixed(1);

                setDrawResult(`✏️ ${count} ilan bu bölgede · ${areaStr} (${donum} dönüm)`);
                setDrawMode(false);
                if (container) container.style.cursor = '';
            };

            map.on('click', handleClick);
            map.on('dblclick', handleDblClick);

            return () => {
                map.off('click', handleClick);
                map.off('dblclick', handleDblClick);
            };
        } else {
            if (container) container.style.cursor = '';
        }
    }, [drawMode]);

    /* ─── Province Border Toggle ─── */
    useEffect(() => {
        if (!mapRef.current || !LRef.current) return;
        if (!showBorder) {
            if (provinceBorderRef.current) {
                mapRef.current.removeLayer(provinceBorderRef.current);
                provinceBorderRef.current = null;
            }
        }
    }, [showBorder]);

    /* ─── Expose flyTo + showProvinceBorder ─── */
    useImperativeHandle(ref, () => ({
        flyTo: (lat: number, lng: number, zoom = 12) => {
            if (mapRef.current && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                mapRef.current.flyTo([lat, lng], zoom, { duration: 1.5 });
            }
        },
        showProvinceBorder: async (cityName: string) => {
            if (!mapRef.current || !LRef.current) return;
            const map = mapRef.current;
            const L = LRef.current;

            // Remove old border
            if (provinceBorderRef.current) {
                map.removeLayer(provinceBorderRef.current);
                provinceBorderRef.current = null;
            }

            if (!showBorder) return;

            try {
                // Fetch GeoJSON if not cached
                if (!geoJsonCacheRef.current) {
                    const res = await fetch('https://raw.githubusercontent.com/alpers/Turkey-Maps-GeoJSON/master/tr-cities-utf8.json');
                    geoJsonCacheRef.current = await res.json();
                }

                const geojson = geoJsonCacheRef.current;
                if (!geojson?.features) return;

                // Find matching province
                const normalise = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/[İ]/g, 'i').replace(/[ı]/g, 'i');
                const feature = geojson.features.find((f: any) => {
                    const name = f.properties?.name || f.properties?.NAME_1 || '';
                    return normalise(name) === normalise(cityName);
                });

                if (feature) {
                    provinceBorderRef.current = L.geoJSON(feature, {
                        style: {
                            color: '#6d5bf6',
                            fillColor: '#6d5bf6',
                            fillOpacity: 0.08,
                            weight: 2.5,
                            dashArray: '6 3',
                        },
                    }).addTo(map);
                }
            } catch (e) {
                console.warn('Province GeoJSON fetch failed:', e);
            }
        },
    }), [showBorder]);

    /* ─── Sync highlight ─── */
    useEffect(() => {
        if (!mapRef.current) return;
        listings.forEach(listing => {
            const entry = markersRef.current[listing.id];
            if (!entry) return;
            const el = entry.marker.getElement?.();
            if (el) {
                el.style.transform = listing.id === highlightedId ? 'scale(1.25)' : 'scale(1)';
                el.style.zIndex = listing.id === highlightedId ? '1000' : '';
            }
        });
        if (highlightedId && markersRef.current[highlightedId]) {
            markersRef.current[highlightedId].marker.openPopup();
        }
    }, [highlightedId, listings]);

    /* ─── Handlers ─── */
    const deactivateAll = () => { setPinMode(false); setMeasureMode(false); setDrawMode(false); };
    const togglePin = () => { deactivateAll(); setPinMode(p => !p); };
    const toggleMeasure = () => { deactivateAll(); setMeasureMode(p => !p); };
    const toggleDraw = () => { deactivateAll(); setDrawMode(p => !p); };
    const toggleHeatmap = () => setHeatmapOn(p => !p);
    const toggleBorder = () => setShowBorder(p => !p);
    const clearMeasure = () => { setMeasureMode(false); setMeasureResult(''); };
    const clearDraw = () => {
        setDrawResult('');
        if (drawLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(drawLayerRef.current);
            drawLayerRef.current = null;
        }
        drawPointsRef.current = [];
    };

    /* ─── Render ─── */
    return (
        <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 400 }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />

            {/* ─── Toolbar ─── */}
            <div style={{
                position: 'absolute', top: 12, right: 12, zIndex: 999,
                display: 'flex', flexDirection: 'column', gap: 6,
            }}>
                {/* Tile selector */}
                <div style={{ position: 'relative' }}>
                    <ToolBtn icon="🗺️" label="Harita stili" active={showTileMenu} onClick={() => setShowTileMenu(p => !p)} />
                    {showTileMenu && (
                        <div style={{
                            position: 'absolute', top: 0, right: 44,
                            background: 'rgba(15,23,42,.92)', backdropFilter: 'blur(12px)',
                            borderRadius: 10, border: '1px solid rgba(255,255,255,.12)',
                            padding: 4, minWidth: 160, boxShadow: '0 8px 30px rgba(0,0,0,.4)',
                        }}>
                            {(Object.keys(TILES) as TileKey[]).map(k => (
                                <button key={k} onClick={() => { setTileKey(k); setShowTileMenu(false); }}
                                    style={{
                                        display: 'block', width: '100%', textAlign: 'left',
                                        padding: '8px 12px', fontSize: '0.78rem', fontWeight: tileKey === k ? 800 : 500,
                                        color: tileKey === k ? 'var(--primary)' : 'rgba(255,255,255,.8)',
                                        background: tileKey === k ? 'rgba(var(--primary-rgb),.12)' : 'transparent',
                                        border: 'none', cursor: 'pointer', borderRadius: 6,
                                        fontFamily: 'inherit', transition: 'all 0.1s',
                                    }}
                                >{TILES[k].label} {tileKey === k && '✓'}</button>
                            ))}
                        </div>
                    )}
                </div>

                <ToolBtn icon="📍" label="Parsel pinle" active={pinMode} onClick={togglePin} />
                <ToolBtn icon="🔥" label="Isı haritası" active={heatmapOn} onClick={toggleHeatmap} />
                <ToolBtn icon="📐" label="Mesafe ölç" active={measureMode} onClick={toggleMeasure} />
                <ToolBtn icon="✏️" label="Bölge çiz" active={drawMode} onClick={toggleDraw} />
                <ToolBtn icon="🗺" label="İl sınırı" active={showBorder} onClick={toggleBorder} />
                <ToolBtn icon="📏" label="Kadastro" disabled onClick={() => { }} badge="Yakında" />
            </div>

            {/* ─── Pin Info Card ─── */}
            {pinInfo && (
                <div style={{
                    position: 'absolute', bottom: 16, left: 16, zIndex: 999,
                    background: 'rgba(15,23,42,.92)', backdropFilter: 'blur(12px)',
                    borderRadius: 14, padding: '14px 18px', minWidth: 240,
                    border: '1px solid rgba(255,255,255,.12)',
                    boxShadow: '0 8px 30px rgba(0,0,0,.4)',
                    color: 'white', fontFamily: 'Inter,sans-serif',
                }}>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>📍 Pinlenen Konum</div>
                    {pinInfo.loading ? (
                        <div style={{ fontSize: '0.82rem' }}>Adres yükleniyor…</div>
                    ) : (
                        <>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>{pinInfo.address}</div>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,.5)' }}>
                                {pinInfo.lat.toFixed(6)}, {pinInfo.lng.toFixed(6)}
                            </div>
                        </>
                    )}
                    <button
                        onClick={() => { setPinMode(false); router.push('/'); }}
                        style={{
                            marginTop: 10, width: '100%', padding: '8px 0',
                            background: 'var(--primary)', color: 'white', border: 'none',
                            borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                        }}
                    >🧮 Fizibilite Raporu Oluştur</button>
                </div>
            )}

            {/* ─── Measure Result ─── */}
            {measureResult && (
                <div style={{
                    position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 999,
                    background: 'rgba(15,23,42,.92)', backdropFilter: 'blur(12px)',
                    borderRadius: 10, padding: '8px 16px',
                    border: '1px solid rgba(255,255,255,.12)',
                    color: 'white', fontSize: '0.82rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,.3)',
                }}>
                    {measureResult}
                    <button onClick={clearMeasure} style={{
                        background: 'rgba(255,255,255,.15)', border: 'none', color: 'white',
                        borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '0.7rem',
                    }}>✕ Temizle</button>
                </div>
            )}

            {/* ─── Draw Result ─── */}
            {drawResult && (
                <div style={{
                    position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 999,
                    background: 'rgba(15,23,42,.92)', backdropFilter: 'blur(12px)',
                    borderRadius: 10, padding: '8px 16px',
                    border: '1px solid rgba(245,158,11,.3)',
                    color: 'white', fontSize: '0.82rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,.3)',
                }}>
                    {drawResult}
                    <button onClick={clearDraw} style={{
                        background: 'rgba(255,255,255,.15)', border: 'none', color: 'white',
                        borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '0.7rem',
                    }}>✕ Temizle</button>
                </div>
            )}
        </div>
    );
});
