/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudioScenarioLibrary } from './StudioScenarioLibrary';

describe('StudioScenarioLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('isOpen false iken hicbir sey render etmez', () => {
    const { container } = render(
      <StudioScenarioLibrary
        isOpen={false}
        onClose={jest.fn()}
        onLoadScenarioVersion={jest.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('isOpen true iken senaryo listesini yukler ve gosterir', async () => {
    const mockScenarios = [
      {
        id: 'sc-1',
        name: 'Proje A',
        parcelSourceStatus: 'verified_tkgm',
        currentVersionNumber: 2,
        updatedAt: '2026-08-22T12:00:00.000Z',
        parcelIdentity: { il: 'İstanbul', ilce: 'Kadıköy' },
        latestVersion: { needsRebalance: false },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ scenarios: mockScenarios }),
    });

    render(
      <StudioScenarioLibrary
        isOpen={true}
        onClose={jest.fn()}
        onLoadScenarioVersion={jest.fn()}
      />
    );

    expect(screen.getByText('Senaryo Kütüphanesi')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Proje A')).toBeInTheDocument();
      expect(screen.getByText('TKGM')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
    });
  });

  it('Taslak Olarak Aç butonuna basildiginda versiyon detayini getirip callbacki tetikler', async () => {
    const onLoadScenarioVersion = jest.fn();
    const onClose = jest.fn();

    const mockScenarios = [
      {
        id: 'sc-1',
        name: 'Proje A',
        parcelSourceStatus: 'verified_tkgm',
        currentVersionNumber: 1,
        updatedAt: '2026-08-22T12:00:00.000Z',
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scenarios: mockScenarios }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: {
            id: 'ver-1',
            versionNumber: 1,
            snapshot: {
              schemaVersion: 1,
              massingInput: { parcelAreaM2: 1000 },
            },
          },
        }),
      });

    render(
      <StudioScenarioLibrary
        isOpen={true}
        onClose={onClose}
        onLoadScenarioVersion={onLoadScenarioVersion}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Proje A')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Taslak Olarak Aç'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/studio/scenarios/sc-1/versions/1');
      expect(onLoadScenarioVersion).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
