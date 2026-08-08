"use client";

import { ScenarioCompare, type Scenario } from '@/components/ScenarioCompare';
import styles from './mobile.module.css';

export type SenaryoKarsilastirmaSekmesiProps = {
    scenarios: Scenario[];
    /** Derinlestirme yapragini kapatir — AnalizSekmesi/FiyatAciklamasi ile ayni desen. */
    onKapat: () => void;
    onShareRequest: (ids: string[]) => Promise<string | null>;
};

/**
 * Senaryo karsilastirma derinlestirme yapragi. `ScenarioCompare` HIC
 * DEGISTIRILMEDEN render edilir — mobil kart gorunumu zaten CSS media
 * query ile (bkz. ScenarioCompare.module.css:140) otomatik devreye girer.
 * Bu yaprak yalnizca baslik+Kapat cercevesini saglar (`AnalizSekmesi`/
 * `FiyatAciklamasi` ile AYNI desen — kapatma affordance'i bilesenin
 * kendisinde yasar).
 */
export function SenaryoKarsilastirmaSekmesi({ scenarios, onKapat, onShareRequest }: SenaryoKarsilastirmaSekmesiProps) {
    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>Senaryo Karşılaştırması</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>
            <div className={styles.karsilastirmaGovde}>
                <ScenarioCompare scenarios={scenarios} onShareRequest={onShareRequest} />
            </div>
        </>
    );
}
