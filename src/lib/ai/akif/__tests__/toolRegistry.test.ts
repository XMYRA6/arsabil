import {
  AKIF_TOOL_DEFS,
  validateArgs,
  dispatchTool,
} from '../gateway/toolRegistry';
import type { EngineDefaultsDb } from '../gateway/engineDefaults';

const fakeDb: EngineDefaultsDb = {
  globalSettings: { findUnique: async () => null },
  profitLevel: { findFirst: async () => null },
};

describe('toolRegistry', () => {
  describe('AKIF_TOOL_DEFS', () => {
    it('has exactly 3 function defs with the allowlisted names', () => {
      expect(AKIF_TOOL_DEFS).toHaveLength(3);
      const names = AKIF_TOOL_DEFS.map((d) => d.function.name).sort();
      expect(names).toEqual(
        ['compareApartmentSizes', 'compareContractorOffers', 'explainTerm'].sort(),
      );
      for (const d of AKIF_TOOL_DEFS) {
        expect(d.type).toBe('function');
        expect((d.function.parameters as { additionalProperties: unknown }).additionalProperties).toBe(false);
      }
    });

    it('explainTerm def enumerates the 7 imar terms', () => {
      const def = AKIF_TOOL_DEFS.find((d) => d.function.name === 'explainTerm')!;
      const props = def.function.parameters as {
        properties: { term: { enum: string[] } };
        required: string[];
      };
      expect(props.properties.term.enum).toHaveLength(7);
      expect(props.properties.term.enum).toContain('emsal');
      expect(props.required).toEqual(['term']);
    });
  });

  describe('validateArgs — explainTerm', () => {
    it('accepts a known term', () => {
      expect(validateArgs('explainTerm', { term: 'kat_karsiligi' })).toEqual({ ok: true });
    });
    it('rejects an unknown term', () => {
      const r = validateArgs('explainTerm', { term: 'bilinmez' });
      expect(r.ok).toBe(false);
      expect(r).toMatchObject({ ok: false, field: 'term' });
    });
  });

  describe('validateArgs — compareContractorOffers', () => {
    it('accepts a valid payload', () => {
      expect(
        validateArgs('compareContractorOffers', {
          arsaAlani: 900,
          emsal: 1.5,
          muteahhitPaylari: [50, 55],
        }),
      ).toEqual({ ok: true });
    });

    it('rejects emsal out of range', () => {
      expect(
        validateArgs('compareContractorOffers', {
          arsaAlani: 900,
          emsal: 15,
          muteahhitPaylari: [50, 55],
        }),
      ).toMatchObject({ ok: false, field: 'emsal' });
    });

    it('rejects muteahhitPaylari with only 1 value', () => {
      const r = validateArgs('compareContractorOffers', {
        arsaAlani: 900,
        emsal: 1.5,
        muteahhitPaylari: [50],
      });
      expect(r).toMatchObject({ ok: false, field: 'muteahhitPaylari' });
    });

    it('rejects a share value out of the percent range', () => {
      const r = validateArgs('compareContractorOffers', {
        arsaAlani: 900,
        emsal: 1.5,
        muteahhitPaylari: [50, 150],
      });
      expect(r).toMatchObject({ ok: false, field: 'muteahhitPaylari' });
    });

    it('rejects a missing required field', () => {
      expect(
        validateArgs('compareContractorOffers', {
          emsal: 1.5,
          muteahhitPaylari: [50, 55],
        }),
      ).toMatchObject({ ok: false, field: 'arsaAlani', reason: 'eksik' });
    });

    it('rejects a non-number where a number is expected', () => {
      expect(
        validateArgs('compareContractorOffers', {
          arsaAlani: 'çok',
          emsal: 1.5,
          muteahhitPaylari: [50, 55],
        }),
      ).toMatchObject({ ok: false, field: 'arsaAlani' });
    });

    it('validates optional daireBuyuklugu when present', () => {
      expect(
        validateArgs('compareContractorOffers', {
          arsaAlani: 900,
          emsal: 1.5,
          muteahhitPaylari: [50, 55],
          daireBuyuklugu: 5,
        }),
      ).toMatchObject({ ok: false, field: 'daireBuyuklugu' });
    });
  });

  describe('validateArgs — compareApartmentSizes', () => {
    it('accepts a valid payload', () => {
      expect(
        validateArgs('compareApartmentSizes', {
          arsaAlani: 900,
          emsal: 1.5,
          muteahhitPayi: 50,
          daireBuyuklukleri: [90, 120],
        }),
      ).toEqual({ ok: true });
    });

    it('rejects daireBuyuklukleri outside the 2-4 count', () => {
      expect(
        validateArgs('compareApartmentSizes', {
          arsaAlani: 900,
          emsal: 1.5,
          muteahhitPayi: 50,
          daireBuyuklukleri: [90],
        }),
      ).toMatchObject({ ok: false, field: 'daireBuyuklukleri' });
    });

    it('rejects a bad muteahhitPayi', () => {
      expect(
        validateArgs('compareApartmentSizes', {
          arsaAlani: 900,
          emsal: 1.5,
          muteahhitPayi: 150,
          daireBuyuklukleri: [90, 120],
        }),
      ).toMatchObject({ ok: false, field: 'muteahhitPayi' });
    });
  });

  describe('dispatchTool', () => {
    it('runs explainTerm → TermCard', async () => {
      const card = await dispatchTool('explainTerm', { term: 'emsal' }, { db: fakeDb });
      expect(card.kind).toBe('term');
    });

    it('runs compareContractorOffers → ScenarioCard (defaults kick in)', async () => {
      const card = await dispatchTool(
        'compareContractorOffers',
        { arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [50, 55] },
        { db: fakeDb },
      );
      expect(card.kind).toBe('contractor_offers');
    });

    it('runs compareApartmentSizes → ScenarioCard', async () => {
      const card = await dispatchTool(
        'compareApartmentSizes',
        { arsaAlani: 900, emsal: 1.5, muteahhitPayi: 50, daireBuyuklukleri: [90, 120] },
        { db: fakeDb },
      );
      expect(card.kind).toBe('apartment_sizes');
    });

    it('throws on an unknown tool name', async () => {
      await expect(
        // @ts-expect-error — deliberately off-allowlist
        dispatchTool('deleteEverything', {}, { db: fakeDb }),
      ).rejects.toThrow();
    });
  });
});
