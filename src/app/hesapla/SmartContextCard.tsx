import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from './riskSuggestionHelpers';
import type { RiskKaynagi } from './mobile/riskSource';
import { LocationHeader, RiskSection, AreaSection } from './SmartContextCardSections';
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
 * Masaustu (ve "orijinal sira" gereken her yer) icin konum+risk+alan ucunu
 * TEK bir kart olarak birlestiren ince sarmalayici. Mobil ekran (GirdiKarti)
 * artik bu ucunu AYRI AYRI, kendi sirasinda kullaniyor — bkz.
 * SmartContextCardSections.tsx. Bu dosyanin cikardigi HTML masaustu icin
 * BIREBIR ONCEKI GIBI kalir.
 */
export function SmartContextCard({
    parcelContext, onOpenMap, arsaAlani, onArsaAlani,
    riskLevel, riskLevels, onRiskLevel, riskKaynagi,
    isAaEnabled, onIsAaEnabled,
}: SmartContextCardProps) {
    return (
        <div className={styles.container}>
            <LocationHeader parcelContext={parcelContext} onOpenMap={onOpenMap} />
            <RiskSection riskLevel={riskLevel} riskLevels={riskLevels} onRiskLevel={onRiskLevel} riskKaynagi={riskKaynagi} />
            <AreaSection parcelContext={parcelContext} arsaAlani={arsaAlani} onArsaAlani={onArsaAlani} isAaEnabled={isAaEnabled} onIsAaEnabled={onIsAaEnabled} />
        </div>
    );
}
