'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './ManualParcelEntryForm.module.css'
import { TkgmAutocompleteField, type IdariYapiItem } from './TkgmAutocompleteField'
import type { MahalleItem } from '@/lib/tkgm/idariYapi'
import type { ParcelInfo } from '@/lib/tkgm/parcel'
import { polygonCentroid } from '@/lib/geo/polygonCentroid'
import { pointInPolygon } from '@/lib/geo/pointInPolygon'

export type ManualParcelReference = {
    il: string
    ilce: string
    mahalle: string
    ada: string
    parsel: string
}

interface Props {
    onLocationFound: (lat: number, lng: number, reference: ManualParcelReference, exactParcel?: ParcelInfo) => void
}

/** TKGM idari-yapi fetch'lerinde 429 (rate limit) durumunu ayirt etmek icin. */
class TkgmTooManyRequestsError extends Error {
    constructor() { super('TKGM_TOO_MANY_REQUESTS') }
}

async function fetchIdariYapiJson(url: string): Promise<unknown> {
    const res = await fetch(url)
    if (res.status === 429) throw new TkgmTooManyRequestsError()
    return res.json()
}

type FetchErrorKind = 'generic' | 'rateLimit' | null

// 7 hane, gercek bir Turkiye ada/parsel numarasindan cok daha fazlasini
// karsilar; TKGM'ye giden URL'in uzunlugunu sinirlar (bkz. route.ts'teki
// ayni desen — iki taraf da senkron tutulmali).
const ADA_PARSEL_PATTERN = /^\d{1,7}$/

const RATE_LIMIT_MESSAGE = 'Çok fazla istek yapıldı, birkaç saniye sonra tekrar deneyin.'

function errorNoteText(kind: FetchErrorKind, generic: string): string {
    return kind === 'rateLimit' ? RATE_LIMIT_MESSAGE : generic
}

// İl listesi pratikte hiç değişmiyor; bu bileşen "Haritadan"/"Elle gir" modu
// arasında geçişte defalarca mount/unmount olabiliyor (bkz. ParcelVerificationSheet).
// Modül seviyesinde TEK bir paylaşılan promise ile, aynı sayfa oturumu içindeki
// tekrar mount'lar il listesini yeniden çekmez.
let cachedIlListPromise: Promise<IdariYapiItem[]> | null = null

function loadIlListOnce(): Promise<IdariYapiItem[]> {
    if (!cachedIlListPromise) {
        cachedIlListPromise = fetchIdariYapiJson('/api/tkgm/il')
            .then(data => {
                const iller = (data as { iller?: unknown }).iller
                if (!Array.isArray(iller)) return Promise.reject(new Error('beklenmeyen yanit sekli'))
                return iller as IdariYapiItem[]
            })
            .catch(err => {
                // basarisiz denemeyi onbellekte tutma — "Tekrar dene" gercekten yeniden ceksin
                cachedIlListPromise = null
                throw err
            })
    }
    return cachedIlListPromise
}

/** Yalnizca testler icin: modul-seviyesi il listesi onbellegini sifirlar. */
export function __resetIlListCacheForTests(): void {
    cachedIlListPromise = null
}

export function ManualParcelEntryForm({ onLocationFound }: Props) {
    const [ilText, setIlText] = useState('')
    const [il, setIl] = useState<IdariYapiItem | null>(null)
    const [ilceText, setIlceText] = useState('')
    const [ilce, setIlce] = useState<MahalleItem | null>(null)
    const [mahalleText, setMahalleText] = useState('')
    const [mahalle, setMahalle] = useState<MahalleItem | null>(null)
    const [ada, setAda] = useState('')
    const [parsel, setParsel] = useState('')

    const [iller, setIller] = useState<IdariYapiItem[]>([])
    const [ilceler, setIlceler] = useState<MahalleItem[]>([])
    const [mahalleler, setMahalleler] = useState<MahalleItem[]>([])
    const [ilceLoading, setIlceLoading] = useState(false)
    const [mahalleLoading, setMahalleLoading] = useState(false)

    const [ilFetchError, setIlFetchError] = useState<FetchErrorKind>(null)
    const [ilceFetchError, setIlceFetchError] = useState<FetchErrorKind>(null)
    const [mahalleFetchError, setMahalleFetchError] = useState<FetchErrorKind>(null)

    const [searching, setSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Kaskad seviyeleri icin istek nesli sayaci — gec gelen (eski) bir
    // cevabin daha yeni bir secimin sonucunu ezmesini engeller.
    const ilceRequestIdRef = useRef(0)
    const mahalleRequestIdRef = useRef(0)

    const loadIller = useCallback(() => {
        setIlFetchError(null)
        void loadIlListOnce()
            .then(list => setIller(list))
            .catch(err => {
                setIlFetchError(err instanceof TkgmTooManyRequestsError ? 'rateLimit' : 'generic')
            })
    }, [])

    useEffect(() => { loadIller() }, [loadIller])

    const loadIlceler = useCallback((ilId: number) => {
        const myRequestId = ++ilceRequestIdRef.current
        setIlceFetchError(null)
        setIlceLoading(true)
        void (async () => {
            try {
                const data = await fetchIdariYapiJson(`/api/tkgm/ilce?ilId=${ilId}`)
                if (myRequestId !== ilceRequestIdRef.current) return
                const list = (data as { ilceler?: unknown }).ilceler
                if (Array.isArray(list)) {
                    setIlceler(list as MahalleItem[])
                } else {
                    setIlceler([])
                    setIlceFetchError('generic')
                }
                setIlceLoading(false)
            } catch (err) {
                if (myRequestId !== ilceRequestIdRef.current) return
                setIlceler([])
                setIlceFetchError(err instanceof TkgmTooManyRequestsError ? 'rateLimit' : 'generic')
                setIlceLoading(false)
            }
        })()
    }, [])

    const loadMahalleler = useCallback((ilceId: number) => {
        const myRequestId = ++mahalleRequestIdRef.current
        setMahalleFetchError(null)
        setMahalleLoading(true)
        void (async () => {
            try {
                const data = await fetchIdariYapiJson(`/api/tkgm/mahalle?ilceId=${ilceId}`)
                if (myRequestId !== mahalleRequestIdRef.current) return
                const list = (data as { mahalleler?: unknown }).mahalleler
                if (Array.isArray(list)) {
                    setMahalleler(list as MahalleItem[])
                } else {
                    setMahalleler([])
                    setMahalleFetchError('generic')
                }
                setMahalleLoading(false)
            } catch (err) {
                if (myRequestId !== mahalleRequestIdRef.current) return
                setMahalleler([])
                setMahalleFetchError(err instanceof TkgmTooManyRequestsError ? 'rateLimit' : 'generic')
                setMahalleLoading(false)
            }
        })()
    }, [])

    const handleIlSelect = (item: IdariYapiItem) => {
        setIl(item)
        setIlText(item.text)
        setIlceText('')
        setIlce(null)
        setMahalleText('')
        setMahalle(null)
        setIlceler([])
        setMahalleler([])
        loadIlceler(item.id)
    }

    const handleIlceSelect = (item: IdariYapiItem) => {
        const found = ilceler.find(x => x.id === item.id) ?? { ...item, centroid: null }
        setIlce(found)
        setIlceText(found.text)
        setMahalleText('')
        setMahalle(null)
        setMahalleler([])
        loadMahalleler(item.id)
    }

    const handleMahalleSelect = (item: IdariYapiItem) => {
        const found = mahalleler.find(m => m.id === item.id) ?? { ...item, centroid: null }
        setMahalle(found)
        setMahalleText(found.text)
    }

    // Kullanici bir secim yaptiktan SONRA metni degistirip yeni bir esleme
    // olusturmazsa (ornegin "Ankar" yazip birakirsa), o seviyenin secili-oge
    // state'i eski (artik gecersiz) degeri tutmaya devam etmemeli — aksi halde
    // ekranda gorunen metin ile Sorgula'nin kullandigi deger birbirinden sapar.
    // Programatik secimler (handle*Select) onInputChange'i degil dogrudan
    // setText'i cagirdigi icin bu kontrol yalnizca GERCEK kullanici yazimini
    // yakalar.
    const handleIlTextChange = (text: string) => {
        setIlText(text)
        if (il && text !== il.text) {
            setIl(null)
            setIlce(null)
            setIlceText('')
            setMahalle(null)
            setMahalleText('')
            setIlceler([])
            setMahalleler([])
        }
    }

    const handleIlceTextChange = (text: string) => {
        setIlceText(text)
        if (ilce && text !== ilce.text) {
            setIlce(null)
            setMahalle(null)
            setMahalleText('')
            setMahalleler([])
        }
    }

    const handleMahalleTextChange = (text: string) => {
        setMahalleText(text)
        if (mahalle && text !== mahalle.text) {
            setMahalle(null)
        }
    }

    const canSearch = il !== null && ilce !== null && !searching

    const handleSearch = async () => {
        if (!canSearch || !il || !ilce) return
        setSearching(true)
        setError(null)
        try {
            const adaTrimmed = ada.trim()
            const parselTrimmed = parsel.trim()
            const reference: ManualParcelReference = {
                // mahalle SADECE TKGM listesinden gercekten secildiyse dolu olur —
                // asla dogrulanmamis serbest metin (mahalleText) sizmaz (bkz. final
                // review bulgusu: yazim hatasi/eski secim referansa/Nominatim'e ulasiyordu).
                il: il.text, ilce: ilce.text, mahalle: mahalle?.text ?? '', ada: adaTrimmed, parsel: parselTrimmed,
            }

            // Ada/parsel numarasiyla dogrudan (yaklasik degil, TAM) TKGM eslesmesi.
            // Mahalle TKGM'den GERCEKTEN secilmis olmali (serbest metin asla
            // sizmaz — TkgmAutocompleteField'in genel ilkesi burada da gecerli).
            // Basarisiz olursa (404/ag hatasi/rate limit) SESSIZCE asagidaki
            // centroid/Nominatim yollarina dusulur — kullanici karari, ayri bir
            // hata metni EKLENMEZ.
            if (mahalle && ADA_PARSEL_PATTERN.test(adaTrimmed) && ADA_PARSEL_PATTERN.test(parselTrimmed)) {
                try {
                    const res = await fetch(`/api/parcel/lookup-by-ada-parsel?mahalleId=${mahalle.id}&ada=${adaTrimmed}&parsel=${parselTrimmed}`)
                    const data = await res.json()
                    if (data.status === 'verified' && data.parcel) {
                        const parcel = data.parcel as ParcelInfo
                        const centroid = polygonCentroid(parcel.geometry)
                        // Aritmetik-ortalama centroid, disbukey olmayan (ornegin
                        // L-sekilli) parsellerde poligonun DISINA dusebilir — bu
                        // durumda "TKGM ile dogrulandi" rozetini kazanmis gibi
                        // davranmadan asagidaki (mahalle/ilce/Nominatim) sessiz
                        // fallback yollarina dusulur (bkz. final review bulgusu).
                        const ring = parcel.geometry.coordinates?.[0]
                        if (centroid && Array.isArray(ring) && pointInPolygon(centroid, ring)) {
                            onLocationFound(centroid.lat, centroid.lng, reference, parcel)
                            return
                        }
                    }
                } catch {
                    // sessizce asagidaki yaklasik-konum yollarina dus
                }
            }

            if (mahalle?.centroid) {
                onLocationFound(mahalle.centroid.lat, mahalle.centroid.lng, reference)
                return
            }

            if (ilce.centroid) {
                // Mahalle secilmedi/centroidsiz — TKGM verisinde mahallelerin ~%27'si
                // poligonsuz. Ilce (idari yapi) seviyesinde geometri pratikte hep var;
                // Nominatim'e (ve onun eski yazim/typo riskine) dusmeden ONCE bu
                // resmi, TKGM kaynakli fallback denenir.
                onLocationFound(ilce.centroid.lat, ilce.centroid.lng, reference)
                return
            }

            // Ne mahalle ne ilce centroidi var — bugunku yaklasik-konum yolu:
            // Nominatim adres aramasi. il/ilce artik TKGM'nin resmi yazimi oldugu
            // icin (kullanici serbest yazmadi) bu sorgu bugunkunden daha guvenilir.
            const query = [reference.mahalle, reference.ilce, reference.il, 'Türkiye'].filter(Boolean).join(', ')
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(query)}`,
            )
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) {
                setError('Bu adres için konum bulunamadı. Daha genel yazmayı deneyin veya haritadan elle işaretleyin.')
                return
            }
            const { lat, lon } = data[0]
            onLocationFound(parseFloat(lat), parseFloat(lon), reference)
        } catch {
            setError('Konum aranırken bir sorun oluştu. Lütfen tekrar deneyin.')
        } finally {
            setSearching(false)
        }
    }

    return (
        <div className={styles.form}>
            <p className={styles.instructions}>
                Tapu veya senette yazan bilgileri girin.
            </p>

            <div className={styles.row}>
                <TkgmAutocompleteField
                    id="manual-il"
                    label="İl"
                    required
                    items={iller}
                    value={ilText}
                    onInputChange={handleIlTextChange}
                    onSelect={handleIlSelect}
                    placeholder="Örn. Tekirdağ"
                />
                <TkgmAutocompleteField
                    id="manual-ilce"
                    label="İlçe"
                    required
                    items={ilceler}
                    value={ilceText}
                    onInputChange={handleIlceTextChange}
                    onSelect={handleIlceSelect}
                    disabled={!il || ilceLoading}
                    placeholder={ilceLoading ? 'Yükleniyor…' : 'Örn. Muratlı'}
                />
            </div>

            {ilFetchError && (
                <div className={styles.errorNote}>
                    {errorNoteText(ilFetchError, 'İl listesi yüklenemedi.')} <button type="button" onClick={loadIller}>Tekrar dene</button>
                </div>
            )}
            {ilceFetchError && (
                <div className={styles.errorNote}>
                    {errorNoteText(ilceFetchError, 'İlçe listesi yüklenemedi.')} <button type="button" onClick={() => il && loadIlceler(il.id)}>Tekrar dene</button>
                </div>
            )}

            <TkgmAutocompleteField
                id="manual-mahalle"
                label="Mahalle"
                items={mahalleler}
                value={mahalleText}
                onInputChange={handleMahalleTextChange}
                onSelect={handleMahalleSelect}
                disabled={!ilce || mahalleLoading}
                placeholder={mahalleLoading ? 'Yükleniyor…' : 'Örn. Kırkkepenekli'}
            />

            {mahalleFetchError && (
                <div className={styles.errorNote}>
                    {errorNoteText(mahalleFetchError, 'Mahalle listesi yüklenemedi.')} <button type="button" onClick={() => ilce && loadMahalleler(ilce.id)}>Tekrar dene</button>
                </div>
            )}

            <div className={styles.row}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-ada">Ada No</label>
                    <input
                        id="manual-ada"
                        className={styles.input}
                        inputMode="numeric"
                        value={ada}
                        onChange={e => setAda(e.target.value)}
                        placeholder="örn. 1521"
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-parsel">Parsel No</label>
                    <input
                        id="manual-parsel"
                        className={styles.input}
                        inputMode="numeric"
                        value={parsel}
                        onChange={e => setParsel(e.target.value)}
                        placeholder="örn. 7"
                    />
                </div>
            </div>

            {error && <div className={styles.errorNote}>{error}</div>}

            <button type="button" className={styles.searchBtn} onClick={handleSearch} disabled={!canSearch}>
                {searching ? 'Aranıyor…' : 'Sorgula'}
            </button>
        </div>
    )
}
