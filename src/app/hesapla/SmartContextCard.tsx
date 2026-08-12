import React from 'react';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import { Toggle } from '@/components/ui/Toggle';
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
    onIsAaEnabled: (v: boolean) => void;
};

/**
 * Risk yuzdesinin maliyete etkisi. Motor risk payini (`isRiskEnabled`/`R`)
 * ve iksa masrafini (`isExcavationEnabled`/`Z`/`MzOriginal`) BAGIMSIZ girdiler
 * olarak isler; iksanin kendi ayri kontrolu var. Bu yuzden metin "iksa
 * maliyeti" degil "risk payi" der — aksi halde iki farkli maliyet kalemi ayni
 * isimle anilip kullaniciyi (ve kodu okuyani) yaniltiyordu.
 */
function riskNotu(level: number): string {
    if (level >= 15) return '+%15 risk payı maliyete eklendi';
    if (level >= 10) return '+%10 risk payı maliyete eklendi';
    if (level >= 5) return '+%5 risk payı maliyete eklendi';
    return 'Ek risk payı yok';
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
    onIsAaEnabled,
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

            {/* Alani ACMA anahtari kartin ICINDE: `isAaEnabled`i cevirebilen
                tek kontrol masaustu JSX agacindaydi, mobilde parsel
                onaylamadan arsa alani HIC girilemiyordu. Kart iki platformda
                da render edildigi icin anahtar burada olunca ikisi de kazanir
                (spec: risk ve alan parselden BAGIMSIZ kullanilabilmeli).
                Durum metni artik baslik+toggle satirinin DISINDA, kendi
                satirinda render oluyor — toggle KAPALIYKEN baslik+toggle
                satiri hic kirilmadan tek satirda kalir (mobil mockup'ta
                onaylanan davranis, bkz. docs/superpowers/specs/
                2026-08-12-hesapla-girdi-karti-simetri-design.md). */}
            <div className={styles.areaSection}>
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
        </div>
    );
}
