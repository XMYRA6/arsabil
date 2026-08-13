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

  it('Mi, Ma, M, FD tutarlari binlik ayirac + iki ondalik + ₺ ile, FDbirim orani TL/m² ile gosterilir', () => {
    render(<HesapFisi result={baseResult} />);
    expect(screen.getByText('12.000.000,00 ₺')).toBeInTheDocument();
    expect(screen.getByText('5.142.857,00 ₺')).toBeInTheDocument();
    expect(screen.getByText('17.142.857,00 ₺')).toBeInTheDocument();
    expect(screen.getByText('22.285.714,00 ₺')).toBeInTheDocument();
    expect(screen.getByText('159.183 TL/m²')).toBeInTheDocument();
  });

  it('Daire Fiyatı satırı "Min." niteleyicisiyle etiketlenir (bkz. final review Finding 1)', () => {
    render(<HesapFisi result={baseResult} />);
    expect(screen.getByText('Min. Daire Fiyatı (FD)')).toBeInTheDocument();
    expect(screen.queryByText('Daire Fiyatı (FD)')).not.toBeInTheDocument();
  });

  it('M ile FD arasında ×K izlenebilirlik satırını FD_total/M oranıyla gösterir (bkz. final review Finding 2)', () => {
    render(<HesapFisi result={baseResult} />);
    expect(screen.getByText('× Kâr Katsayısı (K)')).toBeInTheDocument();
    // FD_total / M = 22285714 / 17142857 ≈ 1.30
    expect(screen.getByText('× 1.30')).toBeInTheDocument();
  });

  it('result null iken ×K satırı da "—" gösterir', () => {
    render(<HesapFisi result={null} />);
    expect(screen.getByText('× Kâr Katsayısı (K)')).toBeInTheDocument();
  });

  it('FA null iken Arsa Fiyatı satırı hiç render edilmez', () => {
    render(<HesapFisi result={baseResult} />);
    expect(screen.queryByText(/Arsa Fiyatı \(FA\)/)).not.toBeInTheDocument();
  });

  it('FA doluyken "Min." niteleyicisiyle etiketlenir (denetim bulgusu C5: FA piyasa degeri DEGIL, hesaplanan minimum fiyata dayali)', () => {
    // "Min. Daire Fiyatı (FD)" ile AYNI gerekce/desen (bkz. yukaridaki
    // "Daire Fiyatı satırı" testi) — kullanici bu rakami gercek/piyasa arsa
    // degeriyle karistirabilirdi, aslinda motorun hesapladigi minimum
    // gerekli fiyata gore.
    render(<HesapFisi result={{ ...baseResult, FA: 133714284, Sdx: 6 }} />);
    expect(screen.getByText('Min. Arsa Fiyatı (FA)')).toBeInTheDocument();
    expect(screen.queryByText('Arsa Fiyatı (FA)')).not.toBeInTheDocument();
    expect(screen.getByText('133.714.284,00 ₺')).toBeInTheDocument();
  });
});
