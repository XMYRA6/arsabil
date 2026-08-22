/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioProposalPreview } from './StudioProposalPreview';
import type { StudioProposalViewModel } from '@/lib/studio/proposalViewModel';

describe('StudioProposalPreview', () => {
  const mockViewModel: StudioProposalViewModel = {
    projectContext: {
      scenarioId: 'sc-1',
      scenarioName: 'Fenerbahçe Konut Projesi',
      versionNumber: 1,
      createdAtIso: '2026-08-22T10:00:00.000Z',
      createdAtFormatted: '22 Ağustos 2026',
      parcelIdentity: {
        il: 'İstanbul',
        ilce: 'Kadıköy',
        mahalle: 'Fenerbahçe',
        adaNo: '200',
        parselNo: '1',
      },
      parcelSourceStatus: 'verified_tkgm',
      parcelAreaM2: 1200,
      grossConstructionAreaM2: 3000,
      grossConstructionAreaSource: 'Otoriter imar verisi',
    },
    massingAnd2D: {
      footprintAreaM2: 480,
      buildingHeightM: 18,
      floorCount: 6,
      coveragePercentage: 40,
      rotationDeg: 0,
      setback: { frontM: 5, sideM: 3, rearM: 3 },
      commercialFrontage: { edgeIndex: 0, lengthM: 20 },
    },
    programSummary: {
      items: [
        {
          id: 'p-1',
          use: 'residential',
          useLabel: 'Konut',
          unitCount: 20,
          averageUnitAreaM2: 120,
          allocatedAreaM2: 2400,
        },
      ],
      totalAllocatedAreaM2: 2400,
      residentialUnitCount: 20,
      commercialUnitCount: 0,
      unallocatedAreaM2: 600,
    },
    landownerOfferSummary: {
      entitledUnitCount: 10.2,
      offeredWholeUnits: 10,
      fractionalUnitBalance: 0.2,
      cashEqualizationTl: 500000,
      isCustom: false,
      disclaimerText: 'Ön fizibilite senaryosudur.',
    },
    financialAssumptions: {
      unitValueTl: 8000000,
      unitValuePerM2Tl: 66667,
      shopValueTl: null,
      valuationDate: '2026-08-22',
      currency: 'TL',
    },
    warningsAndBadges: {
      warnings: [],
      warningCount: 0,
      needsRebalance: false,
      isDemoGeometry: false,
      isAuthoritativeArea: true,
      sourceBadgeLabel: 'Doğrulanmış Parsel',
    },
    snapshotHash: 'hash-123',
    schemaVersion: 1,
  };

  it('senaryo detaylarini ve teklif bilgilerini eksiksiz basar', () => {
    render(<StudioProposalPreview viewModel={mockViewModel} />);

    expect(screen.getByText('Fenerbahçe Konut Projesi')).toBeInTheDocument();
    expect(screen.getByText('Versiyon 1')).toBeInTheDocument();
    expect(screen.getByText('Doğrulanmış Parsel')).toBeInTheDocument();
    expect(screen.getByText('1.200 m²')).toBeInTheDocument(); // Parsel alanı
    expect(screen.getByText('3.000 m²')).toBeInTheDocument(); // Toplam inşaat
    expect(screen.getByText('10.20 Daire')).toBeInTheDocument(); // Hak ediş
    expect(screen.getByText('10 Daire')).toBeInTheDocument(); // Önerilen tam daire
    expect(screen.getByText('500.000 TL')).toBeInTheDocument(); // Nakit dengeleme
  });

  it('onDownloadPdf butonu varsa tiklandiginda callback calisir', () => {
    const onDownloadPdf = jest.fn();
    render(
      <StudioProposalPreview
        viewModel={mockViewModel}
        onDownloadPdf={onDownloadPdf}
      />
    );

    const btn = screen.getByRole('button', { name: /PDF İndir/i });
    fireEvent.click(btn);
    expect(onDownloadPdf).toHaveBeenCalledTimes(1);
  });
});
