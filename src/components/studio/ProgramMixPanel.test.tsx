/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgramMixPanel } from './ProgramMixPanel';
import type { ProgramMixItem } from '@/lib/studio/types';

const items: ProgramMixItem[] = [
  { id: 'a', use: 'residential', residentialType: '2+1', unitCount: 6, unitAreaM2: 85, floorRange: { startFloor: 1, endFloor: 3 } },
  { id: 'b', use: 'commercial', unitCount: 3, unitAreaM2: 40, floorRange: { startFloor: 0, endFloor: 0 } },
];

describe('ProgramMixPanel', () => {
  // Faz 3A Task 5 bullet 3: "Layout degisikligi kapasiteyi etkiliyorsa
  // ... 'yeniden hesaplama gerekli' durumunu gorunur yap." (Files listesi
  // LandownerOfferPanel degil, ProgramMixPanel'i modify olarak isaretliyor
  // — "kapasite" kelimesi program envanterine daha dogrudan denk dusuyor.)
  it('layoutRequiresRecalculation=true iken gorunur, karar yolunu KAPATMAYAN bir uyari banner i gosterir', () => {
    render(
      <ProgramMixPanel
        items={items}
        onItemsChange={jest.fn()}
        availableAreaM2={2000}
        hasGeometry
        layoutRequiresRecalculation
      />,
    );
    expect(screen.getByText(/yeniden hesaplama gerekli/i)).toBeInTheDocument();
    // Bloklamaz: envanter formu yine kullanilabilir olmali.
    expect(screen.getByDisplayValue('6')).toBeInTheDocument();
  });

  it('layoutRequiresRecalculation verilmezse veya false ise banner gorunmez', () => {
    render(<ProgramMixPanel items={items} onItemsChange={jest.fn()} availableAreaM2={2000} hasGeometry />);
    expect(screen.queryByText(/yeniden hesaplama gerekli/i)).not.toBeInTheDocument();
  });

  it('toplam potansiyeli (mevcut insaat alani) gosterir', () => {
    render(<ProgramMixPanel items={items} onItemsChange={jest.fn()} availableAreaM2={2000} hasGeometry />);
    expect(screen.getByText(/2\.000\s*m²/)).toBeInTheDocument();
  });

  // Task 3 bullet 5: geometri yokken sayisal kisimlar calisir, 3D band
  // gorunumu pasif duruma gecer.
  it('geometri yokken (hasGeometry=false) sayisal ozet yine calisir, potansiyel "bekleniyor" notu doner', () => {
    render(<ProgramMixPanel items={items} onItemsChange={jest.fn()} availableAreaM2={null} hasGeometry={false} />);
    expect(screen.getByText(/kütle hesaplanınca aktifleşir/i)).toBeInTheDocument();
    // Alan tahsisi (toplam/kalan) yine de hesaplanmis olmali — 0 varsayimla.
    expect(screen.getByDisplayValue('6')).toBeInTheDocument(); // 2+1 adedi
  });

  it('geometri yokken 3D kat bandi legend pasif (aria-disabled) olur', () => {
    render(<ProgramMixPanel items={items} onItemsChange={jest.fn()} availableAreaM2={null} hasGeometry={false} />);
    expect(screen.getByRole('group', { name: /kat bantları/i })).toHaveAttribute('aria-disabled', 'true');
  });

  it('geometri varken kat bandi legend aktif olur', () => {
    render(<ProgramMixPanel items={items} onItemsChange={jest.fn()} availableAreaM2={2000} hasGeometry />);
    expect(screen.getByRole('group', { name: /kat bantları/i })).toHaveAttribute('aria-disabled', 'false');
  });

  it('zemin dukkan kalemini ayri, vurgulu bir satir olarak gosterir', () => {
    render(<ProgramMixPanel items={items} onItemsChange={jest.fn()} availableAreaM2={2000} hasGeometry />);
    expect(screen.getByText(/zemin.*dükkan/i)).toBeInTheDocument();
  });

  it('her kalemin adet/alanini gosterir', () => {
    render(<ProgramMixPanel items={items} onItemsChange={jest.fn()} availableAreaM2={2000} hasGeometry />);
    const row = screen.getByTestId('program-item-a');
    expect(within(row).getByDisplayValue('6')).toBeInTheDocument();
    expect(within(row).getByDisplayValue('85')).toBeInTheDocument();
  });

  it('kalem adedi degistirilince onItemsChange guncel diziyle cagirilir, manualOverride true olur', () => {
    const onItemsChange = jest.fn();
    render(<ProgramMixPanel items={items} onItemsChange={onItemsChange} availableAreaM2={2000} hasGeometry />);

    const row = screen.getByTestId('program-item-a');
    const countInput = within(row).getByLabelText(/adet/i);
    // `type="number"` girdilerinde userEvent.clear+type gercekci tuslama
    // simulasyonunda tutarsiz davranabiliyor (kontrollu deger prop'tan hic
    // degismedigi icin DOM temizlenmeyebiliyor) — degisikligi doğrudan
    // fireEvent.change ile tetiklemek, test edilen sey olan onChange
    // HANDLER'inin kendisi oldugu icin daha guvenilir.
    fireEvent.change(countInput, { target: { value: '7' } });

    const lastCall = onItemsChange.mock.calls[onItemsChange.mock.calls.length - 1][0] as ProgramMixItem[];
    const updated = lastCall.find((i) => i.id === 'a')!;
    expect(updated.unitCount).toBe(7);
    expect(updated.manualOverride).toBe(true);
  });

  it('yeni kalem eklenince onItemsChange bir eleman daha uzun diziyle cagirilir', async () => {
    const user = userEvent.setup();
    const onItemsChange = jest.fn();
    render(<ProgramMixPanel items={items} onItemsChange={onItemsChange} availableAreaM2={2000} hasGeometry />);

    await user.click(screen.getByRole('button', { name: /kalem ekle/i }));
    const lastCall = onItemsChange.mock.calls[onItemsChange.mock.calls.length - 1][0] as ProgramMixItem[];
    expect(lastCall).toHaveLength(items.length + 1);
  });

  it('kalem kaldirilinca onItemsChange bir eksik diziyle cagirilir', async () => {
    const user = userEvent.setup();
    const onItemsChange = jest.fn();
    render(<ProgramMixPanel items={items} onItemsChange={onItemsChange} availableAreaM2={2000} hasGeometry />);

    const row = screen.getByTestId('program-item-a');
    await user.click(within(row).getByRole('button', { name: /kaldır/i }));
    const lastCall = onItemsChange.mock.calls[onItemsChange.mock.calls.length - 1][0] as ProgramMixItem[];
    expect(lastCall).toHaveLength(1);
    expect(lastCall.find((i) => i.id === 'a')).toBeUndefined();
  });

  it('asim varsa uyari listesinde gosterir', () => {
    const overflowing: ProgramMixItem[] = [{ id: 'x', use: 'residential', residentialType: '2+1', unitCount: 30, unitAreaM2: 100 }];
    render(<ProgramMixPanel items={overflowing} onItemsChange={jest.fn()} availableAreaM2={1000} hasGeometry />);
    expect(screen.getByText(/aşıyor/i)).toBeInTheDocument();
  });

  it('varsayimlar/uyarilar bolumu bos kalemde bos gosterir, crash etmez', () => {
    render(<ProgramMixPanel items={[]} onItemsChange={jest.fn()} availableAreaM2={1000} hasGeometry />);
    expect(screen.getAllByText(/1\.000\s*m²/).length).toBeGreaterThan(0);
  });
});
