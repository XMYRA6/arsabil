import React from 'react';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from './riskSuggestionHelpers';
import { riskKaynakEtiketi, type RiskKaynagi } from './mobile/riskSource';
import styles from './SmartContextCard.module.css';

export type SmartContextCardProps = {
    parcelContext: ParcelPickerValue | null;
    onOpenMap: () => void;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
};

function riskNotu(level: number): string {
    if (level >= 15) return '+%15 iksa maliyeti eklendi';
    if (level >= 10) return '+%10 iksa maliyeti eklendi';
    if (level >= 5) return '+%5 iksa maliyeti eklendi';
    return 'Ek iksa maliyeti yok';
}

export function SmartContextCard({
    parcelContext,
    onOpenMap,
    arsaAlani,
    onArsaAlani,
    riskLevel,
    riskLevels,
    onRiskLevel,
    riskKaynagi,
    isAaEnabled,
}: SmartContextCardProps) {
    const isAreaVerified = parcelContext?.status === 'verified' && !!parcelContext.parcel?.areaSqm;
    const address = parcelContext?.parcel?.mahalle
        ? `${parcelContext.parcel.ilce}, ${parcelContext.parcel.mahalle}`
        : parcelContext
            ? 'Haritadan seçilen nokta'
            : null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                {address ? (
                    <div className={styles.address}>📍 {address}</div>
                ) : (
                    <button type="button" className={styles.unselectedBtn} onClick={onOpenMap}>
                        📍 Haritadan parsel seç
                    </button>
                )}
                {address && (
                    <button type="button" className={styles.editBtn} onClick={onOpenMap}>
                        Değiştir
                    </button>
                )}
            </div>

            <div className={styles.riskSection}>
                <div className={styles.riskHeader}>
                    <span>Deprem Riski</span>
                    <span className={styles.riskKaynakEtiket}>{riskKaynakEtiketi(riskKaynagi)}</span>
                </div>
                <div className={styles.riskPills}>
                    {riskLevels.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            aria-pressed={riskLevel === opt.value}
                            className={`${styles.riskPill} ${riskLevel === opt.value ? styles.riskPillActive : ''}`}
                            onClick={() => onRiskLevel(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <p className={styles.riskNote}>{riskNotu(riskLevel)}</p>
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
