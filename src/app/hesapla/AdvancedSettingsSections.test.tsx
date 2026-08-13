/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BirimMaliyetField, RiskCostFields, type BirimMaliyetFieldProps } from './AdvancedSettingsSections';
import type { BirimMaliyetKaynagi } from './mobile/unitPriceSource';

/**
 * `page.tsx`teki gercek kullanimi taklit eden bir sarmalayici: birim maliyet
 * ve kaynagi UST bilesende (page.tsx'te `Home`) yasar, `onBirimMaliyet`
 * cagrildiginda parent state guncellenir ve YENI deger prop olarak geri
 * akar — tam olarak controlled-input dongusu, review Finding 2'nin
 * kirdigi/dogru kodun korumasi gereken davranis.
 */
function Sarmalayici({ baslangic = 12000 }: { baslangic?: number | null }) {
  const [fiyat, setFiyat] = React.useState<number | null>(baslangic);
  const [kaynak, setKaynak] = React.useState<BirimMaliyetKaynagi>({ tur: 'varsayilan' });
  const onBirimMaliyet: BirimMaliyetFieldProps['onBirimMaliyet'] = v => {
    setFiyat(v);
    setKaynak({ tur: 'elle' });
  };
  return (
    <BirimMaliyetField
      globalUnitPrice={fiyat}
      birimMaliyetKaynagi={kaynak}
      onBirimMaliyet={onBirimMaliyet}
    />
  );
}

describe('BirimMaliyetField (review Finding 2, 2026-07-30)', () => {
  it('baslangicta gecerli sayiyi ve kaynak etiketini gosterir', () => {
    render(<Sarmalayici />);
    const input = screen.getByLabelText('Birim inşaat maliyeti (TL/m²)') as HTMLInputElement;
    expect(input.value).toBe('12000');
    expect(screen.getByText(/Varsayılan 12.000 TL\/m²/)).toBeInTheDocument();
  });

  it('alan TAMAMEN silindiginde bos gorunur — eski deger GERI SICRAMAZ', async () => {
    // Eski kod dogrudan `value={globalUnitPrice}` (sayi) kullaniyordu; `onChange`
    // yalnizca `Number.isFinite(v) && v > 0` gecerliyse commit ediyordu.
    // `Number('') === 0` bu guard'i GECEMEDIGI icin state hic degismiyor,
    // React input'u HEMEN eski sayiya geri yaziyordu — kullanici alani
    // silemiyordu. Bu test, alanin GERCEKTEN bos kalabildigini dogrular.
    const user = userEvent.setup();
    render(<Sarmalayici />);
    const input = screen.getByLabelText('Birim inşaat maliyeti (TL/m²)') as HTMLInputElement;
    await user.clear(input);
    expect(input.value).toBe('');
  });

  it('silindikten sonra yeni bir deger yazilinca hem alan hem kaynak dogru guncellenir', async () => {
    const user = userEvent.setup();
    render(<Sarmalayici />);
    const input = screen.getByLabelText('Birim inşaat maliyeti (TL/m²)') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '15500');
    expect(input.value).toBe('15500');
    // Parent (Sarmalayici) `onBirimMaliyet` ile gercekten commit almis mi?
    // Kaynak etiketi 'elle' gecmisse (Varsayilan -> Elle girildi), commit
    // BASARILI olmus demektir — bu, controlled input dongusunun (prop geri
    // akisi) da dogru calistigini kanitlar.
    expect(screen.getByText(/Elle girildi · 15.500 TL\/m²/)).toBeInTheDocument();
  });

  it('gecersiz/sifir ara deger (orn. "0") commit edilmez, ama alanda gorunmeye devam eder', async () => {
    const user = userEvent.setup();
    render(<Sarmalayici />);
    const input = screen.getByLabelText('Birim inşaat maliyeti (TL/m²)') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '0');
    expect(input.value).toBe('0');
    // Kaynak hala 'Varsayilan' — '0' guard'i gecemedigi icin commit edilmedi.
    expect(screen.getByText(/Varsayılan/)).toBeInTheDocument();
  });

  it('baslangicta null iken alan bos gorunur ve kaynak etiketi tire gosterir', () => {
    render(<Sarmalayici baslangic={null} />);
    const input = screen.getByLabelText('Birim inşaat maliyeti (TL/m²)') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('RiskCostFields sirasi', () => {
    function riskCostProps(patch: Partial<React.ComponentProps<typeof RiskCostFields>> = {}) {
        return {
            iksaMode: 'off' as const, setIksaMode: jest.fn(),
            iksaPercentage: 5, setIksaPercentage: jest.fn(),
            iksaManualTL: 0, setIksaManualTL: jest.fn(),
            builderProfit: 1.3, setBuilderProfit: jest.fn(),
            profitLevels: [
                { id: '1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
                { id: '2', label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
            ],
            ...patch,
        };
    }

    it('İksa Masrafı, Müteahhit Kazancı\'ndan ÖNCE render olur', () => {
        const { container } = render(<RiskCostFields {...riskCostProps()} />)
        const metin = container.textContent ?? ''
        expect(metin.indexOf('İksa Masrafı')).toBeGreaterThan(-1)
        expect(metin.indexOf('Müteahhit Kazancı')).toBeGreaterThan(-1)
        expect(metin.indexOf('İksa Masrafı')).toBeLessThan(metin.indexOf('Müteahhit Kazancı'))
    })
});
