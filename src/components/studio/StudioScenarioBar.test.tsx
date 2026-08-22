/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioScenarioBar } from './StudioScenarioBar';
import type { ScenarioHistoryEntry, StudioScenarioDraft } from '@/lib/studio/types';

describe('StudioScenarioBar', () => {
  const mockScenario: StudioScenarioDraft = {
    id: 'sc-1',
    name: 'Ana Senaryo',
    createdAt: '2026-08-22T12:00:00.000Z',
    updatedAt: '2026-08-22T12:05:00.000Z',
    baseSnapshotRef: {
      parcelAreaM2: 1000,
      grossConstructionAreaM2: 2000,
    },
    layout: null,
    programMix: [],
    valuationAssumptions: null,
    customOffer: null,
  };

  const mockHistoryEntries: ScenarioHistoryEntry[] = [
    {
      id: 'h-1',
      command: { type: 'SET_SCENARIO_NAME', payload: { name: 'Ana Senaryo' } },
      label: 'Senaryo adı güncellendi',
      timestamp: '2026-08-22T12:05:00.000Z',
      snapshot: mockScenario,
    },
    {
      id: 'h-2',
      command: { type: 'SET_PROGRAM_MIX', payload: { items: [] } },
      label: 'Program dağılımı değiştirildi',
      timestamp: '2026-08-22T12:02:00.000Z',
      snapshot: mockScenario,
    },
  ];

  const defaultProps = {
    activeScenario: mockScenario,
    allScenarios: [mockScenario],
    canUndo: true,
    canRedo: false,
    isDirty: true,
    needsRebalance: false,
    historyEntries: mockHistoryEntries,
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onNameChange: jest.fn(),
    onAddAlternative: jest.fn(),
    onCompareClick: jest.fn(),
    onSelectScenario: jest.fn(),
    onRebalanceClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('senaryo adini ve "Bu oturumda taslak" rozetini render eder', () => {
    render(<StudioScenarioBar {...defaultProps} />);

    expect(screen.getByDisplayValue('Ana Senaryo')).toBeInTheDocument();
    expect(screen.getByText('Bu oturumda taslak')).toBeInTheDocument();
  });

  it('Geri al ve Ileri al butonlarina tiklandiginda ilgili callbackleri cagirir', () => {
    render(<StudioScenarioBar {...defaultProps} canUndo={true} canRedo={true} />);

    const undoBtn = screen.getByRole('button', { name: /Geri al/i });
    const redoBtn = screen.getByRole('button', { name: /İleri al/i });

    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).not.toBeDisabled();

    fireEvent.click(undoBtn);
    expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);

    fireEvent.click(redoBtn);
    expect(defaultProps.onRedo).toHaveBeenCalledTimes(1);
  });

  it('canUndo false ise Geri al butonu disabled olur', () => {
    render(<StudioScenarioBar {...defaultProps} canUndo={false} />);
    const undoBtn = screen.getByRole('button', { name: /Geri al/i });
    expect(undoBtn).toBeDisabled();
  });

  it('needsRebalance true oldugunda "Teklifi dengele" uyarisi goruntulenir', () => {
    render(<StudioScenarioBar {...defaultProps} needsRebalance={true} />);

    const rebalanceBtn = screen.getByRole('button', { name: /Teklifi dengele/i });
    expect(rebalanceBtn).toBeInTheDocument();

    fireEvent.click(rebalanceBtn);
    expect(defaultProps.onRebalanceClick).toHaveBeenCalledTimes(1);
  });

  it('Gecmis butonuna tiklandiginda son degisiklik listesi acilir', () => {
    render(<StudioScenarioBar {...defaultProps} />);

    const historyBtn = screen.getByRole('button', { name: /Geçmiş/i });
    fireEvent.click(historyBtn);

    expect(screen.getByText('Senaryo adı güncellendi')).toBeInTheDocument();
    expect(screen.getByText('Program dağılımı değiştirildi')).toBeInTheDocument();
  });

  it('Alternatif Ekle ve Karsilastir butonlari dogru calisir', () => {
    render(<StudioScenarioBar {...defaultProps} />);

    const addAltBtn = screen.getByRole('button', { name: /Alternatif Oluştur/i });
    fireEvent.click(addAltBtn);
    expect(defaultProps.onAddAlternative).toHaveBeenCalledTimes(1);

    const compareBtn = screen.getByRole('button', { name: /Karşılaştır/i });
    fireEvent.click(compareBtn);
    expect(defaultProps.onCompareClick).toHaveBeenCalledTimes(1);
  });

  it('Klavye kisayollari (Ctrl+Z / Ctrl+Shift+Z) undo/redo tetikler', () => {
    render(<StudioScenarioBar {...defaultProps} canUndo={true} canRedo={true} />);

    // Ctrl+Z
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);

    // Ctrl+Shift+Z
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(defaultProps.onRedo).toHaveBeenCalledTimes(1);
  });

  it('Kaydet ve Kutuphane butonlarina tiklandiginda ilgili callbackleri tetikler', () => {
    const onSaveClick = jest.fn();
    const onLibraryClick = jest.fn();
    const onShareClick = jest.fn();
    const onPdfClick = jest.fn();

    render(
      <StudioScenarioBar
        {...defaultProps}
        onSaveClick={onSaveClick}
        onLibraryClick={onLibraryClick}
        onShareClick={onShareClick}
        onPdfClick={onPdfClick}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Kaydet/i });
    fireEvent.click(saveBtn);
    expect(onSaveClick).toHaveBeenCalledTimes(1);

    const libBtn = screen.getByRole('button', { name: /Kütüphane/i });
    fireEvent.click(libBtn);
    expect(onLibraryClick).toHaveBeenCalledTimes(1);

    const shareBtn = screen.getByRole('button', { name: /Paylaş/i });
    fireEvent.click(shareBtn);
    expect(onShareClick).toHaveBeenCalledTimes(1);

    const pdfBtn = screen.getByRole('button', { name: /PDF Rapor/i });
    fireEvent.click(pdfBtn);
    expect(onPdfClick).toHaveBeenCalledTimes(1);
  });
});

