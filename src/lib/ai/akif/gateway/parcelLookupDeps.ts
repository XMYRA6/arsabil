// WhatsApp webhook'taki ada/parsel wiring'inin paylaşılan kopyası
// (src/app/api/whatsapp/webhook/route.ts). memberView çağıran tarafından verilir.

import { buildDegerCard } from '@/lib/deger/card'
import { createAnonCardDeps } from '@/lib/deger/anonCardDeps'
import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from '@/lib/tkgm/idariYapi'
import type { LookupParcelDeps } from './lookupParcel'

export function createParcelLookupDeps(opts: { memberView: boolean }): LookupParcelDeps {
  const cardDeps = {
    ...createAnonCardDeps(),
    findAreaTrend: async () => [],
    findDistrictDemographics: async () => null,
  }
  return {
    resolveDeps: { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi },
    buildCard: (mahalleId, ada, parsel) =>
      buildDegerCard({ kind: 'adaParsel', mahalleId, ada, parsel }, cardDeps, { memberView: opts.memberView }),
    siteUrlFor: (f) =>
      `https://www.arsabil.com/deger?mahalleId=${f.mahalleId}&ada=${encodeURIComponent(f.ada)}&parsel=${encodeURIComponent(f.parsel)}`,
  }
}
