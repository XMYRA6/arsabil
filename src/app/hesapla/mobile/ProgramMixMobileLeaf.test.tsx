/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgramMixMobileLeaf } from './ProgramMixMobileLeaf';
import type { ProgramMixItem } from '@/lib/studio/types';

// ProgramMixPanel'in kendi testleri (Faz2A Task 3) form davranisini zaten
// kapsiyor; bu dosya YALNIZCA mobil yaprak kabugunu (baslik + kapat) test
// eder — StudioMobileLeaf ile ayni desen.
describe('ProgramMixMobileLeaf', () => {
  it('baslik ve kapat dugmesini gosterir, tiklaninca onKapat i cagirir', async () => {
    const user = userEvent.setup();
    const onKapat = jest.fn();
    render(
      <ProgramMixMobileLeaf
        items={[]}
        onItemsChange={jest.fn()}
        availableAreaM2={null}
        hasGeometry={false}
        onKapat={onKapat}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Program Dağılımı' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onKapat).toHaveBeenCalledTimes(1);
  });

  it('ProgramMixPanel i items ile render eder', () => {
    const items: ProgramMixItem[] = [
      { id: 'a', use: 'residential', residentialType: '2+1', unitCount: 6, unitAreaM2: 85 },
    ];
    render(
      <ProgramMixMobileLeaf
        items={items}
        onItemsChange={jest.fn()}
        availableAreaM2={2000}
        hasGeometry
        onKapat={jest.fn()}
      />,
    );
    expect(screen.getByTestId('program-item-a')).toBeInTheDocument();
  });
});
