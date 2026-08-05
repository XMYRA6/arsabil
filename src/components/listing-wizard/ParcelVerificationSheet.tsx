'use client'

import { useEffect, useRef, useState } from 'react'
import { ParcelPicker, type ParcelPickerValue, type ParcelPickerHandle } from './ParcelPicker'
import { ManualParcelEntryForm, type ManualParcelReference } from './ManualParcelEntryForm'
import { RiskSuggestionCard } from '@/components/risk/RiskSuggestionCard'
import { BottomSheet } from '@/components/mobile/BottomSheet'
import type { RiskMeasurement } from '@/lib/risk/types'
import styles from './ParcelVerificationSheet.module.css'

export type ParcelVerificationSheetProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: (payload: {
        parcelValue: ParcelPickerValue
        risk: RiskMeasurement | null
        suggestedRiskPercent: number | null
    }) => void
    /** True ise RiskSuggestionCard'in Uygula butonu gizlenir (bkz. RiskSuggestionCard). */
    hideApply?: boolean
}

type Mode = 'map' | 'manual'

export function ParcelVerificationSheet({ isOpen, onClose, onConfirm, hideApply = false }: ParcelVerificationSheetProps) {
    const [mode, setMode] = useState<Mode>('map')
    const [parcelValue, setParcelValue] = useState<ParcelPickerValue>({
        lat: null,
        lng: null,
        parcel: null,
        status: 'idle',
    })
    const [risk, setRisk] = useState<RiskMeasurement | null>(null)
    const [suggestedRiskPercent, setSuggestedRiskPercent] = useState<number | null>(null)
    const [isFetchingRisk, setIsFetchingRisk] = useState(false)
    const [manualRef, setManualRef] = useState<ManualParcelReference | null>(null)
    const pickerRef = useRef<ParcelPickerHandle>(null)

    // `/hesapla/page.tsx`teki ayni desen: SSR'de ve ilk client render'de null,
    // ardindan gercek viewport'a gore true/false. Iki kabugu (masaustu modal +
    // mobil BottomSheet) AYNI ANDA render etmek Leaflet haritasini iki kez
    // mount eder — bu yuzden viewport cozulene kadar hicbir sey render edilmez.
    const [isDesktopViewport, setIsDesktopViewport] = useState<boolean | null>(null)
    useEffect(() => {
        const mql = window.matchMedia('not all and (max-width: 768px)')
        const update = () => setIsDesktopViewport(mql.matches)
        update()
        mql.addEventListener('change', update)
        return () => mql.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        const fetchRisk = async () => {
            if (parcelValue.lat && parcelValue.lng) {
                setIsFetchingRisk(true)
                try {
                    const res = await fetch(`/api/risk/lookup?lat=${parcelValue.lat}&lng=${parcelValue.lng}`)
                    const data = await res.json()
                    setRisk(data.status === 'ok' ? data.risk : null)
                } catch {
                    setRisk(null)
                } finally {
                    setIsFetchingRisk(false)
                }
            } else {
                setRisk(null)
            }
        }
        fetchRisk()
    }, [parcelValue.parcel])

    if (!isOpen || isDesktopViewport === null) return null

    const handleManualFound = (lat: number, lng: number, reference: ManualParcelReference) => {
        // `pickerRef.current?.placePin(...)` calisirken ParcelPicker zaten
        // unmount edilmis olur (mode === 'manual' oldugu icin JSX onun
        // yerine ManualParcelEntryForm render ediyordu) — ref o an null,
        // cagri sessizce no-op olurdu ve mode 'map'e donunce ParcelPicker
        // hala bos parcelValue ile yeniden mount olurdu. Bunun yerine
        // parcelValue'yu (ParcelPicker'in DEGIL, bu bilesenin state'i)
        // dogrudan guncelliyoruz; ParcelPicker'in kendi
        // "[mapReady, value.lat, value.lng]"e bagli marker effect'i
        // (duzenleme sayfasindan gelen kayitli konum icin zaten var olan
        // mekanizma) remount sonrasi bu degeri props'tan okuyup pini dogru
        // koyar.
        setManualRef(reference)
        setParcelValue(v => ({ ...v, lat, lng, status: 'idle', parcel: null }))
        setMode('map')
    }

    const handleApply = () => {
        onConfirm({ parcelValue, risk, suggestedRiskPercent })
        onClose()
    }

    const body = (
        <div className={styles.content}>
            <p className={styles.instructions}>
                Arsanızın konumunu harita üzerinden işaretleyin. Sistem, Tapu ve Kadastro
                Genel Müdürlüğü (TKGM) kayıtlarından gerçek alan (m²) ve nitelik bilgisini,
                ayrıca deprem ve fay hattı risk durumunu otomatik sorgulayacaktır.
            </p>

            <div className={styles.toggleRow}>
                <button
                    type="button"
                    className={`${styles.modeBtn} ${mode === 'map' ? styles.modeBtnOn : ''}`}
                    onClick={() => setMode('map')}
                >
                    Haritadan
                </button>
                <button
                    type="button"
                    className={`${styles.modeBtn} ${mode === 'manual' ? styles.modeBtnOn : ''}`}
                    onClick={() => setMode('manual')}
                >
                    Elle gir
                </button>
            </div>

            {mode === 'map' ? (
                <ParcelPicker
                    ref={pickerRef}
                    value={parcelValue}
                    onChange={patch => setParcelValue(v => ({ ...v, ...patch }))}
                    mapClassName={styles.largeMap}
                    hint="Arsanızın bulunduğu noktaya haritadan tıklayın."
                />
            ) : (
                <ManualParcelEntryForm onLocationFound={handleManualFound} />
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

            {isFetchingRisk && (
                <div className={styles.loadingRisk}>Risk verileri hesaplanıyor...</div>
            )}

            {risk && (
                <div className={styles.riskSection}>
                    <RiskSuggestionCard
                        risk={risk}
                        hideApply={hideApply}
                        onApply={(percent) => setSuggestedRiskPercent(percent)}
                    />
                    {!hideApply && suggestedRiskPercent !== null && (
                        <div className={styles.riskAppliedNote}>
                            ✓ {suggestedRiskPercent}% risk payı seçildi. Aktarmaya hazır.
                        </div>
                    )}
                </div>
            )}
        </div>
    )

    const applyBtn = (
        <button
            className={styles.applyBtn}
            onClick={handleApply}
            disabled={parcelValue.status !== 'verified'}
        >
            Hesaplamaya Aktar
        </button>
    )

    if (!isDesktopViewport) {
        return (
            <BottomSheet open onClose={onClose} title="Haritadan Parsel Doğrula" className={styles.sheet}>
                {body}
                <div className={styles.mobileFooter}>{applyBtn}</div>
            </BottomSheet>
        )
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2>Haritadan Parsel Doğrula</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </header>
                {body}
                <footer className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>Vazgeç</button>
                    {applyBtn}
                </footer>
            </div>
        </div>
    )
}
