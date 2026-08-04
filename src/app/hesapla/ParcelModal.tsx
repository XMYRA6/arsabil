'use client'

import { useState, useEffect } from 'react'
import { ParcelPicker, type ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker'
import { RiskSuggestionCard } from '@/components/risk/RiskSuggestionCard'
import type { RiskMeasurement } from '@/lib/risk/types'
import styles from './ParcelModal.module.css'

export type ParcelModalProps = {
    isOpen: boolean
    onClose: () => void
    /** Modal kapatılınca veya onaylanınca formları güncellemesi için bir callback. */
    onConfirm: (payload: {
        parcelValue: ParcelPickerValue
        risk: RiskMeasurement | null
        suggestedRiskPercent: number | null
    }) => void
}

export function ParcelModal({ isOpen, onClose, onConfirm }: ParcelModalProps) {
    const [parcelValue, setParcelValue] = useState<ParcelPickerValue>({
        lat: null,
        lng: null,
        parcel: null,
        status: 'idle',
    })

    const [risk, setRisk] = useState<RiskMeasurement | null>(null)
    const [suggestedRiskPercent, setSuggestedRiskPercent] = useState<number | null>(null)
    const [isFetchingRisk, setIsFetchingRisk] = useState(false)

    // Sifirlama artik effect'te degil: cagiran taraf (page.tsx) her acilista
    // bilesene yeni bir `key` veriyor, bu da tam remount'la state'i dogal
    // olarak sifirliyor (React'in onerdigi desen, bkz. "resetting state when
    // a prop changes" — react-hooks/set-state-in-effect'in isaret ettigi
    // kademeli render sorununu da ortadan kaldirir).

    // Fetch risk when parcel changes
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

    if (!isOpen) return null

    const handleApply = () => {
        onConfirm({ parcelValue, risk, suggestedRiskPercent })
        onClose()
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

                <div className={styles.content}>
                    <p className={styles.instructions}>
                        Arsanızın konumunu harita üzerinden işaretleyin. Sistem, Tapu ve Kadastro 
                        Genel Müdürlüğü (TKGM) kayıtlarından gerçek alan (m²) ve nitelik bilgisini, 
                        ayrıca deprem ve fay hattı risk durumunu otomatik sorgulayacaktır.
                    </p>

                    <ParcelPicker
                        value={parcelValue}
                        onChange={patch => setParcelValue(v => ({ ...v, ...patch }))}
                        mapClassName={styles.largeMap}
                        hint="Arsanızın bulunduğu noktaya haritadan tıklayın."
                    />

                    {isFetchingRisk && (
                        <div className={styles.loadingRisk}>Risk verileri hesaplanıyor...</div>
                    )}
                    
                    {risk && (
                        <div className={styles.riskSection}>
                            <RiskSuggestionCard 
                                risk={risk} 
                                onApply={(percent) => {
                                    setSuggestedRiskPercent(percent)
                                }} 
                            />
                            {suggestedRiskPercent !== null && (
                                <div className={styles.riskAppliedNote}>
                                    ✓ {suggestedRiskPercent}% risk payı seçildi. Aktarmaya hazır.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <footer className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        Vazgeç
                    </button>
                    <button 
                        className={styles.applyBtn} 
                        onClick={handleApply}
                        disabled={parcelValue.status !== 'verified'}
                    >
                        Hesaplamaya Aktar
                    </button>
                </footer>
            </div>
        </div>
    )
}
