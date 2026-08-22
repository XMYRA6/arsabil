import type { CalculationInput, CalculationOutput } from '@/lib/calculator/engine_v2';
import { createStudioMassingInput } from './calculatorAdapter';
import type { StudioPolygon } from './types';

const input: CalculationInput = {
  x: 0.33,
  L: 1.2,
  Ad: 120,
  P: 12000,
  K: 1.25,
  Sd: 20,
  Aa: 500,
  isRiskEnabled: false,
  isExcavationEnabled: false,
};

const output = {
  FD_total: 1_000_000,
} as CalculationOutput;

const polygon: StudioPolygon = {
  source: 'verified_tkgm',
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ],
};

describe('createStudioMassingInput', () => {
  it('maps calculator apartment count, apartment area and parcel area into Studio massing input', () => {
    expect(createStudioMassingInput({ calculationInput: input, calculationOutput: output, parcelPolygon: polygon }))
      .toEqual({
        parcelAreaM2: 500,
        grossConstructionAreaM2: 2400,
        grossConstructionAreaSource: 'estimated_apartment_area',
        assumedFloorCount: 20,
        parcelPolygon: polygon,
      });
  });

  it('keeps geometry nullable so the massing layer can produce an explicit warning', () => {
    expect(createStudioMassingInput({ calculationInput: input, calculationOutput: output })).toMatchObject({
      parcelAreaM2: 500,
      grossConstructionAreaM2: 2400,
      grossConstructionAreaSource: 'estimated_apartment_area',
      parcelPolygon: undefined,
    });
  });

  it('prefers authoritative construction area over Sd x Ad fallback', () => {
    expect(
      createStudioMassingInput({
        calculationInput: input,
        calculationOutput: output,
        parcelPolygon: polygon,
        authoritativeGrossConstructionAreaM2: 1800,
      }),
    ).toMatchObject({
      grossConstructionAreaM2: 1800,
      grossConstructionAreaSource: 'authoritative',
      assumedFloorCount: 20,
    });
  });

  it('does not invent construction area when apartment count mode is missing', () => {
    expect(
      createStudioMassingInput({
        calculationInput: { ...input, Sd: undefined },
        calculationOutput: output,
        parcelPolygon: polygon,
      }),
    ).toMatchObject({
      parcelAreaM2: 500,
      grossConstructionAreaM2: null,
      grossConstructionAreaSource: 'estimated_apartment_area',
      assumedFloorCount: null,
    });
  });
});



