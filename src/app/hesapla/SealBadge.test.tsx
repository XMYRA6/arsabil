/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { SealBadge } from './SealBadge';

describe('SealBadge', () => {
  it('show=false iken hiçbir şey render etmez', () => {
    render(<SealBadge show={false} percentage={0} />);
    expect(screen.queryByText(/DAHA UCUZ/)).not.toBeInTheDocument();
  });

  it('show=true iken yüzdeyi doğru gösterir', () => {
    render(<SealBadge show={true} percentage={33} />);
    expect(screen.getByText(/Piyasaya Göre: %33 DAHA UCUZ/)).toBeInTheDocument();
  });
});

describe('SealBadge — prefers-reduced-motion', () => {
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

  it('prefers-reduced-motion: reduce iken de rozet metni görünür olmalı (animasyonsuz render)', () => {
    setMatchMedia(true);
    render(<SealBadge show={true} percentage={12} />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });

  it('reduced motion kapalıyken de rozet metni görünür olmalı (animasyonlu render)', () => {
    setMatchMedia(false);
    render(<SealBadge show={true} percentage={12} />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });
});
