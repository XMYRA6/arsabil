/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { OfferComposer } from './OfferComposer';

describe('OfferComposer', () => {
  it('daire sayisi ve nakit tutari girilip Uygula tiklaninca onApply cagirilir', () => {
    const onApply = jest.fn();
    render(<OfferComposer value={null} onApply={onApply} onClear={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/daire sayısı/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/nakit tutarı/i), { target: { value: '3000000' } });
    fireEvent.click(screen.getByRole('button', { name: /uygula/i }));

    expect(onApply).toHaveBeenCalledWith({ unitCount: 8, cashTl: 3000000 });
  });

  it('mevcut deger verilmisse girdileri onunla doldurur', () => {
    render(<OfferComposer value={{ unitCount: 5, cashTl: 1_000_000 }} onApply={jest.fn()} onClear={jest.fn()} />);
    expect(screen.getByLabelText(/daire sayısı/i)).toHaveValue(5);
    expect(screen.getByLabelText(/nakit tutarı/i)).toHaveValue(1_000_000);
  });

  it('deger varken Kaldir tiklaninca onClear cagirilir', async () => {
    const user = userEvent.setup();
    const onClear = jest.fn();
    render(<OfferComposer value={{ unitCount: 5, cashTl: 1_000_000 }} onApply={jest.fn()} onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: /kaldır/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('deger yokken Kaldir butonu gorunmez', () => {
    render(<OfferComposer value={null} onApply={jest.fn()} onClear={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /kaldır/i })).not.toBeInTheDocument();
  });
});
