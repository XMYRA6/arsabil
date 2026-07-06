/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { SealBadge } from './SealBadge';

describe('SealBadge', () => {
  it('show=false iken hiçbir şey render etmez', () => {
    render(<SealBadge show={false} percentage={0} variant="cheaper" />);
    expect(screen.queryByText(/DAHA UCUZ/)).not.toBeInTheDocument();
  });

  it('show=true ve variant=cheaper iken yüzdeyi ve UCUZ metnini gösterir', () => {
    render(<SealBadge show={true} percentage={33} variant="cheaper" />);
    expect(screen.getByText(/Piyasaya Göre: %33 DAHA UCUZ/)).toBeInTheDocument();
  });

  it('show=true ve variant=pricier iken yüzdeyi ve PAHALI metnini gösterir', () => {
    render(<SealBadge show={true} percentage={12} variant="pricier" />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA PAHALI/)).toBeInTheDocument();
  });

  it('variant=cheaper rozeti mevcut topResultBadge class\'ını, variant=pricier ek olarak topResultBadgePricier class\'ını almalı', () => {
    const { container: cheaperContainer } = render(<SealBadge show={true} percentage={10} variant="cheaper" />);
    const { container: pricierContainer } = render(<SealBadge show={true} percentage={10} variant="pricier" />);
    expect(cheaperContainer.querySelector('[class*="topResultBadgePricier"]')).toBeNull();
    expect(pricierContainer.querySelector('[class*="topResultBadgePricier"]')).not.toBeNull();
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
    render(<SealBadge show={true} percentage={12} variant="cheaper" />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });

  it('reduced motion kapalıyken de rozet metni görünür olmalı (animasyonlu render)', () => {
    setMatchMedia(false);
    render(<SealBadge show={true} percentage={12} variant="cheaper" />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });
});
