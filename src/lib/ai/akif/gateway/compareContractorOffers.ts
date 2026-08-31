// Akif-1 Tool Gateway — kat-karşılığı senaryo karşılaştırması.
// Bu iki fonksiyon MEVCUT deterministik motoru (`CalculatorEngineV2.calculate`)
// değişen girdilerle N kez çalıştırır ve bir `ScenarioCard` döner. Akif kendisi
// hesap yapmaz; bunları çağırır.
//
// CONTROLLER RULING (spec §12): `emsal` motora GİRMEZ. Motor `Aa` (arsa alanı) +
// `x` + `Ad` + `P` + `K` + `L` üzerinden çalışır. `emsal` yalnız `emsalNote` ve
// `assumptions` içinde bilgilendirme amaçlı görünür.

import { CalculatorEngineV2 } from '@/lib/calculator/engine_v2';
import type { CalculationInput } from '@/lib/calculator/engine_v2';
import { buildCalculationInput } from '@/app/hesapla/calculatorUiHelpers';
import { lValue } from './engineDefaults';
import type { EngineDefaults } from './engineDefaults';
import type { ScenarioCard, ScenarioRow } from '../contract';

export interface ContractorOffersArgs {
  arsaAlani: number;
  emsal: number;
  muteahhitPaylari: number[];
  daireBuyuklugu?: number;
  birimMaliyet?: number;
  kaliteSinifi?: 'standart' | 'orta' | 'luks';
}

export interface ApartmentSizesArgs {
  arsaAlani: number;
  emsal: number;
  muteahhitPayi: number;
  daireBuyuklukleri: number[];
  birimMaliyet?: number;
  kaliteSinifi?: 'standart' | 'orta' | 'luks';
}

function baseInput(args: {
  x: number;
  apartmentSize: number;
  birimMaliyet: number | undefined;
  kaliteSinifi: 'standart' | 'orta' | 'luks' | undefined;
  arsaAlani: number;
  defaults: EngineDefaults;
}): CalculationInput {
  return buildCalculationInput({
    x: args.x,
    luxLevel: lValue(args.kaliteSinifi ?? 'orta', args.defaults.qualityLevels),
    apartmentSize: args.apartmentSize,
    globalUnitPrice: args.birimMaliyet ?? args.defaults.P,
    builderProfit: args.defaults.K,
    isApartmentCountEnabled: false,
    totalApartments: 0,
    isAaEnabled: true,
    arsaAlani: args.arsaAlani,
    riskLevel: 0,
    iksaMode: 'off',
    iksaPercentage: 0,
    iksaManualTL: 0,
  });
}

function assumptions(defaults: EngineDefaults): string[] {
  return ['Yapılaşma alanı = arsa alanı × emsal', 'Kâr katsayısı = ' + defaults.K];
}

function emsalNote(arsaAlani: number, emsal: number): string {
  return (
    'Emsal alanı = ' +
    arsaAlani +
    ' × ' +
    emsal +
    ' = ' +
    arsaAlani * emsal +
    ' m² — TAKS ve çekme mesafesi yok sayıldı.'
  );
}

export function compareContractorOffers(
  args: ContractorOffersArgs,
  defaults: EngineDefaults,
): ScenarioCard {
  const rows: ScenarioRow[] = args.muteahhitPaylari.map((p) => {
    const x = 1 - p / 100;
    const out = CalculatorEngineV2.calculate(
      baseInput({
        x,
        apartmentSize: args.daireBuyuklugu ?? 100,
        birimMaliyet: args.birimMaliyet,
        kaliteSinifi: args.kaliteSinifi,
        arsaAlani: args.arsaAlani,
        defaults,
      }),
    );
    return {
      label: 'Müteahhit %' + p,
      arsaPayiX: x,
      arsaSahibiDaireSayisi: out.Sdx,
      arsaSahibiDegeriTL: out.FA,
      daireSatisFiyatiTL: out.FD_total,
    };
  });

  const defaultsUsed: string[] = [];
  if (args.birimMaliyet === undefined) {
    defaultsUsed.push('birim maliyet = ' + defaults.P + ' TL/m² (varsayılan)');
  }
  if (args.daireBuyuklugu === undefined) {
    defaultsUsed.push('ortalama daire = 100 m² (varsayılan)');
  }
  if (args.kaliteSinifi === undefined) {
    defaultsUsed.push('kalite = orta (varsayılan)');
  }

  return {
    kind: 'contractor_offers',
    rows,
    defaultsUsed,
    assumptions: assumptions(defaults),
    emsalNote: emsalNote(args.arsaAlani, args.emsal),
  };
}

export function compareApartmentSizes(
  args: ApartmentSizesArgs,
  defaults: EngineDefaults,
): ScenarioCard {
  const x = 1 - args.muteahhitPayi / 100;

  const rows: ScenarioRow[] = args.daireBuyuklukleri.map((d) => {
    const out = CalculatorEngineV2.calculate(
      baseInput({
        x,
        apartmentSize: d,
        birimMaliyet: args.birimMaliyet,
        kaliteSinifi: args.kaliteSinifi,
        arsaAlani: args.arsaAlani,
        defaults,
      }),
    );
    return {
      label: d + ' m²',
      arsaPayiX: x,
      arsaSahibiDaireSayisi: out.Sdx,
      arsaSahibiDegeriTL: out.FA,
      daireSatisFiyatiTL: out.FD_total,
    };
  });

  const defaultsUsed: string[] = [];
  if (args.birimMaliyet === undefined) {
    defaultsUsed.push('birim maliyet = ' + defaults.P + ' TL/m² (varsayılan)');
  }
  if (args.kaliteSinifi === undefined) {
    defaultsUsed.push('kalite = orta (varsayılan)');
  }

  return {
    kind: 'apartment_sizes',
    rows,
    defaultsUsed,
    assumptions: assumptions(defaults),
    emsalNote: emsalNote(args.arsaAlani, args.emsal),
  };
}
