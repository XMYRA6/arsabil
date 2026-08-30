import * as cheerio from 'cheerio'
import type { PortalAdapter, ListingStub } from './types'

const BASE = 'https://www.emlakjet.com'

const CATEGORY_PATH: Record<'arsa' | 'konut', string> = {
  arsa: 'satilik-arsa',
  konut: 'satilik-konut',
}

/** Detay HTML'inde ilan id'si: /ilan/<slug>-<rakamlar> */
const ILAN_LINK_RE = /\/ilan\/[a-z0-9-]+?-(\d{5,})(?:[/?#]|$)/i

type JsonLdNode = Record<string, unknown>

/** Tüm ld+json bloklarını düz bir düğüm listesine çevirir (@graph / dizi / tek obje). */
function collectJsonLd(html: string): JsonLdNode[] {
  const $ = cheerio.load(html)
  const nodes: JsonLdNode[] = []
  const push = (val: unknown): void => {
    if (Array.isArray(val)) {
      val.forEach(push)
      return
    }
    if (val && typeof val === 'object') {
      const obj = val as JsonLdNode
      if (Array.isArray(obj['@graph'])) push(obj['@graph'])
      nodes.push(obj)
    }
  }
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim()
    if (!raw) return
    try {
      push(JSON.parse(raw))
    } catch {
      /* bozuk blok — atla */
    }
  })
  return nodes
}

function findByType(nodes: JsonLdNode[], type: string): JsonLdNode | undefined {
  return nodes.find((n) => {
    const t = n['@type']
    return Array.isArray(t) ? t.includes(type) : t === type
  })
}

/** additionalProperty / itemListElement gibi {name,value} dizilerinden değer okur. */
function propValue(list: unknown, name: string): string | undefined {
  if (!Array.isArray(list)) return undefined
  for (const item of list) {
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>
      if (o.name === name && o.value != null && String(o.value).trim()) {
        return String(o.value).trim()
      }
    }
  }
  return undefined
}

/**
 * Alan bilgisi JSON-LD'de yok (floorSize.value = 0). DOM'daki hızlı-bilgi
 * kutusundan çekilir: "<sayı> m²</p><p ...>Metrekare|Brüt</p>".
 */
function extractArea(html: string): string | undefined {
  const re = /([\d.,]+)\s*m²\s*<\/p>\s*<p[^>]*>\s*(Brüt|Metrekare)\s*<\/p>/gi
  const m = re.exec(html)
  if (m) return `${m[1].trim()} m²`
  return undefined
}

function first<T>(...vals: (T | undefined | null | '')[]): T | undefined {
  for (const v of vals) if (v != null && v !== '') return v as T
  return undefined
}

/**
 * Emlakjet detay sayfası, mahalle sınır poligonunu + deprem risk skorunu
 * kaçışlı JSON olarak bir JS blob'unun içinde taşıyor:
 *   \"earthquakeRiskScore\":0.198, ... \"neighborhoodGeometry\":{\"type\":\"multipolygon\",\"coordinates\":[[[[lng,lat],...]]]}
 * Hassas ilan koordinatı YOK — yalnızca mahalle geometrisi.
 * Geometri objesinin içinde {} yok (sadece diziler) → \{[^{}]*\} güvenli.
 */
export function extractNeighborhood(
  html: string,
): { geojson: unknown; riskScore: number | null } | null {
  const geoMatch = html.match(/\\+"neighborhoodGeometry\\+"\s*:\s*(\{[^{}]*\})/)
  if (!geoMatch) return null
  let geojson: unknown
  try {
    // herhangi bir kaçış seviyesini düz JSON'a indir: \\\" / \" → "
    const jsonText = geoMatch[1].replace(/\\+"/g, '"')
    const parsed = JSON.parse(jsonText) as { type?: string; coordinates?: unknown }
    if (!parsed || typeof parsed !== 'object' || !parsed.coordinates) return null
    // "multipolygon" → "MultiPolygon" (GeoJSON standardı); koordinat sırası dokunma
    const type =
      String(parsed.type ?? '').toLowerCase() === 'multipolygon' ? 'MultiPolygon' : 'Polygon'
    geojson = { type, coordinates: parsed.coordinates }
  } catch {
    return null
  }
  const riskMatch = html.match(/\\+"earthquakeRiskScore\\+"\s*:\s*([0-9]+(?:\.[0-9]+)?)/)
  const riskNum = riskMatch ? Number(riskMatch[1]) : null
  return { geojson, riskScore: riskNum != null && Number.isFinite(riskNum) ? riskNum : null }
}

export const emlakjetAdapter: PortalAdapter = {
  source: 'emlakjet',
  searchResultHint: 'emlakjet.com/ilan/',
  detailHint: 'RealEstateListing',

  searchUrls(il, category, maxPages) {
    const slug = il.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, '-')
    const pathPart = CATEGORY_PATH[category]
    const urls: string[] = []
    for (let p = 1; p <= maxPages; p++) {
      const q = p > 1 ? `?sayfa=${p}` : ''
      urls.push(`${BASE}/${pathPart}/${slug}${q}`)
    }
    return urls
  },

  parseSearchPage(html) {
    const $ = cheerio.load(html)
    const seen = new Map<string, ListingStub>()
    $('a[href]').each((_, a) => {
      const href = $(a).attr('href') ?? ''
      const m = href.match(ILAN_LINK_RE)
      if (!m) return
      const id = m[1]
      if (seen.has(id)) return
      const detailUrl = href.startsWith('http') ? href : `${BASE}${href}`
      seen.set(id, { sourceListingId: id, detailUrl })
    })
    return [...seen.values()]
  },

  parseDetailPage(html, url) {
    const nodes = collectJsonLd(html)
    const product = findByType(nodes, 'Product')
    const listing = findByType(nodes, 'RealEstateListing')
    const breadcrumb = findByType(nodes, 'BreadcrumbList')

    const idFromUrl = url.match(/-(\d{5,})(?:[/?#]|$)/)?.[1] ?? ''

    const identifier = (listing?.identifier ?? {}) as Record<string, unknown>
    const sourceListingId = String(
      first(
        identifier.value != null ? String(identifier.value) : undefined,
        idFromUrl,
      ) ?? '',
    )

    const offers = (product?.offers ?? {}) as Record<string, unknown>
    const rawPrice = offers.price != null ? String(offers.price) : undefined

    const itemOffered = (listing?.itemOffered ?? {}) as Record<string, unknown>
    const addProps = itemOffered.additionalProperty

    const address = (listing?.address ?? {}) as Record<string, unknown>
    const crumbs = Array.isArray(breadcrumb?.itemListElement)
      ? (breadcrumb!.itemListElement as Array<Record<string, unknown>>)
      : []
    const crumbName = (pos: number): string | undefined => {
      const c = crumbs.find((x) => x.position === pos)
      return c && c.name != null ? String(c.name).trim() : undefined
    }

    const rawIl = first(
      address.addressRegion != null ? String(address.addressRegion).trim() : undefined,
    )
    const rawIlce = first(
      address.addressLocality != null ? String(address.addressLocality).trim() : undefined,
    )
    // mahalle: PostalAddress.streetAddress; yoksa breadcrumb 5. seviye "<İlçe> <Mahalle> Satılık ..."
    let rawMahalle = first(
      address.streetAddress != null ? String(address.streetAddress).trim() : undefined,
    )
    if (!rawMahalle) {
      const lvl5 = crumbName(5)
      if (lvl5 && rawIlce) {
        // M3: rawIlce regex'e gömülüyor — metakarakterleri escape et
        const ilceRe = rawIlce.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const stripped = lvl5.replace(new RegExp(`^${ilceRe}\\s+`, 'i'), '')
        const mah = stripped.match(/^(.*?Mahallesi)/)?.[1]
        if (mah) rawMahalle = mah.trim()
      }
    }

    const rawType = first(
      propValue(addProps, 'Kategori'),
      crumbName(2),
    )

    const images = Array.isArray(product?.image)
      ? (product!.image as unknown[]).map(String).filter(Boolean)
      : []

    const nb = extractNeighborhood(html)

    return {
      source: 'emlakjet',
      sourceListingId,
      sourceUrl: url,
      rawTitle: product?.name != null ? String(product.name) : undefined,
      rawDescription: product?.description != null ? String(product.description) : undefined,
      rawPrice,
      rawArea: extractArea(html),
      rawType,
      rawImarStatus: propValue(addProps, 'İmar Durumu'),
      rawIl,
      rawIlce,
      rawMahalle,
      rawAdaNo: first(propValue(addProps, 'Ada'), propValue(addProps, 'Ada No')),
      rawParselNo: first(propValue(addProps, 'Parsel'), propValue(addProps, 'Parsel No')),
      rawListedAt: first(
        listing?.datePosted != null ? String(listing.datePosted) : undefined,
        listing?.dateModified != null ? String(listing.dateModified) : undefined,
      ),
      photoUrls: images,
      ...(nb
        ? {
            neighborhoodGeojson: nb.geojson,
            ...(nb.riskScore != null ? { neighborhoodRiskScore: nb.riskScore } : {}),
          }
        : {}),
      extra: {
        source: 'json_ld',
        product: product ?? null,
        realEstateListing: listing ?? null,
        breadcrumb: breadcrumb ?? null,
      },
    }
  },
}

export default emlakjetAdapter
