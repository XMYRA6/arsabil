"use client";

import { LandownerOfferPanel, type LandownerOfferPanelProps } from '@/components/studio/LandownerOfferPanel';
import styles from './mobile.module.css';

export type LandownerOfferMobileLeafProps = LandownerOfferPanelProps & {
    /** Derinlestirme yapragini kapatir — `ProgramMixMobileLeaf.onKapat` ile ayni desen. */
    onKapat: () => void;
};

/**
 * Mobil "Arsa Sahibi Teklifi" derinlestirme yapragi (Faz 2B Task 3) —
 * `ProgramMixMobileLeaf` ile AYNI kabuk deseni: `LandownerOfferPanel`
 * KOPYALANMAZ, aynen sarmalanir. Masaustuyle ayni bilesen, ayni state
 * (`page.tsx`teki `valuationAssumptions`/`landownerCustomOverride`).
 */
export function LandownerOfferMobileLeaf({ onKapat, ...panelProps }: LandownerOfferMobileLeafProps) {
    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>Arsa Sahibi Teklifi</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>
            <LandownerOfferPanel {...panelProps} />
        </>
    );
}
