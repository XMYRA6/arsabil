/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioScenarioMobileLeaf } from './StudioScenarioMobileLeaf';
import { createDefaultScenarioDraft } from '@/lib/studio/scenarioDraft';
import { buildScenarioComparison } from '@/lib/studio/scenarioComparison';

describe('StudioScenarioMobileLeaf', () => {
  const scenario1 = createDefaultScenarioDraft({
    id: 'sc-1',
    name: 'Ana Senaryo',
    baseSnapshotRef: { parcelAreaM2: 1000, grossConstructionAreaM2: 2000 },
    programMix: [{ id: 'p1', use: 'residential', residentialType: '2+1', unitCount: 10, unitAreaM2: 100 }],
    layout: null,
  });

  const comparison = buildScenarioComparison([scenario1], { parcelAreaM2: 1000, grossConstructionAreaM2: 2000, grossConstructionAreaSource: 'authoritative' }, 0.5);

  const defaultProps = {
    activeScenario: scenario1,
    allScenarios: [scenario1],
    canUndo: true,
    canRedo: false,
    isDirty: false,
    needsRebalance: false,
    historyEntries: [],
    comparisonRows: comparison.rows,
    canAddMore: true,
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onNameChange: jest.fn(),
    onAddAlternative: jest.fn(),
    onSelectScenario: jest.fn(),
    onDeleteScenario: jest.fn(),
    onRebalanceClick: jest.fn(),
    onKapat: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('baslik ve icerigi render eder ve Kapat butonuna tiklandiginda onKapat cagirir', () => {
    render(<StudioScenarioMobileLeaf {...defaultProps} />);

    expect(screen.getByText('Tasarım Senaryoları')).toBeInTheDocument();
    expect(screen.getByTestId('studio-scenario-bar')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-comparison')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Kapat/i });
    fireEvent.click(closeBtn);

    expect(defaultProps.onKapat).toHaveBeenCalledTimes(1);
  });
});
