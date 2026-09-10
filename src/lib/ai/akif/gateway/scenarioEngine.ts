// Akif-2-Aksiyon — paylaşılan senaryo motoru girdisi + tam yeniden hesap.
// `buildScenarioEngineInput` DAVRANIŞ-KORUYAN bir çıkarımdır: gövdesi
// `compareContractorOffers.ts` içindeki eski özel `baseInput` ile birebir aynıdır.
// `computeFullScenario` bu girdiyi motora verip Scenario-modeli alan eşlemesi
// ve görüntüleme (display) türevlerini birlikte döner.

import { CalculatorEngineV2 } from '@/lib/calculator/engine_v2';
import type { CalculationInput, CalculationOutput } from '@/lib/calculator/engine_v2';
import { buildCalculationInput } from '@/app/hesapla/calculatorUiHelpers';
import { lValue } from './engineDefaults';
import type { EngineDefaults } from './engineDefaults';

export interface ScenarioEngineArgs {
  x: number;
  apartmentSize: number;
  totalApartments: number;
  birimMaliyet: number | undefined;
  kaliteSinifi: 'standart' | 'orta' | 'luks' | undefined;
  arsaAlani: number;
  defaults: EngineDefaults;
}

export function buildScenarioEngineInput(args: ScenarioEngineArgs): CalculationInput {
  // emsal MOTORA girmiyor — toplam daire sayısı sarmalayıcıda önceden
  // hesaplanıp motora `Sd` olarak verilir (bkz. FIX 1 / spec §12 tadili).
  // Guard: türetilen sayı < 1 ise sayaç kapalı (Sdx/FA null kabul edilir).
  const countEnabled = args.totalApartments >= 1;
  return buildCalculationInput({
    x: args.x,
    luxLevel: lValue(args.kaliteSinifi ?? 'orta', args.defaults.qualityLevels),
    apartmentSize: args.apartmentSize,
    globalUnitPrice: args.birimMaliyet ?? args.defaults.P,
    builderProfit: args.defaults.K,
    isApartmentCountEnabled: countEnabled,
    totalApartments: countEnabled ? args.totalApartments : 0,
    isAaEnabled: true,
    arsaAlani: args.arsaAlani,
    riskLevel: 0,
    iksaMode: 'off',
    iksaPercentage: 0,
    iksaManualTL: 0,
  });
}

export interface ScenarioFields {
  luxLevel: number;
  apartmentSize: number;
  landShareRatio: number;
  totalApartments: number | null;
  arsaAlani: number | null;
  riskLevel: number;
  builderProfit: number;
  iksaMode: string;
  iksaPercentage: number;
  iksaManualTL: number;
  marketPrice: number;
  fdTotal: number;
  fdPerM2: number;
  mi: number;
  ma: number;
  totalCost: number;
  fa: number | null;
  fabirim: number | null;
  sdx: number | null;
}

export interface ScenarioDisplay {
  arsaPayiPct: number;
  sahibineDaire: number | null;
  sahibineTL: number | null;
  toplamMaliyet: number;
  satisFiyati: number;
}

export function computeFullScenario(args: ScenarioEngineArgs): {
  output: CalculationOutput;
  scenarioFields: ScenarioFields;
  display: ScenarioDisplay;
} {
  const input = buildScenarioEngineInput(args);
  const output = CalculatorEngineV2.calculate(input);
  const scenarioFields: ScenarioFields = {
    luxLevel: input.L,
    apartmentSize: input.Ad,
    landShareRatio: input.x,
    totalApartments: input.Sd ?? null,
    arsaAlani: input.Aa ?? null,
    riskLevel: 0,
    builderProfit: input.K,
    iksaMode: 'off',
    iksaPercentage: 0,
    iksaManualTL: 0,
    marketPrice: 0,
    fdTotal: output.FD_total,
    fdPerM2: output.FD_per_m2,
    mi: output.Mi,
    ma: output.Ma,
    totalCost: output.M,
    fa: output.FA,
    fabirim: output.FAbirim,
    sdx: output.Sdx,
  };
  const display: ScenarioDisplay = {
    arsaPayiPct: (1 - input.x) * 100,
    sahibineDaire: output.Sdx,
    sahibineTL: output.FA,
    toplamMaliyet: output.M,
    satisFiyati: output.FD_total,
  };
  return { output, scenarioFields, display };
}
