// Akif-5 — WhatsApp-özel araç: ada/parsel sorgusu.
// resolveLocation.ts (TKGM fuzzy il/ilçe/mahalle) + buildDegerCard (gerçek
// motor) sarar — uydurma sayı YOK. Yalnız WhatsApp tool gateway'inden
// çağrılır (bkz. src/lib/whatsapp/akifToolGateway.ts); paylaşılan
// toolRegistry.ts'e HİÇ eklenmez.

import { resolveLocation, type ResolveLocationDeps } from '@/lib/whatsapp/resolveLocation'
import type { DegerCardResult } from '@/lib/deger/card'
import type { ParcelCard } from '../contract'

export interface LookupParcelArgs {
  ilText: string
  ilceText: string
  mahalleText: string
  ada: string
  parsel: string
}

export interface LookupParcelDeps {
  resolveDeps: ResolveLocationDeps
  buildCard: (mahalleId: number, ada: string, parsel: string) => Promise<DegerCardResult>
  siteUrlFor: (f: {
    il: string
    ilce: string
    mahalle: string
    mahalleId: number
    ada: string
    parsel: string
  }) => string
}

export async function lookupParcel(
  args: LookupParcelArgs,
  deps: LookupParcelDeps,
): Promise<ParcelCard> {
  const r = await resolveLocation(
    { ilText: args.ilText, ilceText: args.ilceText, mahalleText: args.mahalleText },
    deps.resolveDeps,
  )
  if (r.kind === 'ambiguous') {
    return {
      kind: 'parcel',
      status: 'ambiguous',
      level: r.level,
      candidates: r.candidates.map((c) => c.text),
    }
  }
  if (r.kind === 'notfound') {
    return { kind: 'parcel', status: 'location_not_found', level: r.level, term: r.term }
  }
  const res = await deps.buildCard(r.mahalleId, args.ada, args.parsel)
  if (!res.ok) {
    return { kind: 'parcel', status: res.reason }
  }
  return {
    kind: 'parcel',
    status: 'resolved',
    dto: {
      ...res.card,
      parcel: { ...res.card.parcel, geometry: { type: 'Polygon', coordinates: [] } },
      neighborhood: { ...res.card.neighborhood, geojson: null },
    },
    siteUrl: deps.siteUrlFor({
      il: r.il,
      ilce: r.ilce,
      mahalle: r.mahalle,
      mahalleId: r.mahalleId,
      ada: args.ada,
      parsel: args.parsel,
    }),
  }
}
