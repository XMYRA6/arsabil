/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { HesapOzetiSeridi } from './HesapOzetiSeridi';

describe('HesapOzetiSeridi', () => {
  it('Sd kapalıyken sadece % gösterir, daire detayı göstermez', () => {
    render(
      <HesapOzetiSeridi
        fdTotal={23328000}
        isApartmentCountEnabled={false}
        effectiveLandSharePercent={30}
        ownerApartmentShare={0}
        totalApartments={0}
        manualMarketPrice=""
        onMarketPriceChange={() => {}}
        marketPriceNum={0}
      />
    );
    expect(screen.getByText('%30')).toBeInTheDocument();
    expect(screen.queryByText(/daire\)/)).not.toBeInTheDocument();
  });

  it('fiyatın "Min." niteleyicisiyle etiketlendiğini gösterir (bkz. final review Finding 1)', () => {
    render(
      <HesapOzetiSeridi
        fdTotal={23328000}
        isApartmentCountEnabled={false}
        effectiveLandSharePercent={30}
        ownerApartmentShare={0}
        totalApartments={0}
        manualMarketPrice=""
        onMarketPriceChange={() => {}}
        marketPriceNum={0}
      />
    );
    expect(screen.getByText('Min. Daire Fiyatı')).toBeInTheDocument();
  });

  it('Sd açıkken daire detayını da gösterir', () => {
    render(
      <HesapOzetiSeridi
        fdTotal={23328000}
        isApartmentCountEnabled={true}
        effectiveLandSharePercent={30}
        ownerApartmentShare={6}
        totalApartments={20}
        manualMarketPrice=""
        onMarketPriceChange={() => {}}
        marketPriceNum={0}
      />
    );
    expect(screen.getByText('(6/20 daire)')).toBeInTheDocument();
  });

  it('piyasa fiyatı boşken hiçbir SealBadge render edilmez', () => {
    render(
      <HesapOzetiSeridi
        fdTotal={23328000}
        isApartmentCountEnabled={false}
        effectiveLandSharePercent={30}
        ownerApartmentShare={0}
        totalApartments={0}
        manualMarketPrice=""
        onMarketPriceChange={() => {}}
        marketPriceNum={0}
      />
    );
    expect(screen.queryByText(/DAHA UCUZ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/DAHA PAHALI/)).not.toBeInTheDocument();
  });

  it('piyasa fiyatı gerçek FD_total\'dan yüksekse UCUZ rozeti çıkar', () => {
    render(
      <HesapOzetiSeridi
        fdTotal={20000000}
        isApartmentCountEnabled={false}
        effectiveLandSharePercent={30}
        ownerApartmentShare={0}
        totalApartments={0}
        manualMarketPrice="25.000.000"
        onMarketPriceChange={() => {}}
        marketPriceNum={25000000}
      />
    );
    expect(screen.getByText(/DAHA UCUZ/)).toBeInTheDocument();
  });

  it('input değişimi onMarketPriceChange\'i çağırır', () => {
    const handleChange = jest.fn();
    render(
      <HesapOzetiSeridi
        fdTotal={0}
        isApartmentCountEnabled={false}
        effectiveLandSharePercent={0}
        ownerApartmentShare={0}
        totalApartments={0}
        manualMarketPrice=""
        onMarketPriceChange={handleChange}
        marketPriceNum={0}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('opsiyonel'), { target: { value: '25000000' } });
    expect(handleChange).toHaveBeenCalledWith('25000000');
  });
});
