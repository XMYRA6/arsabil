/**
 * Risk seviyesinin KAYNAGI. `unitPriceSource.ts`teki `BirimMaliyetKaynagi`
 * deseninin risk seviyesine genislemesi (bkz. 2026-08-04 spec) — o degerin
 * de TKGM'den mi geldigini yoksa elle mi girildigini gostermenin hicbir
 * yolu yoktu, ayni "sessiz ezilme" riski risk seviyesinde de vardi.
 */
export type RiskKaynagi =
    | { tur: 'varsayilan' }
    | { tur: 'tkgm' }
    | { tur: 'elle' }

/** SmartContextCard'da risk pillerinin yanında gösterilen kaynak metni. */
export function riskKaynakEtiketi(kaynak: RiskKaynagi): string {
    switch (kaynak.tur) {
        case 'tkgm':
            return 'TKGM Onaylı'
        case 'elle':
            return 'Elle girildi'
        case 'varsayilan':
            return 'Varsayılan'
        default: {
            const _tuketilmedi: never = kaynak
            return _tuketilmedi
        }
    }
}
