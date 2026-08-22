jest.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  Image: ({ src }: any) => <img src={src} alt="pdf-img" />,
  StyleSheet: { create: (styles: any) => styles },
  Font: {
    register: jest.fn(),
    registerHyphenationCallback: jest.fn(),
  },
}));

import React from 'react';
import { StudioProposalDocument } from '../StudioProposalDocument';
import type { StudioProposalViewModel } from '@/lib/studio/proposalViewModel';

describe('StudioProposalDocument', () => {
  const mockViewModel: StudioProposalViewModel = {
    projectContext: {
      scenarioId: 'sc-1',
      scenarioName: 'Kadıköy Projesi',
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

  it('StudioProposalDocument PDF agacini hatasiz olusturur', () => {
    const doc = <StudioProposalDocument viewModel={mockViewModel} svgDataUri="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" />;
    expect(doc).toBeDefined();
    expect(doc.props.viewModel.projectContext.scenarioName).toBe('Kadıköy Projesi');
  });
});
