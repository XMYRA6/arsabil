import type { CalculationInput, CalculationOutput } from '@/lib/calculator/engine_v2';
import type { StudioMassingInput, StudioPolygon } from './types';

export type StudioCalculatorAdapterInput = {
  calculationInput: CalculationInput;
  calculationOutput: CalculationOutput | null;
  parcelPolygon?: StudioPolygon | null;
  authoritativeGrossConstructionAreaM2?: number | null;
};

export function createStudioMassingInput({
  calculationInput,
  calculationOutput,
  parcelPolygon,
  authoritativeGrossConstructionAreaM2,
}: StudioCalculatorAdapterInput): StudioMassingInput {
  const parcelAreaM2 = typeof calculationInput.Aa === 'number' && calculationInput.Aa > 0 ? calculationInput.Aa : null;
  const totalApartments = typeof calculationInput.Sd === 'number' && calculationInput.Sd > 0 ? calculationInput.Sd : null;
  const apartmentArea = calculationInput.Ad > 0 ? calculationInput.Ad : null;
  const estimatedGrossConstructionAreaM2 =
    totalApartments != null && apartmentArea != null ? totalApartments * apartmentArea : null;
  const hasAuthoritativeGrossConstructionArea =
    typeof authoritativeGrossConstructionAreaM2 === 'number' && authoritativeGrossConstructionAreaM2 > 0;
  const grossConstructionAreaM2 = hasAuthoritativeGrossConstructionArea
    ? authoritativeGrossConstructionAreaM2
    : estimatedGrossConstructionAreaM2;

  return {
    parcelAreaM2,
    grossConstructionAreaM2,
    grossConstructionAreaSource: hasAuthoritativeGrossConstructionArea ? 'authoritative' : 'estimated_apartment_area',
    assumedFloorCount: totalApartments,
    parcelPolygon,
  };
}


