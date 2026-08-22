/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandownerOfferMobileLeaf } from './LandownerOfferMobileLeaf';

// LandownerOfferPanel'in kendi testleri (Faz2B Task 3) hesap/goruntuleme
// davranisini zaten kapsiyor; bu dosya YALNIZCA mobil yaprak kabugunu
// (baslik + kapat) test eder — ProgramMixMobileLeaf ile ayni desen.
describe('LandownerOfferMobileLeaf', () => {
  it('baslik ve kapat dugmesini gosterir, tiklaninca onKapat i cagirir', async () => {
    const user = userEvent.setup();
    const onKapat = jest.fn();
    render(
      <LandownerOfferMobileLeaf
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={null}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
        onKapat={onKapat}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Arsa Sahibi Teklifi' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onKapat).toHaveBeenCalledTimes(1);
  });

  it('LandownerOfferPanel i sahiplenilen proplarla render eder', () => {
    render(
      <LandownerOfferMobileLeaf
        shareRatio={0.4}
        totalUnitCount={23}
        valuationAssumptions={null}
        onValuationAssumptionsChange={jest.fn()}
        customOverride={null}
        onCustomOverrideChange={jest.fn()}
        onKapat={jest.fn()}
      />,
    );
    expect(screen.getByText(/9,2 birim eşdeğeri/i)).toBeInTheDocument();
  });
});
