'use client'

import type { RiskMeasurement } from '@/lib/risk/types'
import styles from './RiskSuggestionCard.module.css'

interface Props {
    risk: RiskMeasurement
    /** Yüzde cinsinden risk seviyesi — /hesapla `riskLevel` state'i bu birimde. */
    onApply: (riskLevelPercent: number) => void
}

function formatDistance(m: number | null): string {
    if (m === null) return '25 km’den uzak'
    return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`
}

export function RiskSuggestionCard({ risk, onApply }: Props) {
    const percent = Math.round((risk.suggestedR - 1) * 100)

    return (
        <div className={styles.card}>
            <h4 className={styles.title}>Yakın fay etkisi</h4>

            <p className={styles.line}>
                Parseliniz diri faya yaklaşık <strong>{formatDistance(risk.faultDistanceM)}</strong>.
                {risk.floodQ100 && ' Parsel Q100 taşkın tehlike bölgesi içinde.'}
            </p>

            <p className={styles.line}>
                TBDY 2018 yakın fay katsayısı{' '}
                <strong>γF = {risk.gammaF.toFixed(2).replace('.', ',')}</strong>
            </p>

            <p className={styles.line}>
                <em>Tahmini</em> risk katsayısı önerisi:{' '}
                <strong>R = {risk.suggestedR.toFixed(2).replace('.', ',')}</strong>
            </p>

            <p className={styles.line}>
                Bu öneri yalnızca bu ölçümün kapsadığı payı yansıtır; projenin piyasa, inşaat ve
                diğer bilinmezliklerini içeren toplam riskini temsil etmez.
            </p>

            {percent > 0 && (
                <button type="button" className={styles.applyBtn} onClick={() => onApply(percent)}>
                    Uygula
                </button>
            )}

            <small className={styles.disclaimer}>
                γF, TBDY 2018 uyarınca deprem tasarım talebini ölçekler; maliyet etkisi tahminidir.
                Mesafe fayın yüzey izine göre hesaplanmıştır. Mühendislik raporu yerine geçmez.
            </small>
        </div>
    )
}
