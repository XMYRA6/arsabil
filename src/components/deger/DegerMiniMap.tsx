'use client'

import 'leaflet/dist/leaflet.css'
import { useRef } from 'react'
import { useLeafletMap } from '@/lib/hooks/useLeafletMap'
import { polygonCentroid } from '@/lib/geo/polygonCentroid'
import type { GeoJSONPolygon } from '@/lib/tkgm/parcel'
import styles from './DegerMiniMap.module.css'

// MapView TILES.light ile aynı — statik, etkileşimsiz mini-harita.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
// Leaflet SVG/canvas render eder; CSS var() BURADA ÇÖZÜLMEZ — ArsaBil mavisi literal.
const ARSABIL_BLUE = '#0a5cff'

interface Props {
  parcelGeometry: GeoJSONPolygon
  neighborhoodGeojson: unknown | null
}

export function DegerMiniMap({ parcelGeometry, neighborhoodGeojson }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const centroid = polygonCentroid(parcelGeometry)

  useLeafletMap(containerRef, {
    center: centroid ? [centroid.lat, centroid.lng] : [39, 35],
    zoom: 15,
    leafletMapOptions: {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      attributionControl: false,
      keyboard: false,
    },
    observeResize: false,
    onReady: (map, L) => {
      L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(map)

      // Mahalle sınırı önce çizilir (parselin altında kalsın): ince kesikli, dolgusuz.
      // Bozuk bir crawled `geojson` satırı → "sınır yok"a düşsün, ASLA boş haritaya.
      if (neighborhoodGeojson) {
        try {
          L.geoJSON(neighborhoodGeojson as Parameters<typeof L.geoJSON>[0], {
            style: () => ({ color: ARSABIL_BLUE, weight: 1, dashArray: '3 3', fill: false }),
          }).addTo(map)
        } catch (e) {
          console.error('mahalle sınırı çizilemedi (atlandı):', e)
        }
      }

      // Parsel: dolu ArsaBil mavisi + haritayı ona sığdır.
      const parcelLayer = L.geoJSON(parcelGeometry as Parameters<typeof L.geoJSON>[0], {
        style: () => ({ color: ARSABIL_BLUE, weight: 2, fillOpacity: 0.15 }),
      })
      parcelLayer.addTo(map)
      try {
        map.fitBounds(parcelLayer.getBounds(), { padding: [16, 16] })
      } catch {
        // Boş/geçersiz geometri → fitBounds atar; merkez zaten centroid'e ayarlı.
      }
    },
  })

  return <div ref={containerRef} className={styles.map} data-testid="deger-map" />
}
