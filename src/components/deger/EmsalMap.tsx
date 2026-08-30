'use client'

// GEÇİCİ İSKELE — Task 9 (`EmsalMap` tam etkileşimli harita) bu dosyayı
// gerçek Leaflet + markercluster implementasyonuyla DEĞİŞTİRİR. Task 8'in
// `DegerKarti` içindeki `dynamic(() => import('./EmsalMap'))` çağrısının
// tsc + `npm run build` gate'ini geçebilmesi için tipli bir yer tutucu.

import type { Comparable } from '@/lib/deger/comparables'

export interface EmsalMapProps {
  parcelGeometry: unknown
  neighborhoodGeojson: unknown | null
  comparables: Comparable[]
  center: { lat: number; lng: number }
  onClose: () => void
}

export function EmsalMap({ onClose }: EmsalMapProps) {
  return (
    <div role="dialog" aria-label="Emsal ilan haritası">
      <button type="button" aria-label="Kapat" onClick={onClose}>
        Kapat
      </button>
    </div>
  )
}
