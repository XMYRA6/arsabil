import { resolveEngineDefaults, lValue } from '../gateway/engineDefaults';
import type { EngineDefaultsDb } from '../gateway/engineDefaults';

describe('engineDefaults', () => {
  describe('resolveEngineDefaults', () => {
    it('should return db values when globalSettings and profitLevel rows exist', async () => {
      const db: EngineDefaultsDb = {
        globalSettings: {
          findUnique: async () => ({
            defaultUnitPrice: 15000,
            qualityStandard: 1.1,
            qualityMedium: 1.3,
            qualityLux: 1.5,
          }),
        },
        profitLevel: {
          findFirst: async () => ({ value: 1.40 }),
        },
      };

      const result = await resolveEngineDefaults(db);

      expect(result.P).toBe(15000);
      expect(result.K).toBe(1.40);
      expect(result.qualityLevels).toEqual({ standart: 1.1, orta: 1.3, luks: 1.5 });
    });

    it('should return fallback values when both rows are null', async () => {
      const db: EngineDefaultsDb = {
        globalSettings: {
          findUnique: async () => null,
        },
        profitLevel: {
          findFirst: async () => null,
        },
      };

      const result = await resolveEngineDefaults(db);

      expect(result.P).toBe(12000);
      expect(result.K).toBe(1.30);
      expect(result.qualityLevels).toEqual({ standart: 1.0, orta: 1.2, luks: 1.4 });
    });

    it('should merge db quality levels with defaults when only some are provided', async () => {
      const db: EngineDefaultsDb = {
        globalSettings: {
          findUnique: async () => ({
            defaultUnitPrice: 12000,
            qualityStandard: 1.05,
            qualityMedium: 1.2,
            qualityLux: 1.6,
          }),
        },
        profitLevel: {
          findFirst: async () => ({ value: 1.30 }),
        },
      };

      const result = await resolveEngineDefaults(db);

      expect(result.P).toBe(12000);
      expect(result.K).toBe(1.30);
      expect(result.qualityLevels).toEqual({ standart: 1.05, orta: 1.2, luks: 1.6 });
    });
  });

  describe('lValue', () => {
    it('should return the correct quality level value for standart tier', () => {
      const levels = { standart: 1.0, orta: 1.2, luks: 1.4 };
      expect(lValue('standart', levels)).toBe(1.0);
    });

    it('should return the correct quality level value for orta tier', () => {
      const levels = { standart: 1.0, orta: 1.2, luks: 1.4 };
      expect(lValue('orta', levels)).toBe(1.2);
    });

    it('should return the correct quality level value for luks tier', () => {
      const levels = { standart: 1.0, orta: 1.2, luks: 1.4 };
      expect(lValue('luks', levels)).toBe(1.4);
    });
  });
});
