/**
 * ArsaBil Motor - v2 (Deterministik Model)
 * Sadece saf fonksiyonlardan oluşan, UI'dan bağımsız hesaplama makinesi.
 * 
 * SPEC.md kurallarına göre çalışmaktadır.
 */

export interface CalculationInput {
    // Zorunlu (Her zaman gerekenler)
    x: number;        // Arsa payı oranı (0-1)
    L: number;        // Kalite sınıf katsayısı
    Ad: number;       // Daire brüt alanı (m²)
    P: number;        // Birim inşaat fiyatı (TL/m²)
    K: number;        // Müteahhit kâr katsayısı

    // Opsiyonel (Toggle ile açılanlar)
    Sd?: number;      // Toplam daire sayısı
    Aa?: number;      // Arsa alanı (m²)
    
    // Risk Toggle
    isRiskEnabled: boolean;
    R?: number;       // Risk katsayısı (Örn: 1.05)

    // İksa Toggle
    isExcavationEnabled: boolean;
    excavationMode?: "percentage" | "manual"; // İksa modu: Yüzde veya Elle
    Z?: number;       // İksa yüzde oranı (0-1 arası, Örn: %5 -> 0.05)
    MzOriginal?: number; // Elle girilen iksa tutarı (TL)

    // Piyasa Fiyatı (opsiyonel) — verilirse x_max hesaplanır.
    Pmarket?: number;
}

export interface CalculationOutput {
    Mi_base: number;  // Ham inşaat maliyeti
    Mz: number;       // İksa tutarı
    Z: number;        // İksa oranı
    Mi: number;       // Toplam inşaat maliyeti (Risk ve iksa dahil)
    
    Ma: number;       // Arsa Maliyeti (TBD)
    M: number;        // Genel Toplam Maliyet

    FD_total: number; // Daire Satış Fiyatı (TL)
    FD_per_m2: number;// Daire Satış m² Birim Fiyatı (TL/m²)

    Sdx: number | null; // Arsasahibine düşen daire sayısı
    FA: number | null;  // Toplam arsa değeri (TL)
    FAbirim: number | null; // Arsa m² birim değeri (TL/m²)

    /** Müteahhidin K (kâr) hedefini koruyarak verebileceği maksimum arsa
     * payı oranı (0-1). `Pmarket` verilmemiş/pozitif değilse `null`.
     * Sınırlanmaz — maliyet zaten piyasa fiyatını aşıyorsa negatif çıkabilir,
     * bu da "bu fiyata bu payla proje yapılamaz" anlamına gelir, motor bunu
     * gizlemez (denetim bulgusu C6). */
    x_max: number | null;
}

/**
 * TBD: Arsa Maliyeti (Ma) hesaplama modülleri.
 * İleride Kullanıcının seçeceği modele göre stratejiler değiştirilebilir.
 */
function computeLandCostAndTotal(Mi: number, x: number): { M: number, Ma: number } {
    // Klasik Model: M = Mi / (1 - x),  Ma = M - Mi
    // Eğer x >= 1 ise (Hatalı giriş), sıfıra bölme hatasını önle
    const safeX = Math.min(Math.max(x, 0), 0.999);
    const M = Mi / (1 - safeX);
    const Ma = M - Mi;
    return { M, Ma };
}

export const CalculatorEngineV2 = {
    calculate(input: CalculationInput): CalculationOutput {
        const { x, L, Ad, P, K, Sd, Aa, isRiskEnabled, R, isExcavationEnabled, excavationMode, Z, MzOriginal, Pmarket } = input;

        // A) İnşaat Maliyeti
        // 1. Ham — negatif Ad hicbir cagri yolunda anlamli degil (UI zaten
        // engelliyor, motor kendi basina da guardlar — denetim bulgusu C7).
        // Ad=0 ile AYNI davranisa kelepcelenir, ayri bir hata dali acilmaz.
        const safeAd = Math.max(Ad, 0);
        const Mi_base = L * P * safeAd;

        // 2. İksa
        let finalMz = 0;
        let finalZ = 0;

        if (isExcavationEnabled) {
            if (excavationMode === "percentage") {
                finalZ = Z || 0;
                finalMz = finalZ * Mi_base;
            } else if (excavationMode === "manual") {
                finalMz = MzOriginal || 0;
                finalZ = Mi_base > 0 ? (finalMz / Mi_base) : 0;
            }
        }

        // 3. Risk
        const finalR = isRiskEnabled && R !== undefined ? R : 1;

        // 4. Toplam İnşaat
        const Mi = (Mi_base + finalMz) * finalR;

        // B) Toplam Maliyet ve Daire Fiyatı
        const { M, Ma } = computeLandCostAndTotal(Mi, x);
        
        const FD_total = M * K;
        const FD_per_m2 = safeAd > 0 ? (FD_total / safeAd) : 0;

        // C) Arsa Sahibine Düşen Paylar
        let Sdx: number | null = null;
        let FA: number | null = null;
        let FAbirim: number | null = null;

        // Sd switch kapalıysa Sd null ya da undefined gelecektir
        if (typeof Sd === 'number' && Sd > 0) {
            Sdx = Sd * x;
            FA = Sdx * FD_total;
            
            // Sadece Sd açıkken ve Aa da açıksa FAbirim hesaplanır
            if (typeof Aa === 'number' && Aa > 0) {
                FAbirim = FA / Aa;
            }
        }

        // D) Maksimum Sürdürülebilir Arsa Payı (yalnızca Pmarket verilmişse)
        const x_max = typeof Pmarket === 'number' && Pmarket > 0
            ? 1 - (Mi * K) / Pmarket
            : null;

        return {
            Mi_base,
            Mz: finalMz,
            Z: finalZ,
            Mi,
            Ma,
            M,
            FD_total,
            FD_per_m2,
            Sdx,
            FA,
            FAbirim,
            x_max
        };
    }
}
