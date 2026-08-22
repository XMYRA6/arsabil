/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioComparison } from './ScenarioComparison';
import type { ScenarioComparisonRow } from '@/lib/studio/scenarioComparison';

describe('ScenarioComparison', () => {
  const mockRows: ScenarioComparisonRow[] = [
    {
      scenarioId: 'sc-1',
      scenarioName: 'Varsayılan Senaryo',
      totalAllocatedAreaM2: 1200,
      grossConstructionAreaM2: 2000,
      remainingAreaM2: 800,
      residentialUnitCountByType: { '2+1': 8, '3+1': 2 },
      totalResidentialUnits: 10,
      commercialUnitCount: 2,
      commercialAreaM2: 200,
      landownerEntitledUnits: 5,
      landownerOfferedUnits: 5,
      landownerFractionalBalance: 0,
      landownerCashEqualizationTl: 0,
      cashEqualizationStatus: 'calculated',
      needsRebalance: false,
      warningCount: 0,
      warnings: [],
    },
    {
      scenarioId: 'sc-2',
      scenarioName: 'Alternatif 1',
      totalAllocatedAreaM2: 1500,
      grossConstructionAreaM2: 2000,
      remainingAreaM2: 500,
      residentialUnitCountByType: { '3+1': 10 },
      totalResidentialUnits: 10,
      commercialUnitCount: 0,
      commercialAreaM2: 0,
      landownerEntitledUnits: 5,
      landownerOfferedUnits: 5,
      landownerFractionalBalance: 0,
      landownerCashEqualizationTl: null,
      cashEqualizationStatus: 'assumption_required',
      needsRebalance: true,
      warningCount: 1,
      warnings: [{ code: 'OFFER_NEEDS_REBALANCE', message: 'Teklif dengesi kontrol edilmeli' }],
    },
  ];

  const defaultProps = {
    rows: mockRows,
    activeScenarioId: 'sc-1',
    canAddMore: true,
    onSelectScenario: jest.fn(),
    onDeleteScenario: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('senaryolari ve karsilastirma metriklerini render eder', () => {
    render(<ScenarioComparison {...defaultProps} />);

    expect(screen.getByText('Senaryo Karşılaştırması')).toBeInTheDocument();
    expect(screen.getByText('Varsayılan Senaryo')).toBeInTheDocument();
    expect(screen.getByText('Alternatif 1')).toBeInTheDocument();
    expect(screen.getByText('1.200 m²')).toBeInTheDocument();
    expect(screen.getByText('1.500 m²')).toBeInTheDocument();
  });

  it('degerleme varsayimi eksik oldugunda "Varsayım gerekli" gosterir', () => {
    render(<ScenarioComparison {...defaultProps} />);

    expect(screen.getByText('Varsayım gerekli')).toBeInTheDocument();
  });

  it('Senaryo secildiğinde onSelectScenario cagrilir', () => {
    render(<ScenarioComparison {...defaultProps} />);

    const selectBtns = screen.getAllByRole('button', { name: /Aktif Yap/i });
    fireEvent.click(selectBtns[0]);

    expect(defaultProps.onSelectScenario).toHaveBeenCalledWith('sc-2');
  });

  it('Senaryo silme butonuna basildiginda onDeleteScenario cagrilir', () => {
    render(<ScenarioComparison {...defaultProps} />);

    const deleteBtn = screen.getByRole('button', { name: /Alternatifi Sil/i });
    fireEvent.click(deleteBtn);

    expect(defaultProps.onDeleteScenario).toHaveBeenCalledWith('sc-2');
  });
});
