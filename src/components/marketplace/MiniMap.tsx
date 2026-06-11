"use client";

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

interface Props {
    lat: number;
    lng: number;
    label?: string;
    listingId?: string;
}

export function MiniMap({ lat, lng, label, listingId }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const init = async () => {
            const L = (await import('leaflet')).default;

            const el = containerRef.current;
            if (!el) return;
            if ((el as any)._leaflet_id) (el as any)._leaflet_id = undefined;

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

            // Accuracy circle
            L.circle([lat, lng], {
                radius: 80,
                color: '#6d5bf6',
                fillColor: '#6d5bf6',
                fillOpacity: 0.1,
                weight: 1.5,
                dashArray: '4 3',
            }).addTo(map);

            mapRef.current = map;
        };

        init();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [lat, lng]);

    return (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
            <div ref={containerRef} style={{ width: '100%', height: 180 }} />
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
