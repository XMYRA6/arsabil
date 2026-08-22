/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioLayoutControls } from './StudioLayoutControls';
import type { BuildingMass, StudioLayoutDraft } from '@/lib/studio/types';

const mass: BuildingMass = {
  footprint: {
    source: 'verified_tkgm',
    areaM2: 400,
    points: [
      { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 },
    ],
  },
  heightM: 12,
  floorCount: 4,
  floorHeightM: 3,
  grossConstructionAreaM2: 1200,
  warnings: [],
};

const baseDraft: StudioLayoutDraft = {
  footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 1, insetM: 0 },
  setback: { frontM: 2, sideM: 1.5, rearM: 3 },
  programBandIds: [],
};

describe('StudioLayoutControls', () => {
  it('mevcut kapsama, yon ve cekme degerlerini gosterir', () => {
    render(<StudioLayoutControls layoutDraft={baseDraft} onLayoutDraftChange={jest.fn()} mass={mass} />);
    expect(screen.getByLabelText(/kapsama/i)).toHaveValue(100);
    expect(screen.getByLabelText(/^ön çekme/i)).toHaveValue(2);
    expect(screen.getByLabelText(/^yan çekme/i)).toHaveValue(1.5);
    expect(screen.getByLabelText(/^arka çekme/i)).toHaveValue(3);
  });

  it('kapsama degistirilince onLayoutDraftChange scale ile cagirilir', () => {
    const onChange = jest.fn();
    render(<StudioLayoutControls layoutDraft={baseDraft} onLayoutDraftChange={onChange} mass={mass} />);
    fireEvent.change(screen.getByLabelText(/kapsama/i), { target: { value: '80' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      footprint: expect.objectContaining({ scale: 0.8 }),
    }));
  });

  it('taslaktaki kapsamaya gore etkilenen footprint alanini gosterir (kontrollu bilesen: prop degisince yeniden gosterir)', () => {
    const { rerender } = render(<StudioLayoutControls layoutDraft={baseDraft} onLayoutDraftChange={jest.fn()} mass={mass} />);
    // 400 m^2 taban * 1^2 = 400 m^2
    expect(screen.getByText(/400/)).toBeInTheDocument();

    const scaledDraft: StudioLayoutDraft = { ...baseDraft, footprint: { ...baseDraft.footprint, scale: 0.8 } };
    rerender(<StudioLayoutControls layoutDraft={scaledDraft} onLayoutDraftChange={jest.fn()} mass={mass} />);
    // 400 m^2 taban * 0.8^2 = 256 m^2
    expect(screen.getByText(/256/)).toBeInTheDocument();
  });

  it('kapsama sifir veya negatif girilirse degisiklik reddedilir, son gecerli deger korunur, neden gosterilir', () => {
    const onChange = jest.fn();
    render(<StudioLayoutControls layoutDraft={baseDraft} onLayoutDraftChange={onChange} mass={mass} />);
    fireEvent.change(screen.getByLabelText(/kapsama/i), { target: { value: '0' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/kapsama[\s\S]*sıfır veya negatif olamaz/i)).toBeInTheDocument();
  });

  it('90 derece yon on-ayarina tiklaninca onLayoutDraftChange rotationDeg=90 ile cagirilir', () => {
    const onChange = jest.fn();
    render(<StudioLayoutControls layoutDraft={baseDraft} onLayoutDraftChange={onChange} mass={mass} />);
    fireEvent.click(screen.getByRole('button', { name: '90°' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      footprint: expect.objectContaining({ rotationDeg: 90 }),
    }));
  });

  it('on cekme negatif girilirse reddedilir, nedeni gosterilir', () => {
    const onChange = jest.fn();
    render(<StudioLayoutControls layoutDraft={baseDraft} onLayoutDraftChange={onChange} mass={mass} />);
    fireEvent.change(screen.getByLabelText(/^ön çekme/i), { target: { value: '-1' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/çekme mesafesi negatif olamaz/i)).toBeInTheDocument();
  });

  it('gecerli on cekme degeri onLayoutDraftChange i cagirir', () => {
    const onChange = jest.fn();
    render(<StudioLayoutControls layoutDraft={baseDraft} onLayoutDraftChange={onChange} mass={mass} />);
    fireEvent.change(screen.getByLabelText(/^ön çekme/i), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      setback: expect.objectContaining({ frontM: 4 }),
    }));
  });

  it('ticari cephe baslangicta kapali, "Zemin ticaret cephesi ekle" ile acilir ve varsayilan deger atanir', () => {
    const onChange = jest.fn();
    render(<StudioLayoutControls layoutDraft={baseDraft} onLayoutDraftChange={onChange} mass={mass} />);
    expect(screen.queryByLabelText(/cephe uzunluğu/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /zemin ticaret cephesi ekle/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      commercialFrontage: expect.objectContaining({ edgeIndex: 0 }),
    }));
  });

  it('ticari cephe varken kaldirilinca commercialFrontage undefined olur', () => {
    const onChange = jest.fn();
    const draftWithFrontage: StudioLayoutDraft = { ...baseDraft, commercialFrontage: { edgeIndex: 0, lengthM: 5 } };
    render(<StudioLayoutControls layoutDraft={draftWithFrontage} onLayoutDraftChange={onChange} mass={mass} />);
    fireEvent.click(screen.getByRole('button', { name: /ticari cepheyi kaldır/i }));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.commercialFrontage).toBeUndefined();
  });

  it('ticari cephe uzunlugu negatif girilirse reddedilir', () => {
    const onChange = jest.fn();
    const draftWithFrontage: StudioLayoutDraft = { ...baseDraft, commercialFrontage: { edgeIndex: 0, lengthM: 5 } };
    render(<StudioLayoutControls layoutDraft={draftWithFrontage} onLayoutDraftChange={onChange} mass={mass} />);
    fireEvent.change(screen.getByLabelText(/cephe uzunluğu/i), { target: { value: '-2' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/cephe uzunluğu negatif olamaz/i)).toBeInTheDocument();
  });
});
