"use client";

import { useState } from 'react';
import { LocationSelector, type DistrictPriceEntry } from '@/components/LocationSelector';
import { IconPin, IconChevronRight, IconCheckCircle } from '@/components/icons';
import { kaynakEtiketi, type BirimMaliyetKaynagi } from './unitPriceSource';
import styles from './mobile.module.css';

export type KonumBloguProps = {
    districtPrices: DistrictPriceEntry[];
    selectedIl: string;
    selectedIlce: string;
    onIlChange: (il: string) => void;
    onIlceChange: (ilce: string) => void;
    onClear: () => void;
    birimMaliyet: number;
    birimMaliyetKaynagi: BirimMaliyetKaynagi;
    onBirimMaliyet: (v: number) => void;
    /** Parsel kademesi: isteğe bağlı, resmi risk verisi için. */
    parselIsaretli: boolean;
    onParselAc: () => void;
};

/**
 * Konum blogu — spec K2: TEK blok, IKI kademe.
 *
 * 1. kademe: il/ilce. FIYATLARI getirir (birim insaat maliyeti + piyasa).
 * 2. kademe: parsel pini. YALNIZCA resmi risk verisini getirir, fiyatlara
 *    DOKUNMAZ. Onceden bu ikisi karisiyordu: baslikaki "Konum sec" cipi
 *    parsel haritasini aciyordu ama o harita il/ilceyi asla degistiremez.
 */
export function KonumBlogu({
    districtPrices,
    selectedIl,
    selectedIlce,
    onIlChange,
    onIlceChange,
    onClear,
    birimMaliyet,
    birimMaliyetKaynagi,
    onBirimMaliyet,
    parselIsaretli,
    onParselAc,
}: KonumBloguProps) {
    const [duzenleniyor, setDuzenleniyor] = useState(false);

    return (
        <div className={styles.konumBlogu}>
            <span className={styles.girdiEtiket}>Konum</span>

            {districtPrices.length > 0 ? (
                <div className={styles.konumSecici}>
                    <LocationSelector
                        districtPrices={districtPrices}
                        selectedIl={selectedIl}
                        selectedIlce={selectedIlce}
                        onIlChange={onIlChange}
                        onIlceChange={onIlceChange}
                        onClear={onClear}
                    />
                </div>
            ) : (
                <p className={styles.konumBosNot}>
                    İlçe fiyat verisi henüz yok. Birim maliyeti aşağıdan elle girebilirsiniz.
                </p>
            )}

            {/* Birim maliyet: ilceden turer ama GORUNUR ve ezilebilir (K1). */}
            <div className={styles.birimMaliyetSatiri}>
                {duzenleniyor ? (
                    <input
                        type="number"
                        className={`${styles.birimMaliyetGiris} mNum`}
                        defaultValue={birimMaliyet}
                        min={0}
                        step={100}
                        autoFocus
                        aria-label="Birim inşaat maliyeti (TL/m²)"
                        onBlur={e => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v) && v > 0) onBirimMaliyet(v);
                            setDuzenleniyor(false);
                        }}
                    />
                ) : (
                    <>
                        <span className={`${styles.birimMaliyetKaynak} mNum`}>
                            {kaynakEtiketi(birimMaliyetKaynagi, birimMaliyet)}
                        </span>
                        <button
                            type="button"
                            className={styles.birimMaliyetDegistir}
                            aria-label="Birim maliyeti değiştir"
                            onClick={() => setDuzenleniyor(true)}
                        >
                            değiştir
                        </button>
                    </>
                )}
            </div>

            {/* 2. kademe: parsel. Fiyatlara DOKUNMAZ. */}
            <button
                type="button"
                className={styles.parselKademe}
                onClick={onParselAc}
            >
                <span className={styles.parselKademeIkon}>
                    {parselIsaretli ? <IconCheckCircle size={16} /> : <IconPin size={16} />}
                </span>
                {parselIsaretli
                    ? 'Parsel işaretli · resmi risk verisi alındı'
                    : 'Parseli haritadan işaretle — resmi risk (isteğe bağlı)'}
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>
        </div>
    );
}
