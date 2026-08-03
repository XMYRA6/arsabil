import React from 'react';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import styles from './SmartContextCard.module.css';

export type SmartContextCardProps = {
    parcelContext: ParcelPickerValue | null;
    onOpenMap: () => void;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    isAaEnabled: boolean;
};

function formatRisk(level: number) {
    if (level >= 15) return { label: 'Yüksek Deprem Riski', cls: styles.riskHigh, note: '+%15 iksa maliyeti eklendi' };
    if (level >= 10) return { label: 'Orta-Yüksek Risk', cls: styles.riskMedium, note: '+%10 iksa maliyeti eklendi' };
    if (level >= 5) return { label: 'Orta Deprem Riski', cls: styles.riskMedium, note: '+%5 iksa maliyeti eklendi' };
    return { label: 'Düşük Deprem Riski', cls: styles.riskLow, note: 'Ek iksa maliyeti yok' };
}

export function SmartContextCard({
    parcelContext,
    onOpenMap,
    arsaAlani,
    onArsaAlani,
    riskLevel,
    isAaEnabled,
}: SmartContextCardProps) {
    if (!parcelContext) {
        return (
            <button type="button" className={styles.unselectedBtn} onClick={onOpenMap}>
                📍 Haritadan parsel seç
            </button>
        );
    }

    const isAreaVerified = parcelContext.status === 'verified' && parcelContext.parcel?.areaSqm;
    const address = parcelContext.parcel?.mahalle 
        ? `${parcelContext.parcel.ilce}, ${parcelContext.parcel.mahalle}`
        : 'Haritadan seçilen nokta';

    const risk = formatRisk(riskLevel);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.address}>
                    📍 {address}
                </div>
                <button type="button" className={styles.editBtn} onClick={onOpenMap}>
                    Değiştir
                </button>
            </div>
            
            <div className={`${styles.riskBadge} ${risk.cls}`}>
                ⚠️ {risk.label} <span className={styles.riskNote}>({risk.note})</span>
            </div>

            {isAaEnabled && (
                <div className={styles.areaSection}>
                    <div className={styles.areaHeader}>
                        <span>Arsa Alanı</span>
                        <span className={isAreaVerified ? styles.areaStatusOk : styles.areaStatus}>
                            {isAreaVerified ? '✓ TKGM Onaylı' : 'Elle girilmesi gerekiyor'}
                        </span>
                    </div>
                    <div className={styles.areaInputRow}>
                        <input
                            type="number"
                            value={arsaAlani || ''}
                            onChange={(e) => onArsaAlani(Number(e.target.value))}
                            placeholder="Alanı girin"
                        />
                        <span>m²</span>
                    </div>
                </div>
            )}
        </div>
    );
}
