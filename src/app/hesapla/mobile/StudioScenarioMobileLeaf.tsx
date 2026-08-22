"use client";

import React from 'react';
import { StudioScenarioBar } from '@/components/studio/StudioScenarioBar';
import { ScenarioComparison } from '@/components/studio/ScenarioComparison';
import styles from './mobile.module.css';
import type { ScenarioComparisonRow } from '@/lib/studio/scenarioComparison';
import type { ScenarioHistoryEntry, StudioScenarioDraft } from '@/lib/studio/types';

export type StudioScenarioMobileLeafProps = {
  activeScenario: StudioScenarioDraft;
  allScenarios: StudioScenarioDraft[];
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  needsRebalance?: boolean;
  historyEntries?: ScenarioHistoryEntry[];
  comparisonRows: ScenarioComparisonRow[];
  canAddMore?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNameChange: (newName: string) => void;
  onAddAlternative?: () => void;
  onSelectScenario: (scenarioId: string) => void;
  onDeleteScenario?: (scenarioId: string) => void;
  onRebalanceClick?: () => void;
  onSaveClick?: () => void;
  onLibraryClick?: () => void;
  onShareClick?: () => void;
  onPdfClick?: () => void;
  savedScenarioId?: string | null;
  savedScenarioVersionNumber?: number | null;
  onKapat: () => void;
};

/**
 * Mobil "Senaryolar & Karşılaştırma" derinleştirme yaprağı (Faz 3B & 4A & 4B).
 * Masaüstü StudioScenarioBar ve ScenarioComparison bileşenlerini mobilde
 * aynen sarmalar (kopyalamaz).
 */
export function StudioScenarioMobileLeaf({
  activeScenario,
  allScenarios,
  canUndo,
  canRedo,
  isDirty,
  needsRebalance,
  historyEntries,
  comparisonRows,
  canAddMore,
  onUndo,
  onRedo,
  onNameChange,
  onAddAlternative,
  onSelectScenario,
  onDeleteScenario,
  onRebalanceClick,
  onSaveClick,
  onLibraryClick,
  onShareClick,
  onPdfClick,
  savedScenarioId,
  savedScenarioVersionNumber,
  onKapat,
}: StudioScenarioMobileLeafProps) {
  return (
    <>
      <header className={styles.analizKapatSatiri}>
        <h2 className={styles.aciklamaBaslikMetin}>Senaryolar & Karşılaştırma</h2>
        <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
          Kapat
        </button>
      </header>

      <div style={{ marginBottom: 16 }}>
        <StudioScenarioBar
          activeScenario={activeScenario}
          allScenarios={allScenarios}
          canUndo={canUndo}
          canRedo={canRedo}
          isDirty={isDirty}
          needsRebalance={needsRebalance}
          historyEntries={historyEntries}
          onUndo={onUndo}
          onRedo={onRedo}
          onNameChange={onNameChange}
          onAddAlternative={onAddAlternative}
          onSelectScenario={onSelectScenario}
          onRebalanceClick={onRebalanceClick}
          onSaveClick={onSaveClick}
          onLibraryClick={onLibraryClick}
          onShareClick={onShareClick}
          onPdfClick={onPdfClick}
          savedScenarioId={savedScenarioId}
          savedScenarioVersionNumber={savedScenarioVersionNumber}
        />
      </div>

      <ScenarioComparison
        rows={comparisonRows}
        activeScenarioId={activeScenario.id}
        canAddMore={canAddMore}
        onSelectScenario={onSelectScenario}
        onDeleteScenario={onDeleteScenario}
      />
    </>
  );
}
