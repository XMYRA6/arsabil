"use client";

import { Studio2DPreview } from '@/components/studio/Studio2DPreview';
import { StudioLayoutControls } from '@/components/studio/StudioLayoutControls';
import styles from './mobile.module.css';
import type { BuildingMass, ProgramBand, StudioLayoutDraft, StudioPolygon } from '@/lib/studio/types';

export type Studio2DMobileLeafProps = {
    parcelPolygon: StudioPolygon | null;
    mass: BuildingMass | null;
    layoutDraft: StudioLayoutDraft | null;
    programBands: ProgramBand[];
    onLayoutDraftChange?: (next: StudioLayoutDraft) => void;
    onParcelEkleClick?: () => void;
    /** Derinlestirme yapragini kapatir — diger studio yapraklariyla AYNI desen. */
    onKapat: () => void;
};

/**
 * Mobil "2D Yerleşim Tahtası" derinlestirme yapragi (Faz 3A) — masaustunde
 * AYRI iki panel olan `Studio2DPreview`/`StudioLayoutControls`, mobilde
 * TEK yaprakta ustuste kablolanir (ekran alani kisitli, iki ayri
 * derinlestirme adimina bolmek gereksiz sürtünme yaratirdi). Ikisi de
 * AYNEN sarmalanir — kopyalanmaz.
 */
export function Studio2DMobileLeaf({
    parcelPolygon,
    mass,
    layoutDraft,
    programBands,
    onLayoutDraftChange,
    onParcelEkleClick,
    onKapat,
}: Studio2DMobileLeafProps) {
    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>2D Yerleşim Tahtası</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>
            <Studio2DPreview
                parcelPolygon={parcelPolygon}
                mass={mass}
                layoutDraft={layoutDraft}
                programBands={programBands}
                onParcelEkleClick={onParcelEkleClick}
            />
            {mass && layoutDraft && onLayoutDraftChange && (
                <StudioLayoutControls layoutDraft={layoutDraft} onLayoutDraftChange={onLayoutDraftChange} mass={mass} />
            )}
        </>
    );
}
