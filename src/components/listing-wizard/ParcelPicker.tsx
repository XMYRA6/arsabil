'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Marker, Polygon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLeafletMap } from '@/lib/hooks/useLeafletMap'
import type { ParcelInfo } from '@/lib/tkgm/parcel'
import { formatParcelIdentity } from '@/lib/listing/listingDisplay'
import styles from './ParcelPicker.module.css'

export type ParcelPickerStatus = 'idle' | 'verified' | 'not_found' | 'unavailable' | 'unauthorized'

export interface ParcelPickerHandle {
    placePin: (lat: number, lng: number) => void
}

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
     * sihirbazına ("İlanın...") özgüdür; /hesapla gibi ilan üretmeyen
     * bağlamlar kendi metnini geçer. Verilmezse mevcut sihirbaz çıktısı
     * bayt bayt aynı kalır.
     */
    notFoundText?: string
    unavailableText?: string
    className?: string
    mapClassName?: string
}

const DEFAULT_HINT =
    'Arsanın bulunduğu noktaya haritadan tıkla. Konum, ilanın haritada doğru görünmesi için zorunludur.'

const DEFAULT_NOT_FOUND_TEXT =
    'Bu noktada kayıtlı parsel bulunamadı. Pini parselin içine taşı — yol, dere veya kadastro dışı ' +
    'bir noktaya denk gelmiş olabilir. Doğrulamadan da devam edebilirsin.'

const DEFAULT_UNAVAILABLE_TEXT =
    'TKGM servisi şu an yanıt vermiyor. İlanın doğrulanmadan yayınlanabilir, daha sonra tekrar ' +
    'deneyebilirsin.'

const TURKEY_CENTER: [number, number] = [39.0, 35.0]

export const ParcelPicker = forwardRef<ParcelPickerHandle, Props>(function ParcelPicker({
    value,
    onChange,
    hint = DEFAULT_HINT,
    notFoundText = DEFAULT_NOT_FOUND_TEXT,
    unavailableText = DEFAULT_UNAVAILABLE_TEXT,
    className,
    mapClassName,
}, ref) {
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
                // Esri uydu görüntüsü çoğu kırsal alanda 18. seviyenin ötesinde karo üretmez ve
                // "Map data not yet available" yer tutucusu döner. 18'e kadar gerçek karo,
                // ötesinde (yakınlaştırdıkça 21'e kadar) son gerçek karo büyütülür.
                maxNativeZoom: 18,
                maxZoom: 21,
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
        let resizeObserver: ResizeObserver | undefined
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
            // TKGM dogrulanan parsel sinirini kirmizi ile gosteriyor — gorsel
            // dilimizi TKGM'ninkiyle tutarli tutmak icin ayni renk (kullanici
            // bulgusu: onceki yesil #10b981 TKGM'nin gosterdigiyle tutarsizdi).
            polygonRef.current = L.polygon(ring, { color: '#ef4444', weight: 2, fillOpacity: 0.12 }).addTo(map)
            // Sheet/modal yerleşimi doğrulamayla birlikte değişir (sonuç ve risk kartları eklenir,
            // harita kutusu yeniden boyutlanır). Boyut güncellenmeden sınıra sığdırmak sınırın
            // kırpılmış görünmesine yol açıyordu; önce ölçüyü yenile, sonra sığdır.
            const poly = polygonRef.current
            const sigdir = () => {
                if (cancelled || !mapRef.current) return
                map.invalidateSize()
                map.fitBounds(poly.getBounds(), { padding: [24, 24] })
            }
            requestAnimationFrame(sigdir)
            // Doğrulamadan sonra altta sonuç/risk kartları belirdikçe harita kutusu küçülür;
            // her boyut değişiminde sınırı yeniden sığdır ki kırmızı çizgi kırpılmasın.
            if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
                resizeObserver = new ResizeObserver(sigdir)
                resizeObserver.observe(containerRef.current)
            }
        })()
        return () => { cancelled = true; resizeObserver?.disconnect() }
    }, [mapReady, value.parcel])

    const handleUseMyLocation = () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setGeoError('Tarayıcın konum tespitini desteklemiyor. Haritadan elle işaretleyebilirsin.')
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
                setGeoError('Konum izni alınamadı. Haritadan elle işaretleyebilirsin.')
            },
            { enableHighAccuracy: true, timeout: 10000 },
        )
    }

    // Artik haritaya tiklamak zaten otomatik dogrular (bkz. `verifyAt` +
    // map.on('click', ...)) — bu buton, dogrulanmis bir noktayi (ornegin
    // TKGM verisi o an degismisse) elle YENIDEN sorgulamak icin kalir.
    const handleVerify = () => {
        if (value.lat == null || value.lng == null) return
        void verifyAt(value.lat, value.lng)
    }

    return (
        <div className={`${styles.wrapper} ${className || ''}`}>
            <div className={styles.mapWrapper}>
                <div
                    ref={containerRef}
                    className={`${styles.mapBox} ${mapClassName || ''}`}
                    style={{ cursor: verifying ? 'wait' : 'crosshair' }}
                />
                <button
                    type="button"
                    className={styles.locateBtn}
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    aria-label={locating ? 'Konum bulunuyor' : 'Konumumu bul'}
                >
                    {locating ? (
                        <span className={styles.locateSpinner} aria-hidden="true" />
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        </svg>
                    )}
                </button>
            </div>

            {geoError && <div className={styles.warnCard}>{geoError}</div>}

            {hint && <p className={styles.hint}>{hint}</p>}

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
                    Parsel doğrulama için giriş yapman gerekiyor. Giriş yaptıktan sonra tekrar deneyebilirsin.
                </div>
            )}

        </div>
    )
})
