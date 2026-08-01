"use client";

import { useState } from 'react';
import type { DistrictPriceEntry } from '@/components/LocationSelector';
import { IconPin, IconChevronRight } from '@/components/icons';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { ilceKaydiBul } from './unitPriceSource';
import { konumAra } from './konumArama';
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
    onSecim,
    onClear,
}: KonumSeciciProps) {
    const [acik, setAcik] = useState(false);
    const secili = Boolean(selectedIl && selectedIlce);
    const kayit = secili ? ilceKaydiBul(districtPrices, selectedIl, selectedIlce) : undefined;

    const [sorgu, setSorgu] = useState('');
    const [acilanIl, setAcilanIl] = useState<string | null>(null);

    const kapat = () => { setAcik(false); setSorgu(''); setAcilanIl(null); };

    const iller = [...new Set(districtPrices.map(d => d.il))].sort((a, b) => a.localeCompare(b, 'tr'));
    const { sonuclar, kesildi } = konumAra(districtPrices, sorgu);
    const ilceler = acilanIl
        ? districtPrices.filter(d => d.il === acilanIl).sort((a, b) => a.ilce.localeCompare(b.ilce, 'tr'))
        : [];

    const sec = (il: string, ilce: string) => { onSecim(il, ilce); kapat(); };

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

            <BottomSheet open={acik} onClose={kapat} title="Konum seç">
                <input
                    type="search"
                    className={styles.konumAramaGiris}
                    aria-label="İl veya ilçe ara"
                    placeholder="İl veya ilçe ara…"
                    value={sorgu}
                    onChange={e => setSorgu(e.target.value)}
                />

                {sorgu ? (
                    sonuclar.length === 0 ? (
                        <p className={styles.konumBosNot}>
                            Sonuç yok. Birim maliyeti aşağıdan elle girebilirsiniz.
                        </p>
                    ) : (
                        <>
                            <ul className={styles.konumListe}>
                                {sonuclar.map(k => (
                                    <li key={`${k.il}-${k.ilce}`}>
                                        <button
                                            type="button"
                                            className={styles.konumListeSatir}
                                            onClick={() => sec(k.il, k.ilce)}
                                        >
                                            <span className={styles.konumSeciciBaslik}>{`${k.il} / ${k.ilce}`}</span>
                                            <span className={styles.konumSeciciAlt}>
                                                {`Piyasa ${nf.format(k.avgSalesPricePerM2)} · Birim ${nf.format(k.avgUnitConstructionPrice)} TL/m²`}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {kesildi && (
                                <p className={styles.konumBosNot}>
                                    Çok fazla sonuç var, aramayı daraltın.
                                </p>
                            )}
                        </>
                    )
                ) : acilanIl ? (
                    <>
                        <button
                            type="button"
                            className={styles.konumGeri}
                            onClick={() => setAcilanIl(null)}
                        >
                            ← İl listesi
                        </button>
                        <ul className={styles.konumListe}>
                            {ilceler.map(k => (
                                <li key={`${k.il}-${k.ilce}`}>
                                    <button
                                        type="button"
                                        className={styles.konumListeSatir}
                                        onClick={() => sec(k.il, k.ilce)}
                                    >
                                        <span className={styles.konumSeciciBaslik}>{k.ilce}</span>
                                        <span className={styles.konumSeciciAlt}>
                                            {`Piyasa ${nf.format(k.avgSalesPricePerM2)} · Birim ${nf.format(k.avgUnitConstructionPrice)} TL/m²`}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <ul className={styles.konumListe}>
                        {iller.map(il => (
                            <li key={il}>
                                <button
                                    type="button"
                                    className={styles.konumListeSatir}
                                    onClick={() => setAcilanIl(il)}
                                >
                                    <span className={styles.konumSeciciBaslik}>{il}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </BottomSheet>
        </div>
    );
}
