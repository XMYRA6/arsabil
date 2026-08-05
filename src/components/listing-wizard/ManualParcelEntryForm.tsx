'use client'

import { useState } from 'react'
import styles from './ManualParcelEntryForm.module.css'

export type ManualParcelReference = {
    il: string
    ilce: string
    mahalle: string
    ada: string
    parsel: string
}

interface Props {
    onLocationFound: (lat: number, lng: number, reference: ManualParcelReference) => void
}

export function ManualParcelEntryForm({ onLocationFound }: Props) {
    const [il, setIl] = useState('')
    const [ilce, setIlce] = useState('')
    const [mahalle, setMahalle] = useState('')
    const [ada, setAda] = useState('')
    const [parsel, setParsel] = useState('')
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const canSearch = il.trim() !== '' && ilce.trim() !== '' && !searching

    const handleSearch = async () => {
        if (!canSearch) return
        setSearching(true)
        setError(null)
        try {
            // TKGM'in il/ilce/mahalle/ada/parsel ile sorgulanabilecegi bir uc
            // noktasi yok (sadece nokta-tabanli lookup var, bkz. ParcelPicker).
            // Bu yuzden burada yalnizca YAKLASIK bir konuma gidiyoruz; gercek
            // TKGM dogrulamasi kullanicinin haritada pini ayarlayip "Parseli
            // Dogrula"ya basmasiyla calisan mevcut nokta-tabanli akista olur.
            const query = [mahalle, ilce, il, 'Türkiye'].filter(Boolean).join(', ')
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(query)}`,
            )
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) {
                setError('Bu adres için konum bulunamadı. Daha genel yazmayı deneyin veya haritadan elle işaretleyin.')
                return
            }
            const { lat, lon } = data[0]
            onLocationFound(parseFloat(lat), parseFloat(lon), { il, ilce, mahalle, ada, parsel })
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
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-il">İl *</label>
                    <input
                        id="manual-il"
                        className={styles.input}
                        value={il}
                        onChange={e => setIl(e.target.value)}
                        placeholder="Örn. Tekirdağ"
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-ilce">İlçe *</label>
                    <input
                        id="manual-ilce"
                        className={styles.input}
                        value={ilce}
                        onChange={e => setIlce(e.target.value)}
                        placeholder="Örn. Muratlı"
                    />
                </div>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="manual-mahalle">Mahalle</label>
                <input
                    id="manual-mahalle"
                    className={styles.input}
                    value={mahalle}
                    onChange={e => setMahalle(e.target.value)}
                    placeholder="Örn. Kırkkepenekli"
                />
            </div>

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
