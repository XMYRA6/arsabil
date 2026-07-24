/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { HesapFisi } from './HesapFisi';
import { CalculationOutput } from '@/lib/calculator/engine_v2';

const baseResult: CalculationOutput = {
  Mi_base: 12000000,
  Mz: 0,
  Z: 0,
  Mi: 12000000,
  Ma: 5142857,
  M: 17142857,
  FD_total: 22285714,
  FD_per_m2: 159183,
  Sdx: null,
  FA: null,
  FAbirim: null,
};

describe('HesapFisi', () => {
  it('result null iken tüm satırlarda "—" gösterir', () => {
    render(<HesapFisi result={null} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('Mi, Ma, M, FD, FDbirim satırlarını gösterir', () => {
    render(<HesapFisi result={baseResult} />);
    expect(screen.getByText('12.000.000 TL')).toBeInTheDocument();
    expect(screen.getByText('5.142.857 TL')).toBeInTheDocument();
    expect(screen.getByText('17.142.857 TL')).toBeInTheDocument();
    expect(screen.getByText('22.285.714 TL')).toBeInTheDocument();
    expect(screen.getByText('159.183 TL/m²')).toBeInTheDocument();
  });

  it('FA null iken Arsa Fiyatı satırı hiç render edilmez', () => {
    render(<HesapFisi result={baseResult} />);
    expect(screen.queryByText(/Arsa Fiyatı \(FA\)/)).not.toBeInTheDocument();
  });

  it('FA doluyken Arsa Fiyatı satırı render edilir', () => {
    render(<HesapFisi result={{ ...baseResult, FA: 133714284, Sdx: 6 }} />);
    expect(screen.getByText(/Arsa Fiyatı \(FA\)/)).toBeInTheDocument();
    expect(screen.getByText('133.714.284 TL')).toBeInTheDocument();
  });
});
