"use client";

import { useState } from 'react';
import type { DistrictPriceEntry } from '@/components/LocationSelector';
import { IconPin, IconChevronRight } from '@/components/icons';
import { ilceKaydiBul } from './unitPriceSource';
import styles from './mobile.module.css';

const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

export type KonumSeciciProps = {
    districtPrices: DistrictPriceEntry[];
    selectedIl: string;
    selectedIlce: string;
    /** Il ve ilce BIRLIKTE — bkz. `handleKonumSec` gerekcesi. */
    onSecim: (il: string, ilce: string) => void;
    onClear: () => void;
};

/**
 * Mobil konum secici (spec 2026-08-01).
 *
 * Masaustu `LocationSelector` mobilde birebir render ediliyordu: satir ici
 * sabit stiller, 28px `<select>`ler (projenin kendi `--touch-target`i 44px)
 * ve emoji. Bu bilesen onun yerini alir; masaustu bileseni DEGISMEDI.
 */
export function KonumSecici({
    districtPrices,
    selectedIl,
    selectedIlce,
    onClear,
}: KonumSeciciProps) {
    // `onSecim` bu asamada BAGLANMAZ: sheet (Task 5) acilana kadar secim
    // olayi olusmaz. Tip uzerinde durur, cagirilmaz — destructure edilirse
    // @typescript-eslint/no-unused-vars eslint baseline'ini (12) artirirdi.
    const [acik, setAcik] = useState(false);
    const secili = Boolean(selectedIl && selectedIlce);
    const kayit = secili ? ilceKaydiBul(districtPrices, selectedIl, selectedIlce) : undefined;

    return (
        <div className={styles.konumSeciciKok}>
            <button
                type="button"
                className={styles.konumSeciciAc}
                aria-expanded={acik}
                onClick={() => setAcik(true)}
            >
                <span className={styles.konumSeciciIkon}>
                    <IconPin size={16} />
                </span>
                <span className={styles.konumSeciciMetin}>
                    <span className={styles.konumSeciciBaslik}>
                        {secili ? `${selectedIl} / ${selectedIlce}` : 'İl / ilçe seçin'}
                    </span>
                    {kayit && (
                        <span className={styles.konumSeciciAlt}>
                            {`Piyasa ${nf.format(kayit.avgSalesPricePerM2)} · Birim ${nf.format(kayit.avgUnitConstructionPrice)} TL/m²`}
                        </span>
                    )}
                </span>
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>

            {secili && (
                <button
                    type="button"
                    className={styles.konumSeciciTemizle}
                    aria-label="Konumu temizle"
                    onClick={onClear}
                >
                    Temizle
                </button>
            )}
        </div>
    );
}
