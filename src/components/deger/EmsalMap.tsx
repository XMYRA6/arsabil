'use client'

import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { useRef } from 'react'
import type { GeoJSON as LeafletGeoJSON } from 'leaflet'
import { useLeafletMap } from '@/lib/hooks/useLeafletMap'
import type { Comparable } from '@/lib/deger/comparables'
import type { GeoJSONPolygon } from '@/lib/tkgm/parcel'
import styles from './EmsalMap.module.css'

// Leaflet SVG/canvas render eder; CSS var() BURADA ÇÖZÜLMEZ — literal renkler.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '© OpenStreetMap, © CARTO'
const ARSABIL_BLUE = '#0a5cff'
const BOUNDARY_GREY = '#6e6e73'

export interface EmsalMapProps {
  parcelGeometry: GeoJSONPolygon
  neighborhoodGeojson: unknown | null
  comparables: Comparable[]
  center: { lat: number; lng: number }
  onClose: () => void
}

function popupHtml(c: Comparable): string {
  return `<b>${c.pricePerSqm?.toLocaleString('tr-TR') ?? '—'} ₺/m²</b><br>${c.areaSqm ?? '—'} m²<br>${c.approxDistance ? '~ yaklaşık konum (mahalle)' : ''}<br><a href="${c.sourceUrl}" target="_blank" rel="noopener nofollow">Emlakjet ↗</a>`
}

export function EmsalMap({
  parcelGeometry,
  neighborhoodGeojson,
  comparables,
  center,
  onClose,
}: EmsalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useLeafletMap(containerRef, {
    center: [center.lat, center.lng],
    zoom: 15,
    onReady: async (map, L) => {
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map)

      const pj = L.geoJSON(parcelGeometry as Parameters<typeof L.geoJSON>[0], {
        style: { color: ARSABIL_BLUE, weight: 2, fillOpacity: 0.15 },
      }).addTo(map)

      if (neighborhoodGeojson) {
        // Bozuk crawled `geojson` → "sınır yok"a düşsün, ASLA boş haritaya.
        try {
          L.geoJSON(neighborhoodGeojson as Parameters<typeof L.geoJSON>[0], {
            style: { color: BOUNDARY_GREY, weight: 1, dashArray: '4 3', fill: false },
          }).addTo(map)
        } catch (e) {
          console.error('mahalle sınırı çizilemedi (atlandı):', e)
        }
      }

      try {
        await import('leaflet.markercluster')
      } catch {
        /* optional — markerClusterGroup yoksa layerGroup'a düşülür */
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet.markercluster dinamik import ile L namespace augmentation uygulanmıyor
      const cluster = (L as any).markerClusterGroup
        ? (L as any).markerClusterGroup()
        : (L as any).layerGroup()
      for (const c of comparables) {
        const marker = L.marker(
          [c.lat, c.lng],
          c.approxDistance ? { opacity: 0.6 } : undefined,
        ).bindPopup(popupHtml(c))
        cluster.addLayer(marker)
      }
      cluster.addTo(map)

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cluster leaflet.markercluster tipi L namespace'te yok
        const bounds = L.featureGroup([pj as LeafletGeoJSON, cluster as any]).getBounds()
        map.fitBounds(bounds, { padding: [24, 24] })
      } catch {
        // Boş/geçersiz geometri → fitBounds atar; merkez zaten center'a ayarlı.
      }
    },
  })

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.close}
        aria-label="Kapat"
        onClick={onClose}
      >
        ✕
      </button>
      <div ref={containerRef} className={styles.container} data-testid="emsal-map" />
    </div>
  )
}
