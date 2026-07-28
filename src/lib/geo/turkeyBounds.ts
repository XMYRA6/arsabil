/**
 * Türkiye kaba sınırlayıcı kutusu.
 *
 * Tek kaynak olmasının sebebi güvenliktir: bu kontrol yalnızca "anlamsız
 * koordinat göndermeyelim" nezaketi değil, dış servislere (TKGM, TUCBS)
 * giden trafiğin sınırıdır. Daha önce yalnızca iki lookup route'unda ayrı
 * ayrı tanımlıydı; snapshot üreticileri ise hiç kontrol etmiyordu, yani ilan
 * kaydetme yolundan dünyanın herhangi bir koordinatı devlet servislerine
 * gönderilebiliyordu.
 */
export const TR_BOUNDS = { minLat: 35, maxLat: 43, minLng: 25, maxLng: 45 } as const

export function isWithinTurkey(lat: number, lng: number): boolean {
    return (
        Number.isFinite(lat) && Number.isFinite(lng) &&
        lat >= TR_BOUNDS.minLat && lat <= TR_BOUNDS.maxLat &&
        lng >= TR_BOUNDS.minLng && lng <= TR_BOUNDS.maxLng
    )
}
