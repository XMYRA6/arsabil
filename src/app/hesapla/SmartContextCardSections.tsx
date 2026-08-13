"use client";

import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import { Toggle } from '@/components/ui/Toggle';
import type { RiskLevel } from './riskSuggestionHelpers';
import { riskKaynakEtiketi, type RiskKaynagi } from './mobile/riskSource';
import styles from './SmartContextCard.module.css';

export type LocationHeaderProps = {
    parcelContext: ParcelPickerValue | null;
    onOpenMap: () => void;
};

export function LocationHeader({ parcelContext, onOpenMap }: LocationHeaderProps) {
    const address = parcelContext?.parcel?.mahalle
        ? `${parcelContext.parcel.ilce}, ${parcelContext.parcel.mahalle}`
        : parcelContext
            ? 'Haritadan seçilen nokta'
            : null;

    return (
        <div className={styles.header} data-girdi-blok="konum">
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
    );
}

export type RiskSectionProps = {
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
};

/**
 * Risk yuzdesinin maliyete etkisi. Motor risk payini (`isRiskEnabled`/`R`)
 * ve iksa masrafini (`isExcavationEnabled`/`Z`/`MzOriginal`) BAGIMSIZ girdiler
 * olarak isler; iksanin kendi ayri kontrolu var. Bu yuzden metin "iksa
 * maliyeti" degil "risk payi" der.
 */
function riskNotu(level: number): string {
    if (level >= 15) return '+%15 risk payı maliyete eklendi';
    if (level >= 10) return '+%10 risk payı maliyete eklendi';
    if (level >= 5) return '+%5 risk payı maliyete eklendi';
    return 'Ek risk payı yok';
}

export function RiskSection({ riskLevel, riskLevels, onRiskLevel, riskKaynagi }: RiskSectionProps) {
    return (
        <div className={styles.riskSection} data-girdi-blok="deprem-riski">
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
    );
}

export type AreaSectionProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
};

export function AreaSection({ parcelContext, arsaAlani, onArsaAlani, isAaEnabled, onIsAaEnabled }: AreaSectionProps) {
    const isAreaVerified = parcelContext?.status === 'verified' && !!parcelContext.parcel?.areaSqm;

    return (
        <div className={styles.areaSection} data-girdi-blok="arsa-alani">
            <div className={styles.areaHeader}>
                <span>Arsa Alanı</span>
                <Toggle
                    className={styles.aaToggle}
                    checked={isAaEnabled}
                    aria-label="Arsa alanını hesaba kat"
                    onChange={(e) => onIsAaEnabled(e.target.checked)}
                />
            </div>
            {isAaEnabled && (
                <p className={`${styles.areaStatus} ${isAreaVerified ? styles.areaStatusOk : ''}`}>
                    {isAreaVerified ? '✓ TKGM Onaylı' : 'Elle girilmesi gerekiyor'}
                </p>
            )}
            {isAaEnabled && (
                <div className={styles.areaInputRow}>
                    <input
                        type="number"
                        value={arsaAlani || ''}
                        onChange={(e) => onArsaAlani(Number(e.target.value))}
                        placeholder="Alanı girin"
                    />
                    <span>m²</span>
                </div>
            )}
        </div>
    );
}
