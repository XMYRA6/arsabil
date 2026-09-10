// Akif-1 Tool Gateway — kat-karşılığı senaryo karşılaştırması.
// Bu iki fonksiyon MEVCUT deterministik motoru (`CalculatorEngineV2.calculate`)
// değişen girdilerle N kez çalıştırır ve bir `ScenarioCard` döner. Akif kendisi
// hesap yapmaz; bunları çağırır.
//
// CONTROLLER RULING (spec §12): `emsal` motora GİRMEZ. Motor `Aa` (arsa alanı) +
// `x` + `Ad` + `P` + `K` + `L` üzerinden çalışır. `emsal` yalnız `emsalNote` ve
// `assumptions` içinde bilgilendirme amaçlı görünür.

import { CalculatorEngineV2 } from '@/lib/calculator/engine_v2';
import { buildScenarioEngineInput } from './scenarioEngine';
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
  const effDaire = args.daireBuyuklugu ?? 100;
  // Toplam daire sayısı satırlar arası SABİT — yalnız x değişir.
  const totalApartments = Math.floor((args.arsaAlani * args.emsal) / effDaire);

  const rows: ScenarioRow[] = args.muteahhitPaylari.map((p) => {
    const x = 1 - p / 100;
    const out = CalculatorEngineV2.calculate(
      buildScenarioEngineInput({
        x,
        apartmentSize: effDaire,
        totalApartments,
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
    assumptions: [
      ...assumptions(defaults),
      'Toplam daire ≈ yapılaşma alanı ÷ ortalama daire = ' + totalApartments + ' adet',
    ],
    emsalNote: emsalNote(args.arsaAlani, args.emsal),
  };
}

export function compareApartmentSizes(
  args: ApartmentSizesArgs,
  defaults: EngineDefaults,
): ScenarioCard {
  const x = 1 - args.muteahhitPayi / 100;

  const rows: ScenarioRow[] = args.daireBuyuklukleri.map((d) => {
    // Toplam daire sayısı PER-ROW — daire büyüklüğü değiştikçe değişir.
    const totalApartments = Math.floor((args.arsaAlani * args.emsal) / d);
    const out = CalculatorEngineV2.calculate(
      buildScenarioEngineInput({
        x,
        apartmentSize: d,
        totalApartments,
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
    assumptions: [
      ...assumptions(defaults),
      'Toplam daire, ortalama daire büyüklüğüne göre yapılaşma alanından türetildi',
    ],
    emsalNote: emsalNote(args.arsaAlani, args.emsal),
  };
}
