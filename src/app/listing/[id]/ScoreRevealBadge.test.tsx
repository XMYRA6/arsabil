/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ScoreRevealBadge } from './ScoreRevealBadge';

describe('ScoreRevealBadge', () => {
  it('skoru ve /100 etiketini FizibiliteScoreBadge üzerinden render eder', () => {
    render(<ScoreRevealBadge score={82} size="lg" showLabel />);
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
    expect(screen.getByText('Yüksek')).toBeInTheDocument();
  });

  it('showLabel verilmediğinde etiket metnini göstermez', () => {
    render(<ScoreRevealBadge score={45} size="md" />);
    expect(screen.queryByText('Riskli')).not.toBeInTheDocument();
  });
});

describe('ScoreRevealBadge — prefers-reduced-motion', () => {
  const setMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  };

  it('prefers-reduced-motion: reduce iken de skor görünür olmalı (animasyonsuz render)', () => {
    setMatchMedia(true);
    render(<ScoreRevealBadge score={70} size="lg" showLabel />);
    expect(screen.getByText('70')).toBeInTheDocument();
  });

  it('reduced motion kapalıyken de skor görünür olmalı (animasyonlu render)', () => {
    setMatchMedia(false);
    render(<ScoreRevealBadge score={70} size="lg" showLabel />);
    expect(screen.getByText('70')).toBeInTheDocument();
  });
});
