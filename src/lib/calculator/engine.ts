/**
 * ArsaBil MVP - Core Calculation Engine
 * 
 * Eşitlikler (Kullanıcı Dokümantasyonundan):
 * 1. Arsa maliyeti biliniyorsa: M = M_ars / x
 * 2. İnşaat maliyeti biliniyorsa: M = M_ins / (1 - x)
 * 3. Daire fiyatı: P = (M * k) / N
 * 
 * Semboller:
 * x: Arsa payı oranı (0-1 arası)
 * M: Toplam Maliyet
 * M_ars: Arsa Maliyeti
 * M_ins: İnşaat Maliyeti
 * k: Kâr çarpanı 
 * N: Toplam Daire Sayısı
 * P: Minimum Daire Fiyatı (Piyasa)
 */

export interface CalculationParams {
    luxLevelModifier: number; // Standart: 1.0, Orta: 1.2, Lüks: 1.4
    apartmentSizeSqm: number; // Daire Metrekaresi
    totalApartments: number; // N
    landShareRatio: number; // x (0.10 to 0.50 arası)
    targetProfitMargin: number; // k (Örn: 1.25 -> %25 kâr)
    riskMargin: number; // % olarak
    excavationPercent: number; // İksa maliyeti (Admin panelinden gelen %0.01 veya %0.02)
}

export interface CalculationResult {
    totalCost: number; // M
    constructionCost: number; // M_ins
    landCost: number; // M_ars
    minApartmentPrice: number; // P
    pricePerSqm: number;
    apartmentsForLandOwner: number; // N * x
}

// 2024 Güncel Ortalama İnşaat m2 Birim Maliyetleri (Örnek)
const BASE_CONSTRUCTION_COST_SQM = 15000;

export class CalculatorEngine {

    /**
     * Merkez Fonksiyon: Kullanıcı girdileri ile tüm sistemi günceller.
     */
    static calculateAll(params: CalculationParams): CalculationResult {
        const {
            luxLevelModifier,
            apartmentSizeSqm,
            totalApartments,
            landShareRatio,
            targetProfitMargin,
            excavationPercent
        } = params;

        // 1. Toplam İnşaat Alanını Bul (Brüt) - %20 ortak alan payı eklendi
        const totalConstructionSqm = (apartmentSizeSqm * totalApartments) * 1.2;

        // 2. İnşaat Maliyetini Bul (M_ins) + İksa Maliyeti
        // İksa Maliyeti = İnşaat Maliyeti * excavationPercent
        const baseConstructionCost = totalConstructionSqm * (BASE_CONSTRUCTION_COST_SQM * luxLevelModifier);
        const excavationCost = baseConstructionCost * excavationPercent;
        const constructionCost = baseConstructionCost + excavationCost;

        // 3. Formül 2'yi kullanarak Toplam Maliyeti (M) Bul: M = M_ins / (1 - x)
        // x = 1 olduğunda division by zero hatasını önlemek için güvenli limit
        const safeLandShare = Math.min(landShareRatio, 0.99);
        const totalCost = constructionCost / (1 - safeLandShare);

        // 4. Arsa Maliyetini Bul (M_ars) = M - M_ins  (Ayrıca M_ars = M * x)
        const landCost = totalCost - constructionCost;

        // 5. Formül 3'ü kullanarak Minimum Daire Fiyatını Bul (P) = (M * k) / N
        const minApartmentPrice = (totalCost * targetProfitMargin) / totalApartments;

        // 6. Arsa sahibine düşen daire sayısı
        const apartmentsForLandOwner = Math.round(totalApartments * safeLandShare);

        return {
            totalCost,
            constructionCost,
            landCost,
            minApartmentPrice,
            pricePerSqm: minApartmentPrice / apartmentSizeSqm,
            apartmentsForLandOwner
        };
    }

    /**
     * Arsa sahibine düşecek daire sayısından --> arsa payı yüzdesini bulur
     */
    static getLandShareFromApartmentCount(ownerApartments: number, totalApartments: number): number {
        if (totalApartments === 0) return 0;
        return ownerApartments / totalApartments;
    }
}
