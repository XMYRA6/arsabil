'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker, Polygon } from 'leaflet'
import type { ParcelInfo } from '@/lib/tkgm/parcel'
import { formatParcelIdentity } from '@/lib/listing/listingDisplay'
import { ManualParcelEntryModal, type ManualParcelReference } from './ManualParcelEntryModal'
import styles from './ParcelPicker.module.css'

export type ParcelPickerStatus = 'idle' | 'verified' | 'not_found' | 'unavailable' | 'unauthorized'

export type ParcelPickerValue = {
    lat: number | null
    lng: number | null
    parcel: ParcelInfo | null
    status: ParcelPickerStatus
}

interface Props {
    value: ParcelPickerValue
    onChange: (patch: Partial<ParcelPickerValue>) => void
    /**
     * Harita üstü yardım metni. Varsayılan, ilan sihirbazındaki (konumun
     * zorunlu olduğu) metindir; farklı bağlamlarda (ör. konumun opsiyonel
     * olduğu /hesapla) çağıran taraf kendi metnini geçebilir.
     */
    hint?: string
    /**
     * `not_found` / `unavailable` sonuç kartlarının metni. Varsayılanlar ilan
     * sihirbazına ("İlanınız...") özgüdür; /hesapla gibi ilan üretmeyen
     * bağlamlar kendi metnini geçer. Verilmezse mevcut sihirbaz çıktısı
     * bayt bayt aynı kalır.
     */
    notFoundText?: string
    unavailableText?: string
    className?: string
    mapClassName?: string
}

const DEFAULT_HINT =
    'Arsanızın bulunduğu noktaya haritadan tıklayın. Konum, ilanın haritada doğru görünmesi için zorunludur.'

const DEFAULT_NOT_FOUND_TEXT =
    'Bu noktada kayıtlı parsel bulunamadı. Pini parselin içine taşıyın — yol, dere veya kadastro dışı ' +
    'bir noktaya denk gelmiş olabilir. Doğrulamadan da devam edebilirsiniz.'

const DEFAULT_UNAVAILABLE_TEXT =
    'TKGM servisi şu an yanıt vermiyor. İlanınız doğrulanmadan yayınlanabilir, daha sonra tekrar ' +
    'deneyebilirsiniz.'

const TURKEY_CENTER: [number, number] = [39.0, 35.0]

export function ParcelPicker({
    value,
    onChange,
    hint = DEFAULT_HINT,
    notFoundText = DEFAULT_NOT_FOUND_TEXT,
    unavailableText = DEFAULT_UNAVAILABLE_TEXT,
    className,
    mapClassName,
}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<LeafletMap | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const markerRef = useRef<Marker | null>(null)
    const polygonRef = useRef<Polygon | null>(null)
    // Harita kurulum effect'i icinde tanimlanan, disaridan (geolocation
    // butonu, elle giris modali) cagirilabilen pin-koyma fonksiyonu. Effect
    // sadece bir kez calistigi icin `map` closure'ini burada disari tasiyoruz.
    const placePinRef = useRef<((lat: number, lng: number) => void) | null>(null)
    const [verifying, setVerifying] = useState(false)
    const [locating, setLocating] = useState(false)
    const [geoError, setGeoError] = useState<string | null>(null)
    const [manualModalOpen, setManualModalOpen] = useState(false)
    const [manualRef, setManualRef] = useState<ManualParcelReference | null>(null)
    // Harita async kuruluyor (dinamik leaflet import'u). Marker ve poligon
    // effect'leri ilk calismalarinda mapRef.current'i HENUZ bulamaz; bu bayrak
    // olmadan sessizce hicbir sey yapip bir daha calismiyorlardi.
    const [mapReady, setMapReady] = useState(false)

    // onChange'i ref'te tut: harita effect'i bir kez çalışsın, her render'da yeniden kurulmasın
    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

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
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
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
            setMapReady(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- harita yalnızca bir kez kurulur
    }, [])

    /* Disaridan gelen konum icin marker (duzenleme sayfasi, adima geri donus) */
    // Marker YALNIZCA map.on('click') icinde olusturuluyordu; kayitli bir
    // konumla mount edilen bilesen (edit sayfasi) dogru noktaya odaklaniyor
    // ama PIN GOSTERMIYORDU.
    useEffect(() => {
        const map = mapRef.current
        if (!mapReady || !map || value.lat == null || value.lng == null) return
        let cancelled = false
        void (async () => {
            const L = await import('leaflet')
            if (cancelled || !mapRef.current) return
            const pinIcon = L.divIcon({
                className: '',
                html: '<div style="font-size:1.9rem;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4));">📍</div>',
                iconSize: [30, 40],
                iconAnchor: [15, 40],
            })
            if (markerRef.current) map.removeLayer(markerRef.current)
            markerRef.current = L.marker([value.lat!, value.lng!], { icon: pinIcon }).addTo(map)
        })()
        return () => { cancelled = true }
    }, [mapReady, value.lat, value.lng])

    /* Doğrulanan parselin sınırını çiz */
    useEffect(() => {
        const map = mapRef.current
        if (!mapReady || !map || !value.parcel) return
        let cancelled = false
        void (async () => {
            const L = await import('leaflet')
            if (cancelled || !mapRef.current) return
            if (polygonRef.current) map.removeLayer(polygonRef.current)
            // GeoJSON [lng, lat] → Leaflet [lat, lng]
            // Bos/bozuk halka: coordinates[0] yoksa .map() burada patlar ve
            // hata void'lenmis async IIFE icinde sessizce yutulurdu.
            const rawRing = value.parcel!.geometry.coordinates?.[0]
            if (!Array.isArray(rawRing) || rawRing.length < 3) return
            const ring = rawRing.map(([lng, lat]) => [lat, lng] as [number, number])
            polygonRef.current = L.polygon(ring, { color: '#10b981', weight: 2, fillOpacity: 0.12 }).addTo(map)
            map.fitBounds(polygonRef.current.getBounds(), { padding: [24, 24] })
        })()
        return () => { cancelled = true }
    }, [mapReady, value.parcel])

    const handleUseMyLocation = () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setGeoError('Tarayıcınız konum tespitini desteklemiyor. Haritadan elle işaretleyebilirsiniz.')
            return
        }
        setGeoError(null)
        setLocating(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocating(false)
                placePinRef.current?.(pos.coords.latitude, pos.coords.longitude)
            },
            () => {
                setLocating(false)
                setGeoError('Konum izni alınamadı. Haritadan elle işaretleyebilirsiniz.')
            },
            { enableHighAccuracy: true, timeout: 10000 },
        )
    }

    const handleManualLocationFound = (lat: number, lng: number, reference: ManualParcelReference) => {
        setManualRef(reference)
        placePinRef.current?.(lat, lng)
    }

    const handleVerify = async () => {
        if (value.lat == null || value.lng == null) return
        setVerifying(true)
        try {
            const res = await fetch(`/api/parcel/lookup?lat=${value.lat}&lng=${value.lng}`)
            // /hesapla auth-gated degil ama /api/parcel/lookup anonim kullaniciya
            // 401 doner. Bunu 'unavailable' (TKGM cevap vermiyor) ile karistirmak
            // kullaniciya yanlis teshis verir — asil sebep oturum acmamis olmasi.
            if (res.status === 401) {
                onChange({ parcel: null, status: 'unauthorized' })
                return
            }
            const data = await res.json()
            if (data.status === 'verified' && data.parcel) {
                onChange({ parcel: data.parcel, status: 'verified' })
            } else {
                onChange({ parcel: null, status: data.status === 'not_found' ? 'not_found' : 'unavailable' })
            }
        } catch {
            onChange({ parcel: null, status: 'unavailable' })
        } finally {
            setVerifying(false)
        }
    }

    return (
        <div className={`${styles.wrapper} ${className || ''}`}>
            <div
                ref={containerRef}
                className={`${styles.mapBox} ${mapClassName || ''}`}
                style={{ cursor: verifying ? 'wait' : 'crosshair' }}
            />

            <div className={styles.entryRow}>
                <button
                    type="button"
                    className={styles.entryBtn}
                    onClick={handleUseMyLocation}
                    disabled={locating}
                >
                    {locating ? 'Konum bulunuyor…' : '📍 Konumumu Bul'}
                </button>
                <button
                    type="button"
                    className={styles.entryBtn}
                    onClick={() => setManualModalOpen(true)}
                >
                    ✍️ Elle Gir
                </button>
            </div>

            {geoError && <div className={styles.warnCard}>{geoError}</div>}

            <p className={styles.hint}>{hint}</p>

            <div className={styles.coordRow}>
                {value.lat != null && value.lng != null && (
                    <span>📍 {value.lat.toFixed(6)}, {value.lng.toFixed(6)}</span>
                )}
                <button
                    type="button"
                    className={styles.verifyBtn}
                    disabled={value.lat == null || verifying}
                    onClick={handleVerify}
                >
                    {verifying ? 'Sorgulanıyor…' : 'Parseli Doğrula'}
                </button>
            </div>

            {value.status === 'verified' && value.parcel && (
                <div className={styles.resultCard}>
                    <div className={styles.resultTitle}>
                        {formatParcelIdentity({
                            adaNo: value.parcel.adaNo,
                            parselNo: value.parcel.parselNo,
                            neighborhood: null,
                        })}
                    </div>
                    <div className={styles.resultMeta}>
                        {value.parcel.mahalle} · {value.parcel.quality} · {value.parcel.areaSqm.toLocaleString('tr-TR')} m²
                    </div>
                    <div className={styles.resultMeta}>TKGM kaydıyla eşleşti.</div>
                </div>
            )}

            {value.status === 'not_found' && (
                <div className={styles.warnCard}>
                    {notFoundText}
                </div>
            )}

            {value.status === 'unavailable' && (
                <div className={styles.warnCard}>
                    {unavailableText}
                </div>
            )}

            {value.status === 'unauthorized' && (
                <div className={styles.warnCard}>
                    Parsel doğrulama için giriş yapmanız gerekiyor. Giriş yaptıktan sonra tekrar deneyebilirsiniz.
                </div>
            )}

            {manualRef && (
                <div className={styles.manualNote}>
                    Kullanıcı beyanı: {[
                        manualRef.mahalle && `${manualRef.mahalle} Mah.`,
                        manualRef.ada && `Ada ${manualRef.ada}`,
                        manualRef.parsel && `Parsel ${manualRef.parsel}`,
                    ].filter(Boolean).join(', ') || `${manualRef.ilce}, ${manualRef.il}`} — TKGM sonucuyla karşılaştırın.
                </div>
            )}

            <ManualParcelEntryModal
                isOpen={manualModalOpen}
                onClose={() => setManualModalOpen(false)}
                onLocationFound={handleManualLocationFound}
            />
        </div>
    )
}
