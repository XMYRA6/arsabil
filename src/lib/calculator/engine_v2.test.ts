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

    it('Scenario 9: Negatif Ad guard\'sizdi, artik 0a kelepceleniyor (denetim bulgusu C7)', () => {
        // UI zaten negatif alan girisine izin vermiyor ama motor tek basina
        // (orn. gelecekte API'ye acilirsa) korumasizdi — negatif Mi_base/
        // FD_total sessizce uretiyordu. Ad=0 ile ayni davranisa kelepcelendi.
        const negatif = CalculatorEngineV2.calculate({ ...baseInput, Ad: -50 });
        const sifir = CalculatorEngineV2.calculate({ ...baseInput, Ad: 0 });
        expect(negatif.Mi_base).toBe(sifir.Mi_base);
        expect(negatif.Mi_base).toBe(0);
        expect(negatif.FD_total).toBeGreaterThanOrEqual(0);
    });

    it('Scenario 10: Negatif P (birim maliyet) ve negatif K (kâr) 0a kelepceleniyor (denetim bulgusu C7-ikiz)', () => {
        // UI zaten negatif deger girisine izin vermiyor (formatTRThousands
        // eksi kabul etmiyor, kar katsayisi sabit pozitif tier listesinden
        // geliyor) ama motor tek basina (orn. gelecekte API'ye acilirsa)
        // korumasizdi — Ad icin C7'de eklenen guard P/K'ye hic tasinmamisti.
        const negatifP = CalculatorEngineV2.calculate({ ...baseInput, P: -10000 });
        const sifirP = CalculatorEngineV2.calculate({ ...baseInput, P: 0 });
        expect(negatifP.Mi_base).toBe(sifirP.Mi_base);
        expect(negatifP.Mi_base).toBe(0);

        const negatifK = CalculatorEngineV2.calculate({ ...baseInput, K: -1.25 });
        const sifirK = CalculatorEngineV2.calculate({ ...baseInput, K: 0 });
        expect(negatifK.FD_total).toBe(sifirK.FD_total);
        expect(negatifK.FD_total).toBe(0);
    });

    describe('x_max — maksimum sürdürülebilir arsa payı (denetim bulgusu C6)', () => {
        // x_max: muteahhidin K hedefini koruyarak verebilecegi maksimum arsa
        // payi. Tanim: x_max'ta FD_total TAM OLARAK Pmarket'e esit olmali —
        // yani "1 - Mi*K/Pmarket" formulu, x=x_max ile calculate() tekrar
        // cagrildiginda FD_total===Pmarket vermeli (iceriden tutarlilik testi).

        it('Pmarket verilmezse x_max null doner (opsiyonel girdi)', () => {
            const result = CalculatorEngineV2.calculate(baseInput);
            expect(result.x_max).toBeNull();
        });

        it('Pmarket <= 0 ise x_max null doner', () => {
            expect(CalculatorEngineV2.calculate({ ...baseInput, Pmarket: 0 }).x_max).toBeNull();
            expect(CalculatorEngineV2.calculate({ ...baseInput, Pmarket: -100 }).x_max).toBeNull();
        });

        it('x_max = 1 - (Mi*K)/Pmarket formulunu uygular', () => {
            // Mi_base = 1*10000*100 = 1,000,000 (risk/iksa kapali, Mi=Mi_base)
            // x_max = 1 - (1,000,000 * 1.25) / 1,562,500 = 1 - 0.8 = 0.20
            const result = CalculatorEngineV2.calculate({ ...baseInput, Pmarket: 1562500 });
            expect(result.x_max).toBeCloseTo(0.20, 6);
        });

        it('ICERIDEN TUTARLILIK: x=x_max ile tekrar hesaplaninca FD_total tam olarak Pmarket e esitlenir', () => {
            const Pmarket = 3_500_000;
            const withMarket = CalculatorEngineV2.calculate({ ...baseInput, Pmarket });
            expect(withMarket.x_max).not.toBeNull();

            const atMax = CalculatorEngineV2.calculate({ ...baseInput, x: withMarket.x_max as number });
            expect(atMax.FD_total).toBeCloseTo(Pmarket, 4);
        });

        it('x_max negatif cikabilir (maliyet zaten piyasa fiyatini asiyorsa) — bu durum sinirlanmiyor, oldugu gibi donuyor', () => {
            // Mi*K = 1,000,000*1.25 = 1,250,000 > Pmarket=1,000,000 -> x_max negatif
            const result = CalculatorEngineV2.calculate({ ...baseInput, Pmarket: 1_000_000 });
            expect(result.x_max).toBeLessThan(0);
        });

        it('risk ve iksa acikken de Mi (post-risk/iksa) kullanilir, Mi_base DEGIL', () => {
            const input = { ...baseInput, isRiskEnabled: true as const, R: 1.10, Pmarket: 2_000_000 };
            const result = CalculatorEngineV2.calculate(input);
            // Mi = 1,000,000 * 1.10 = 1,100,000
            const expectedXMax = 1 - (1100000 * 1.25) / 2000000;
            expect(result.x_max).toBeCloseTo(expectedXMax, 6);
        });
    });
});
