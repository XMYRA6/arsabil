import type { Tur } from '@/lib/dioramas/scene';

/** İlan türü + imar durumundan diorama sahnesi (fotoğraf yokken gösterilir; ListingCard ile aynı eşleme). */
export function sahneSec(type?: string | null, zoning?: string | null): { tur: Tur; varyant: string } {
    if (type === 'KAT_KARSILIGI') return { tur: 'kat', varyant: 'bitmis' };
    if (type === 'ORTAKLIK') return { tur: 'ticari', varyant: 'ofis' };
    switch (zoning) {
        case 'TARIM': return { tur: 'tarla', varyant: 'bugday' };
        case 'TICARI': return { tur: 'ticari', varyant: 'ofis' };
        case 'KONUT': return { tur: 'villa', varyant: 'modern' };
        default: return { tur: 'arsa', varyant: 'agacsiz' };
    }
}
