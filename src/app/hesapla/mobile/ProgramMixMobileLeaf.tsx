"use client";

import { ProgramMixPanel, type ProgramMixPanelProps } from '@/components/studio/ProgramMixPanel';
import styles from './mobile.module.css';

export type ProgramMixMobileLeafProps = ProgramMixPanelProps & {
    /** Derinlestirme yapragini kapatir — `StudioMobileLeaf.onKapat` ile ayni desen. */
    onKapat: () => void;
};

/**
 * Mobil "Program Dağılımı" derinlestirme yapragi (Faz 2A Task 3) —
 * `StudioMobileLeaf` ile AYNI kabuk deseni: `ProgramMixPanel` KOPYALANMAZ,
 * aynen sarmalanir. Masaustuyle ayni bilesen, ayni state (`page.tsx`teki
 * `programMixItems`), ayni davranis.
 */
export function ProgramMixMobileLeaf({ onKapat, ...panelProps }: ProgramMixMobileLeafProps) {
    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>Program Dağılımı</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>
            <ProgramMixPanel {...panelProps} />
        </>
    );
}
