'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './ManualParcelEntryForm.module.css'
import { TkgmAutocompleteField, type IdariYapiItem } from './TkgmAutocompleteField'

export type ManualParcelReference = {
    il: string
    ilce: string
    mahalle: string
    ada: string
    parsel: string
}

type MahalleItem = IdariYapiItem & { centroid: { lat: number; lng: number } | null }

interface Props {
    onLocationFound: (lat: number, lng: number, reference: ManualParcelReference) => void
}

export function ManualParcelEntryForm({ onLocationFound }: Props) {
    const [ilText, setIlText] = useState('')
    const [il, setIl] = useState<IdariYapiItem | null>(null)
    const [ilceText, setIlceText] = useState('')
    const [ilce, setIlce] = useState<IdariYapiItem | null>(null)
    const [mahalleText, setMahalleText] = useState('')
    const [mahalle, setMahalle] = useState<MahalleItem | null>(null)
    const [ada, setAda] = useState('')
    const [parsel, setParsel] = useState('')

    const [iller, setIller] = useState<IdariYapiItem[]>([])
    const [ilceler, setIlceler] = useState<IdariYapiItem[]>([])
    const [mahalleler, setMahalleler] = useState<MahalleItem[]>([])
    const [ilceLoading, setIlceLoading] = useState(false)
    const [mahalleLoading, setMahalleLoading] = useState(false)

    const [ilFetchError, setIlFetchError] = useState(false)
    const [ilceFetchError, setIlceFetchError] = useState(false)
    const [mahalleFetchError, setMahalleFetchError] = useState(false)

    const [searching, setSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Kaskad seviyeleri icin istek nesli sayaci — gec gelen (eski) bir
    // cevabin daha yeni bir secimin sonucunu ezmesini engeller.
    const ilceRequestIdRef = useRef(0)
    const mahalleRequestIdRef = useRef(0)

    const loadIller = useCallback(() => {
        setIlFetchError(false)
        void (async () => {
            try {
                const res = await fetch('/api/tkgm/il')
                const data = await res.json()
                if (Array.isArray(data.iller)) {
                    setIller(data.iller)
                } else {
                    setIlFetchError(true)
                }
            } catch {
                setIlFetchError(true)
            }
        })()
    }, [])

    useEffect(() => { loadIller() }, [loadIller])

    const loadIlceler = useCallback((ilId: number) => {
        const myRequestId = ++ilceRequestIdRef.current
        setIlceFetchError(false)
        setIlceLoading(true)
        void (async () => {
            try {
                const res = await fetch(`/api/tkgm/ilce?ilId=${ilId}`)
                const data = await res.json()
                if (myRequestId !== ilceRequestIdRef.current) return
                if (Array.isArray(data.ilceler)) {
                    setIlceler(data.ilceler)
                } else {
                    setIlceler([])
                    setIlceFetchError(true)
                }
                setIlceLoading(false)
            } catch {
                if (myRequestId !== ilceRequestIdRef.current) return
                setIlceler([])
                setIlceFetchError(true)
                setIlceLoading(false)
            }
        })()
    }, [])

    const loadMahalleler = useCallback((ilceId: number) => {
        const myRequestId = ++mahalleRequestIdRef.current
        setMahalleFetchError(false)
        setMahalleLoading(true)
        void (async () => {
            try {
                const res = await fetch(`/api/tkgm/mahalle?ilceId=${ilceId}`)
                const data = await res.json()
                if (myRequestId !== mahalleRequestIdRef.current) return
                if (Array.isArray(data.mahalleler)) {
                    setMahalleler(data.mahalleler)
                } else {
                    setMahalleler([])
                    setMahalleFetchError(true)
                }
                setMahalleLoading(false)
            } catch {
                if (myRequestId !== mahalleRequestIdRef.current) return
                setMahalleler([])
                setMahalleFetchError(true)
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
        setIlce(item)
        setIlceText(item.text)
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

    const canSearch = il !== null && ilce !== null && !searching

    const handleSearch = async () => {
        if (!canSearch || !il || !ilce) return
        setSearching(true)
        setError(null)
        try {
            const reference: ManualParcelReference = {
                il: il.text, ilce: ilce.text, mahalle: mahalle?.text ?? mahalleText, ada, parsel,
            }

            if (mahalle?.centroid) {
                onLocationFound(mahalle.centroid.lat, mahalle.centroid.lng, reference)
                return
            }

            // Mahalle secilmedi (veya centroid hesaplanamadi) — mevcut yaklasik-konum
            // yolu: Nominatim adres aramasi. il/ilce artik TKGM'nin resmi yazimi
            // oldugu icin (kullanici serbest yazmadi) bu sorgu bugunkunden daha
            // guvenilir.
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
                    onInputChange={setIlText}
                    onSelect={handleIlSelect}
                    placeholder="Örn. Tekirdağ"
                />
                <TkgmAutocompleteField
                    id="manual-ilce"
                    label="İlçe"
                    required
                    items={ilceler}
                    value={ilceText}
                    onInputChange={setIlceText}
                    onSelect={handleIlceSelect}
                    disabled={!il || ilceLoading}
                    placeholder={ilceLoading ? 'Yükleniyor…' : 'Örn. Muratlı'}
                />
            </div>

            {ilFetchError && (
                <div className={styles.errorNote}>
                    İl listesi yüklenemedi. <button type="button" onClick={loadIller}>Tekrar dene</button>
                </div>
            )}
            {ilceFetchError && (
                <div className={styles.errorNote}>
                    İlçe listesi yüklenemedi. <button type="button" onClick={() => il && loadIlceler(il.id)}>Tekrar dene</button>
                </div>
            )}

            <TkgmAutocompleteField
                id="manual-mahalle"
                label="Mahalle"
                items={mahalleler}
                value={mahalleText}
                onInputChange={setMahalleText}
                onSelect={handleMahalleSelect}
                disabled={!ilce || mahalleLoading}
                placeholder={mahalleLoading ? 'Yükleniyor…' : 'Örn. Kırkkepenekli'}
            />

            {mahalleFetchError && (
                <div className={styles.errorNote}>
                    Mahalle listesi yüklenemedi. <button type="button" onClick={() => ilce && loadMahalleler(ilce.id)}>Tekrar dene</button>
                </div>
            )}

            <div className={styles.row}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-ada">Ada No</label>
                    <input
                        id="manual-ada"
                        className={styles.input}
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
