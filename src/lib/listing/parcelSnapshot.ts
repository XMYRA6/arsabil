import { Prisma } from '@prisma/client'
import { fetchParcelByPoint } from '@/lib/tkgm/parcel'
import type { GeoJSONPolygon } from '@/lib/tkgm/parcel'

export type ParcelSnapshot = {
    neighborhood: string | null
    adaNo: string | null
    parselNo: string | null
    parcelAreaSqm: number | null
    parcelQuality: string | null
    /**
     * Prisma'nın `Json?` alanına yazılabilir olması gerekiyor. Boş durum için
     * düz `null` DEĞİL `Prisma.DbNull` kullanılır — Prisma'da `null` literali
     * nullable Json alanında geçerli bir girdi değildir.
     */
    parcelGeometry: GeoJSONPolygon | typeof Prisma.DbNull
    parcelVerifiedAt: Date | null
    parcelLookupStatus: string | null
}

const EMPTY: ParcelSnapshot = {
    neighborhood: null, adaNo: null, parselNo: null,
    parcelAreaSqm: null, parcelQuality: null, parcelGeometry: Prisma.DbNull,
    parcelVerifiedAt: null, parcelLookupStatus: null,
}

/**
 * Parsel snapshot'ını YALNIZCA sunucu üretir. İstemcinin gövdede gönderdiği
 * parsel alanları asla kullanılmaz — aksi halde "TKGM ile doğrulandı" rozeti
 * taklit edilebilir hale gelir.
 */
export async function buildParcelSnapshot(
    lat: number | null,
    lng: number | null,
): Promise<ParcelSnapshot> {
    if (lat == null || lng == null) return { ...EMPTY }

    const result = await fetchParcelByPoint(lat, lng)
    if (!result.ok) {
        return { ...EMPTY, parcelLookupStatus: result.reason }
    }

    const p = result.parcel
    return {
        neighborhood: p.mahalle,
        adaNo: p.adaNo,
        parselNo: p.parselNo,
        parcelAreaSqm: p.areaSqm,
        parcelQuality: p.quality,
        parcelGeometry: p.geometry,
        parcelVerifiedAt: new Date(),
        parcelLookupStatus: 'verified',
    }
}
