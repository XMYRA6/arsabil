/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProposalVisualCapture } from './ProposalVisualCapture';

describe('ProposalVisualCapture', () => {
  it('dogrulanmis geometri durumunda rozet ve SVG ciktisini dogru basar', () => {
    render(
      <ProposalVisualCapture
        parcelPolygon={{
          points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 30 }, { x: 0, y: 30 }],
          source: 'verified_tkgm',
        }}
        parcelSourceStatus="verified_tkgm"
        caption="Kadıköy 200/1 Yerleşim Planı"
      />
    );

    expect(screen.getByTestId('proposal-visual-capture')).toBeInTheDocument();
    expect(screen.getByText('✓ TKGM Doğrulanmış')).toBeInTheDocument();
    expect(screen.getByText('Kadıköy 200/1 Yerleşim Planı')).toBeInTheDocument();
  });

  it('demo geometri durumunda uyari rozetini gosterir', () => {
    render(
      <ProposalVisualCapture
        parcelPolygon={null}
        parcelSourceStatus="demo"
      />
    );

    expect(screen.getByText('⚠️ Demo Geometri')).toBeInTheDocument();
  });
});
