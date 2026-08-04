'use client'

import { useState } from 'react'
import styles from './ManualParcelEntryModal.module.css'

export type ManualParcelReference = {
    il: string
    ilce: string
    mahalle: string
    ada: string
    parsel: string
}

interface Props {
    isOpen: boolean
    onClose: () => void
    onLocationFound: (lat: number, lng: number, reference: ManualParcelReference) => void
}

export function ManualParcelEntryModal({ isOpen, onClose, onLocationFound }: Props) {
    const [il, setIl] = useState('')
    const [ilce, setIlce] = useState('')
    const [mahalle, setMahalle] = useState('')
    const [ada, setAda] = useState('')
    const [parsel, setParsel] = useState('')
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const canSearch = il.trim() !== '' && ilce.trim() !== '' && !searching

    const handleSearch = async () => {
        if (!canSearch) return
        setSearching(true)
        setError(null)
        try {
            // TKGM'in il/ilce/mahalle/ada/parsel ile sorgulanabilecegi bir uc
            // noktasi yok (sadece nokta-tabanli lookup var, bkz. fetchParcelByPoint).
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
            onClose()
        } catch {
            setError('Konum aranırken bir sorun oluştu. Lütfen tekrar deneyin.')
        } finally {
            setSearching(false)
        }
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2>Elle Parsel Girişi</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </header>

                <div className={styles.content}>
                    <p className={styles.instructions}>
                        Tapuda yazan il/ilçe/mahalle bilgisini girin, haritayı o bölgeye götürelim —
                        tam noktaya pini siz ayarlarsınız. Ada/parsel bilgisi TKGM&apos;e sorgu için
                        kullanılmaz, yalnızca sizin referansınız olarak saklanır.
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
                                placeholder="Opsiyonel"
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="manual-parsel">Parsel No</label>
                            <input
                                id="manual-parsel"
                                className={styles.input}
                                value={parsel}
                                onChange={e => setParsel(e.target.value)}
                                placeholder="Opsiyonel"
                            />
                        </div>
                    </div>

                    {error && <div className={styles.errorNote}>{error}</div>}
                </div>

                <footer className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>Vazgeç</button>
                    <button className={styles.searchBtn} onClick={handleSearch} disabled={!canSearch}>
                        {searching ? 'Aranıyor…' : 'Haritada Göster'}
                    </button>
                </footer>
            </div>
        </div>
    )
}
