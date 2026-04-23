import { CalculatorEngineV2, CalculationInput } from './engine_v2';

describe('CalculatorEngineV2 (Deterministic Rules)', () => {

    const baseInput: CalculationInput = {
        x: 0.33,
        L: 1.0,
        Ad: 100,
        P: 10000,
        K: 1.25,
        isRiskEnabled: false,
        isExcavationEnabled: false
    };

    it('Scenario 1: Temel Hesaplama (Opsiyonlar Kapalı)', () => {
        const result = CalculatorEngineV2.calculate(baseInput);

        // Mi_base = 1 * 10000 * 100 = 1,000,000
        expect(result.Mi_base).toBe(1000000);
        expect(result.Mz).toBe(0);
        expect(result.Z).toBe(0);
        expect(result.Mi).toBe(1000000); // Risk kapalı

        // M = 1,000,000 / (1 - 0.33) = ~1,492,537
        expect(result.M).toBeCloseTo(1000000 / 0.67, 0);

        // Sd ve Aa kapalı, o yüzden Sdx ve FAbirim null olmalı
        expect(result.Sdx).toBeNull();
        expect(result.FA).toBeNull();
        expect(result.FAbirim).toBeNull();
    });

    it('Scenario 2: İksa Açık (Yüzde Modu 5%)', () => {
        const input = { ...baseInput, isExcavationEnabled: true, excavationMode: "percentage" as const, Z: 0.05 };
        const result = CalculatorEngineV2.calculate(input);

        // Mi_base = 1,000,000
        // Mz = 50,000
        expect(result.Mz).toBe(50000);
        expect(result.Mi).toBe(1050000);
    });

    it('Scenario 3: İksa Açık (Elle Nakit Girilmiş 100.000 TL)', () => {
        const input = { ...baseInput, isExcavationEnabled: true, excavationMode: "manual" as const, MzOriginal: 100000 };
        const result = CalculatorEngineV2.calculate(input);

        // Z oranı geri hesaplanır = 100K / 1M = 0.10 (%10)
        expect(result.Z).toBeCloseTo(0.10, 2);
        expect(result.Mz).toBe(100000);
        expect(result.Mi).toBe(1100000);
    });

    it('Scenario 4: Risk Katsayısı Açık (R = 1.10)', () => {
        const input = { ...baseInput, isRiskEnabled: true, R: 1.10 };
        const result = CalculatorEngineV2.calculate(input);

        // Mi_base = 1,000,000
        // Mi = 1,000,000 * 1.10 = 1,100,000
        expect(result.Mi).toBe(1100000);
    });

    it('Scenario 5: Sd (Toplam Daire) Kapalıyken Sonuçlar', () => {
        const input = { ...baseInput, Sd: undefined }; // Veya 0
        const result = CalculatorEngineV2.calculate(input);

        expect(result.Sdx).toBeNull();
        expect(result.FA).toBeNull();
    });

    it('Scenario 6: Sd Açık Ama Aa Kapalı', () => {
        const input = { ...baseInput, Sd: 20 };
        const result = CalculatorEngineV2.calculate(input);

        // x = 0.33, Sd = 20 => Sdx = 6.6
        expect(result.Sdx).toBeCloseTo(6.6, 1);
        expect(result.FA).toBeGreaterThan(0);
        expect(result.FAbirim).toBeNull(); // Arsa alanı verilmedi
    });

    it('Scenario 7: Full Opt-in (Tüm Togglelar Açık)', () => {
        const input = {
            x: 0.40,
            L: 1.2,
            P: 15000,
            Ad: 120,
            K: 1.3,
            Sd: 30, // 30 Daire
            Aa: 2000, // 2000 m2 arsa
            isRiskEnabled: true,
            R: 1.05,
            isExcavationEnabled: true,
            excavationMode: "percentage" as const,
            Z: 0.02 // %2 iksa
        };
        const result = CalculatorEngineV2.calculate(input);

        // Mi_base = 1.2 * 15000 * 120 = 2,160,000
        expect(result.Mi_base).toBe(2160000);
        // Mz = 2160000 * 0.02 = 43,200
        expect(result.Mz).toBe(43200);
        // Mi (Risk Dahil) = (2160000 + 43200) * 1.05 = 2,313,360
        expect(result.Mi).toBe(2313360);
        // M = 2,313,360 / (1 - 0.40) = 3,855,600
        expect(result.M).toBeCloseTo(3855600, 0);

        // FD_total = 3,855,600 * 1.3 = 5,012,280
        expect(result.FD_total).toBeCloseTo(5012280, 0);

        // FD_per_m2 = 5012280 / 120 = 41769
        expect(result.FD_per_m2).toBeCloseTo(41769, 0);

        // Sdx = 30 * 0.40 = 12
        expect(result.Sdx).toBe(12);

        // FA = 12 * 5012280 = 60,147,360
        expect(result.FA).toBeCloseTo(60147360, 0);

        // FAbirim = 60147360 / 2000 = 30073.68
        expect(result.FAbirim).toBeCloseTo(30073.68, 1);
    });

    it('Scenario 8: Edge-Case Ad=0 (Sıfıra Bölme Güvenliği)', () => {
        const input = { ...baseInput, Ad: 0 };
        const result = CalculatorEngineV2.calculate(input);

        expect(result.Mi_base).toBe(0);
        // Daire metrekare fiyatı sıfıra bölünmemeli, 0 dönmeli
        expect(result.FD_per_m2).toBe(0);
    });
});
