import type { WizardFormData } from '@/components/listing-wizard/types'

/**
 * Sihirbaz formundan POST /api/listings govdesini kurar.
 *
 * Ayri bir SAF fonksiyon olmasinin sebebi: bu govde bir kez `lat`/`lng`
 * tasimadan gonderildi ve ana ilan verme akisindan cikan her ilan koordinatsiz
 * kaydedildi. Adim 1 pin birakmayi zorunlu tutuyordu, sunucu tarafi da
 * koordinati bekliyordu; kacan tek yer ikisinin arasindaki bu govdeydi ve
 * hicbir test istemci-sunucu dikisine bakmiyordu. Artik bakiyor.
 *
 * Sunucunun yok saydigi alanlari (parcel, parcelStatus) bilerek gondermiyoruz:
 * parsel/risk snapshot'i YALNIZCA sunucuda uretilir.
 */
export function buildListingPublishBody(form: WizardFormData) {
    return {
        lat: form.lat,
        lng: form.lng,
        city: form.city,
        district: form.district || null,
        address: form.address || null,
        title: form.title,
        landSizeSqm: form.landSizeSqm ? Number(form.landSizeSqm) : null,
        price: form.price ? Number(form.price) : null,
        zoning: form.zoning || null,
        type: form.type,
        titleDeed: form.titleDeed || null,
        description: form.description || null,
        phone: form.phone || null,
        photos: form.photos.map(p => p.url),
        reportId: form.reportId || null,
    }
}
