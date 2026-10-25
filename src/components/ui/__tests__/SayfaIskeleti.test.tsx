/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import path from 'path';
import { SayfaIskeleti, type IskeletVaryant } from '../SayfaIskeleti';
import ProfileLoading from '@/app/profile/[userId]/loading';
import CompareLoading from '@/app/compare/[token]/loading';
import StudioShareLoading from '@/app/studio/share/[token]/loading';

describe('SayfaIskeleti', () => {
  it.each<IskeletVaryant>(['liste', 'detay', 'panel'])(
    'renders role=status with aria-busy and an accessible label (%s)',
    (varyant) => {
      render(<SayfaIskeleti varyant={varyant} />);
      const root = screen.getByRole('status');
      expect(root.getAttribute('aria-busy')).toBe('true');
      expect(root.getAttribute('aria-label')).toBe('Yükleniyor');
      expect(root.textContent).toContain('Yükleniyor…');
    },
  );

  it('liste variant renders six card blocks', () => {
    render(<SayfaIskeleti varyant="liste" />);
    const bloklar = screen.getAllByTestId('iskelet-blok');
    expect(bloklar).toHaveLength(7);
    expect(bloklar.filter((b) => b.getAttribute('data-kind') === 'kart')).toHaveLength(6);
  });

  it.each([
    ['profile', ProfileLoading],
    ['compare', CompareLoading],
    ['studio/share', StudioShareLoading],
  ])('%s loading.tsx default export renders SayfaIskeleti', (_n, Loading) => {
    render(<Loading />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getAllByTestId('iskelet-blok').length).toBeGreaterThan(0);
  });

  it('css uses transform shimmer with reduced-motion fallback', () => {
    const css = readFileSync(path.join(__dirname, '../SayfaIskeleti.module.css'), 'utf8');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('translateX');
    expect(css).not.toMatch(/@keyframes[^{]*\{[^]*background-position/);
    expect(css).toContain('::after');
  });
});
