/** @jest-environment jsdom */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { LandownerOfferPanel } from './LandownerOfferPanel';
import type { ProgramMixItem, ValuationAssumptions } from '@/lib/studio/types';

function assumptions(overrides: Partial<ValuationAssumptions> = {}): ValuationAssumptions {
  return {
    currency: 'TRY',
    valuationDate: '2026-08-22',
    unitValueTl: 2_000_000,
    unitValuePerM2Tl: null,
    shopValueTl: null,
    shopRentMultiplierMonthly: null,
    ...overrides,
  };
}

describe('LandownerOfferPanel', () => {
  it('kesirli hak edisi (9.2) tam/kesir dagilimiyla ust satirda gosterir', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    // 0.4 * 23 = 9.2
    expect(screen.getByText(/9,2 birim eşdeğeri/i)).toBeInTheDocument();
    expect(screen.getByText(/tam:\s*9/i)).toBeInTheDocument();
    expect(screen.getByText(/kesir:\s*0,2/i)).toBeInTheDocument();
  });

  it('otomatik secenekleri karsilastirilabilir kartlar olarak sunar', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    expect(screen.getByText(/9 daire \+ 0,2 pay için nakit dengeleme/i)).toBeInTheDocument();
    expect(screen.getByText(/10 daire verilir/i)).toBeInTheDocument();
  });

  it('tam sayiya denk gelen hak ediste tek secenek gosterir', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={20}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    expect(screen.getByText(/pay tam sayıya denk geliyor/i)).toBeInTheDocument();
  });

  it('degerleme eksikse para alanini engellemez, varsayim formuna yonlendiren bir not gosterir', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={null}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    expect(screen.getByText(/değerleme varsayımı girilmedi/i)).toBeInTheDocument();
    // Varsayim formu (unitValueTl girdisi) yine erisilebilir olmali.
    expect(screen.getByLabelText(/daire değeri/i)).toBeInTheDocument();
  });

  it('varsayim formundaki daire degeri degistirilince onValuationAssumptionsChange cagirilir', () => {
    const onChange = jest.fn();
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={onChange}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/daire değeri/i), { target: { value: '2500000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ unitValueTl: 2_500_000 }));
  });

  it('ozel teklif uygulaninca customOverride secenegi karta eklenir', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={{ unitCount: 8, cashTl: 3_000_000 }}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('offer-option-custom')).toBeInTheDocument();
  });

  it('ozel teklifte negatif nakit girilirse dogrulama uyarisi karar yolunu kapatmadan gorunur', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={{ unitCount: 8, cashTl: -1000 }}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    expect(screen.getByText(/nakit tutarı negatif olamaz/i)).toBeInTheDocument();
    // uyari goruntuyu bloklamaz — ozel teklif secenegi yine render edilir.
    expect(screen.getByTestId('offer-option-custom')).toBeInTheDocument();
  });

  it('kesirli hak edis varken ozel teklifte nakit sifirsa kesir gizleme uyarisi gorunur', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={{ unitCount: 9, cashTl: 0 }}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    expect(screen.getByText(/kesir gizlenmiş görünebilir/i)).toBeInTheDocument();
  });

  it('otomatik secenekler "hesaplanan", ozel teklif "elle girilen" olarak etiketlenir', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={{ unitCount: 8, cashTl: 400_000 }}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    const roundDown = screen.getByTestId('offer-option-round-down');
    expect(within(roundDown).getByText(/hesaplanan/i)).toBeInTheDocument();
    const custom = screen.getByTestId('offer-option-custom');
    expect(within(custom).getByText(/elle girilen/i)).toBeInTheDocument();
  });

  it('hukuki baglayicilik iddia etmeyen bir uygunluk notu gosterir', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    expect(screen.getByText(/bağlayıcı bir teklif değildir/i)).toBeInTheDocument();
  });

  it('program dagiliminda ticari/dukkan alani varsa ayri gelir varsayimi notu gosterir', () => {
    const items: ProgramMixItem[] = [
      { id: 'shop-1', use: 'commercial', unitCount: 2, unitAreaM2: 60 },
    ];
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
        programMixItems={items}
      />,
    );
    expect(screen.getByText(/ticari[\s\S]*dükkan[\s\S]*ayrı[\s\S]*değerlendirilmelidir/i)).toBeInTheDocument();
  });

  it('program dagiliminda ticari kullanim yoksa ayri gelir varsayimi notu gorunmez', () => {
    const items: ProgramMixItem[] = [
      { id: 'res-1', use: 'residential', residentialType: '2+1', unitCount: 6, unitAreaM2: 85 },
    ];
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
        programMixItems={items}
      />,
    );
    expect(screen.queryByText(/ticari[\s\S]*dükkan[\s\S]*ayrı[\s\S]*değerlendirilmelidir/i)).not.toBeInTheDocument();
  });

  it('her secenek yaninda tahmini etiketi gorunur', () => {
    render(
      <LandownerOfferPanel
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={assumptions()}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
      />,
    );
    expect(screen.getAllByText(/tahmini/i).length).toBeGreaterThan(0);
  });
});
