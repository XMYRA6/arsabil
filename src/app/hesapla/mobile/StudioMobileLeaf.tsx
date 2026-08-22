"use client";

import { StudioPreview, type GeometrySourceStatus } from '@/components/studio/StudioPreview';
import type { BuildingMass, ProgramBand, ProgramMixItem, StudioLayoutDraft, StudioWarning } from '@/lib/studio/types';
import styles from './mobile.module.css';

export type StudioMobileLeafProps = {
    mass: BuildingMass | null;
    warnings: StudioWarning[];
    geometrySource: string;
    geometryStatus: GeometrySourceStatus;
    constructionAreaSource: string;
    constructionAreaEstimated: boolean;
    /** Faz 2A Task 4 — masaustuyle AYNI program envanteri, 3D bantlar/legend
     * icin (bkz. StudioPreview.tsx). */
    programMixItems?: ProgramMixItem[];
    /** Faz 3A Task 5 bullet 2 — masaustuyle AYNI (sayfa seviyesinde TEK KEZ
     * hesaplanmis) bant referansi (bkz. StudioPreview.tsx). */
    programBands?: ProgramBand[];
    /** Faz 3A Task 5 bullet 1 — 2D yerlesim tahtasinin footprint'i 3D
     * kutleye aktarilir (bkz. StudioPreview.tsx). */
    layoutDraft?: StudioLayoutDraft | null;
    /** Derinlestirme yapragini kapatir — `FiyatAciklamasi.onKapat`/`AnalizSekmesi.onKapat` ile ayni desen. */
    onKapat: () => void;
};

/**
 * Mobil "3D Önizleme" derinlestirme yapragi — bilinen bosluk kapatildi:
 * Studio paneli oncesi yalnizca masaustu dalinda kabloluydu (Faz1B QA
 * bulgusu). `StudioPreview` KOPYALANMAZ, aynen sarmalanir — masaustuyle
 * ayni bilesen, ayni davranis (kapali baslar, tembel yuklenir vb.).
 */
export function StudioMobileLeaf({ onKapat, ...studioProps }: StudioMobileLeafProps) {
    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>3D Önizleme</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>
            <StudioPreview {...studioProps} />
        </>
    );
}
