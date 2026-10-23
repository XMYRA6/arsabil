/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ShareProposalDialog } from './ShareProposalDialog';
import type { StudioProposalViewModel } from '@/lib/studio/proposalViewModel';

describe('ShareProposalDialog', () => {
  const mockViewModel: StudioProposalViewModel = {
    projectContext: {
      scenarioId: 'sc-1',
      scenarioName: 'Test Proje',
      versionNumber: 1,
      createdAtIso: '2026-08-22T10:00:00.000Z',
      createdAtFormatted: '22 Ağustos 2026',
      parcelIdentity: null,
      parcelSourceStatus: 'verified_tkgm',
      parcelAreaM2: 1000,
      grossConstructionAreaM2: 2000,
      grossConstructionAreaSource: 'Otoriter',
    },
    massingAnd2D: {
      footprintAreaM2: 400,
      buildingHeightM: 15,
      floorCount: 5,
      coveragePercentage: 40,
      rotationDeg: 0,
      setback: null,
      commercialFrontage: null,
    },
    programSummary: {
      items: [],
      totalAllocatedAreaM2: 0,
      residentialUnitCount: 0,
      commercialUnitCount: 0,
      unallocatedAreaM2: 2000,
    },
    landownerOfferSummary: {
      entitledUnitCount: 8,
      offeredWholeUnits: 8,
      fractionalUnitBalance: 0,
      cashEqualizationTl: null,
      isCustom: false,
      disclaimerText: 'Ön fizibilite senaryosudur.',
    },
    financialAssumptions: {
      unitValueTl: 5000000,
      unitValuePerM2Tl: 50000,
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
    snapshotHash: 'h-1',
    schemaVersion: 1,
  };

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/share')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ tokens: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // useKeyboardInset ile ayni desen (StudioSaveDialog/ParcelVerificationSheet) —
  // dialog klavye acikken --keyboard-inset ile kucculur.
  it('klavye acilinca (visualViewport kucculunce) dialog --keyboard-inset ile kucculur', async () => {
    class FakeVisualViewport extends EventTarget {
      height = 844
      offsetTop = 0
      resizeTo(height: number) {
        this.height = height
        this.dispatchEvent(new Event('resize'))
      }
    }
    const fakeVv = new FakeVisualViewport()
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })
    Object.defineProperty(window, 'visualViewport', { value: fakeVv, configurable: true })

    render(
      <ShareProposalDialog
        isOpen={true}
        onClose={jest.fn()}
        scenarioId="sc-1"
        versionNumber={1}
        scenarioName="Test Proje"
        viewModel={mockViewModel}
      />
    );
    await screen.findByRole('button', { name: /Paylaşım Bağlantısı Oluştur/i });

    const dialog = screen.getByTestId('share-proposal-dialog').firstChild as HTMLElement;
    expect(dialog.style.getPropertyValue('--keyboard-inset')).toBe('0px');

    act(() => fakeVv.resizeTo(844 - 320));
    expect(dialog.style.getPropertyValue('--keyboard-inset')).toBe('320px');
  });

  it('modal acildiginda readiness durumunu ve gizlilik notunu basar', async () => {
    render(
      <ShareProposalDialog
        isOpen={true}
        onClose={jest.fn()}
        scenarioId="sc-1"
        versionNumber={1}
        scenarioName="Test Proje"
        viewModel={mockViewModel}
      />
    );

    expect(screen.getByText('Senaryoyu Güvenle Paylaş')).toBeInTheDocument();
    expect(screen.getByText('✓ Paylaşıma Hazır')).toBeInTheDocument();
    expect(screen.getByText('Gizlilik Garantisi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paylaşım Bağlantısı Oluştur/i })).toBeInTheDocument();
  });

  it('needsRebalance true iken olusturma butonunu devre disi birakir', () => {
    const blockedVm: StudioProposalViewModel = {
      ...mockViewModel,
      warningsAndBadges: {
        ...mockViewModel.warningsAndBadges,
        needsRebalance: true,
      },
    };

    render(
      <ShareProposalDialog
        isOpen={true}
        onClose={jest.fn()}
        scenarioId="sc-1"
        versionNumber={1}
        scenarioName="Test Proje"
        viewModel={blockedVm}
      />
    );

    expect(screen.getByText('Paylaşım Engellendi')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Paylaşım Bağlantısı Oluştur/i });
    expect(btn).toBeDisabled();
  });

  it('baglanti olustur butonuna tiklandiginda POST istegi atar ve linki gosterir', async () => {
    (global.fetch as jest.Mock).mockImplementation((url, opts) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            tokenRecord: { token: 'new-token-123', isActive: true },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ tokens: [] }),
      });
    });

    render(
      <ShareProposalDialog
        isOpen={true}
        onClose={jest.fn()}
        scenarioId="sc-1"
        versionNumber={1}
        scenarioName="Test Proje"
        viewModel={mockViewModel}
      />
    );

    const createBtn = await screen.findByRole('button', { name: /Paylaşım Bağlantısı Oluştur/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Aktif Paylaşım Bağlantısı')).toBeInTheDocument();
      expect(screen.getByDisplayValue(/new-token-123/)).toBeInTheDocument();
    });
  });
});
